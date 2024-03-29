import { readFile } from 'fs';
import { promisify } from 'util';
import { platform } from 'os';
import {
    FileSystemWatcher,
    TextEditor,
    Uri,
    window,
    workspace,
} from 'vscode';
import {
    ICoverageCache,
    CoverageStats,
    ICoverageStatsJson,
    IFileDecorationRange,
    IFileDecorationCache,
} from './models';
import ConfigProvider from './config/ConfigProvider';
import Logger from './util/Logger';
import Configs from './config/Configs';
import CoverageStatusBarItem from './statusBar/CoverageStatusBarItem';

// Promisified Functions
const readFileAsync = promisify(readFile);

const config = ConfigProvider.getInstance();
const statusBarItem = CoverageStatusBarItem.getInstance();
const isWindows = platform() === 'win32';

// Caches/Dynamic
let fileWatchers: FileSystemWatcher[] = [];
let COV_CACHE: ICoverageCache = {};
let FILE_CACHE: IFileDecorationCache = {};

// Functions
async function getCoverageFileUris() : Promise<Uri[]> {
    const files: Uri[] = [];

    if (config.coverageFilePath) {
        const filePathUri = Uri.file(config.coverageFilePath);
        const covFilePathUri = Uri.joinPath(filePathUri, config.coverageFileName);

        Logger.log(`[CoverageFile][FromConfig] ${covFilePathUri.fsPath}`);
        files.push(covFilePathUri);
    }

    const glob = `**/${config.coverageFileName}`;
    const globFiles = await workspace.findFiles(glob);
    Logger.log(`[CoverageFile][FromGlob] ${globFiles}`);
    files.push(...globFiles);

    return Array.from(new Set(files));
}

async function getCoverageFileData(files: Uri[]): Promise<any> {
    const promises = Promise.all(
        files.map((file, i) => {
            Logger.log(`[CoverageFile][Reading] (${i + 1}/${files.length}) ${file.fsPath}`);
            return readFileAsync(file.fsPath);
        }),
    );

    const mergedCovData = (await promises)
        .reduce(
            (acc, content, i, arr) => {
                Logger.log(`[CoverageFile][Parsing] ${i + 1}/${arr.length}`);
                const jsonData = JSON.parse(content.toString());
                Logger.log(`[CoverageFile][Parsed] ${i + 1}/${arr.length}`);
                return Object.assign(acc, jsonData);
            },
            {},
        );

    return mergedCovData;
}

function processJsonCoverage(json: any) {
    const covData: ICoverageCache = {};

    if (json && json.files) {
        // Look for the 'files' key in coverage JSON, and iterate through each file
        Object.keys(json.files).forEach((file: string) => {
            // Create CoverageStats for each file and assign to covData
            const data: ICoverageStatsJson = json.files[file];
            const stats = new CoverageStats(file, data);

            covData[stats.replacedPath] = stats;
            covData[stats.replacedPath.toLowerCase()] = stats;

            if (config.replacePath) {
                const replacedStats = new CoverageStats(
                    file, data,
                    config.replacePath,
                    config.replacePathWith,
                );
                covData[replacedStats.replacedPath] = replacedStats;
                covData[replacedStats.replacedPath.toLowerCase()] = replacedStats;
            }
        });
    }

    return covData;
}

async function updateCache(files: Uri[]) {
    Logger.log('[Updating][CoverageCache]');

    const data = await getCoverageFileData(files);
    if (data && Object.keys(data).length > 0) {
        FILE_CACHE = {};
        COV_CACHE = processJsonCoverage(data);
        return;
    }

    Logger.log('No data found, could not update cache');
}

function updateDecorations(editor: TextEditor, coverage: IFileDecorationRange) {
    editor.setDecorations(config.excludedDecor, coverage.excludedRanges);
    editor.setDecorations(config.missingDecor, coverage.missingRanges);
    editor.setDecorations(config.executedDecor, coverage.executedRanges);
}

function updateFileHighlight(editor: TextEditor) {
    statusBarItem.update({ loading: true });

    const fullPath = editor.document.uri.fsPath;
    const fullPathLower = fullPath.toLowerCase();
    const { path } = editor.document.uri;
    const pathLower = path.toLowerCase();

    if (fullPath in FILE_CACHE) {
        Logger.log(`[Updating][FileHighlight][FoundInCache] ${fullPath}`);
        const cachedDecorations = FILE_CACHE[fullPath];
        const cachedCoverage = COV_CACHE[fullPath];

        updateDecorations(editor, cachedDecorations);
        statusBarItem.update({ loading: false, stats: cachedCoverage });
        return;
    }

    const decorations: IFileDecorationRange = {
        excludedRanges: [],
        executedRanges: [],
        missingRanges: [],
    };

    const matchingFile = Object.keys(COV_CACHE).find((file) => {
        // If current file matches the path
        if (file === path || file === fullPath) {
            return true;
        }

        // If file is a substring of the path
        // For cases when coverage.json does not have full paths
        if (path.includes(file) || fullPath.includes(file)) {
            return true;
        }

        if (isWindows) {
            // Process file names to remove ambiguity
            const fileLow = file.toLowerCase();
            if (pathLower.includes(fileLow) || fullPathLower.includes(fileLow)) {
                return true;
            }
        }

        return false;
    });

    let covStats;
    if (matchingFile) {
        covStats = COV_CACHE[matchingFile];
    }

    if (covStats) {
        Logger.log(`[Updating][FileHighlight] ${fullPath}`);
        decorations.excludedRanges = covStats.excludedLines.map(
            (lineNum) => editor.document.lineAt(lineNum - 1).range,
        );
        decorations.executedRanges = covStats.executedLines.map(
            (lineNum) => editor.document.lineAt(lineNum - 1).range,
        );
        decorations.missingRanges = covStats.missingLines.map(
            (lineNum) => editor.document.lineAt(lineNum - 1).range,
        );

        updateDecorations(editor, decorations);
        FILE_CACHE[fullPath] = decorations;
        statusBarItem.update({ loading: false, stats: covStats });
    } else {
        statusBarItem.update({ loading: false });
    }
}

function setupFileWatchers(files: Uri[]) {
    Logger.log(`[FileWatchers][Disposing] ${fileWatchers.length}`);
    fileWatchers.map((watcher) => watcher.dispose());
    fileWatchers = [];

    Logger.log(`[FileWatchers][Creating] ${files.length}`);
    fileWatchers = files.map((file) => {
        const watcher = workspace.createFileSystemWatcher(
            file.fsPath,
            false, false, false,
        );

        watcher.onDidChange(() => updateCache(files));
        watcher.onDidCreate(() => updateCache(files));
        watcher.onDidDelete(() => updateCache(files));

        return watcher;
    });
}

async function setupCacheAndWatchers() {
    const files = await getCoverageFileUris();
    await updateCache(files);
    setupFileWatchers(files);
}

// context: vscode.ExtensionContext
export async function activate() {
    Logger.log(`[Activating] ${Configs.extensionName}`);

    // Ensure that the cache is updated atleast once
    await setupCacheAndWatchers();

    if (window.activeTextEditor) {
        updateFileHighlight(window.activeTextEditor);
    }

    window.onDidChangeActiveTextEditor((editor) => {
        if (editor && !/extension-output-#\d/.test(editor.document.fileName)) {
            updateFileHighlight(editor);
        }
    });
}

export function deactivate() {}
