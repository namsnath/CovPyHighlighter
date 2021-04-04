import { readFile, readFileSync } from 'fs';
import { promisify } from 'util';
import { platform } from 'os';
import * as vscode from 'vscode';
import { ICoverageCache, CoverageStats, ICoverageStatsJson } from './models';
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
let COV_CACHE: ICoverageCache = {};
// let FILE_CACHE: ICoverageCache = {};

// Functions
const getCoverageFileFromConfigPath = async (): Promise<any> => {
    if (config.coverageFilePath) {
        const filePathUri = vscode.Uri.file(config.coverageFilePath);
        const filePathCovUri = vscode.Uri.joinPath(filePathUri, config.coverageFileName);
        Logger.log(`[CoverageFile][Found] ${filePathCovUri.fsPath}`);

        try {
            Logger.log(`[CoverageFile][Parsing] ${filePathCovUri.fsPath}`);
            const content = await readFileAsync(filePathCovUri.fsPath);
            const jsonData = JSON.parse(content.toString());

            Logger.log(`[CoverageFile][Parsed] ${filePathCovUri.fsPath}`);
            return jsonData;
        } catch (err) {
            Logger.log(`[CoverageFile][NotExist] ${filePathCovUri.fsPath}`);
        }
    }

    return {};
};

const getCoverageFileFromGlob = async (): Promise<any> => {
    const glob = `**/${config.coverageFileName}`;
    let mergedCovData: ICoverageCache = {};

    Logger.log(`[Searching][CoverageFileGlob] ${glob}`);
    const matchingFiles = await vscode.workspace.findFiles(glob);
    Logger.log(`[CoverageFile][Found] ${matchingFiles}`);

    // TODO: remove the readFileSync call, replace with Promise.all(map(async() {readFile()}))
    matchingFiles.forEach((file) => {
        Logger.log(`[CoverageFile][Parsing] ${file.fsPath}`);
        const content = readFileSync(file.fsPath);
        const jsonData = JSON.parse(content.toString());
        Logger.log(`[CoverageFile][Parsed] ${file.fsPath}`);

        mergedCovData = Object.assign(
            mergedCovData,
            jsonData,
        );
    });

    return mergedCovData;
};

const processJsonCoverage = (json: any) => {
    const covData: ICoverageCache = {};

    if (json && json.files) {
        Object.keys(json.files).forEach((file: string) => {
            const data: ICoverageStatsJson = json.files[file];
            const stats = new CoverageStats(file, data);

            covData[stats.replacedPath] = stats;

            if (config.replacePath) {
                const replacedStats = new CoverageStats(
                    file, data,
                    config.replacePath,
                    config.replacePathWith,
                );
                covData[replacedStats.replacedPath] = replacedStats;
            }
        });
    }

    return covData;
};

const updateCache = async () => {
    Logger.log('[Updating][CoverageCache]');

    const fileData = await getCoverageFileFromConfigPath();
    if (fileData) {
        COV_CACHE = await processJsonCoverage(fileData);
        return;
    }

    const globData = await getCoverageFileFromGlob();
    if (globData) {
        COV_CACHE = await processJsonCoverage(globData);
        return;
    }

    Logger.log('No data found, could not update cache');
};

const updateFileHighlight = (editor: vscode.TextEditor) => {
    Logger.log(`[Updating][FileHighlight] ${editor.document.fileName}`);
    statusBarItem.update({ loading: true });

    const fullPath = editor.document.uri.fsPath;
    const fullPathLower = fullPath.toLowerCase();
    const { path } = editor.document.uri;
    const pathLower = path.toLowerCase();

    const cov = {
        excluded: <vscode.Range[]>[],
        executed: <vscode.Range[]>[],
        missing: <vscode.Range[]>[],
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
        cov.excluded = covStats.excludedLines.map(
            (lineNum) => editor.document.lineAt(lineNum - 1).range,
        );
        cov.executed = covStats.executedLines.map(
            (lineNum) => editor.document.lineAt(lineNum - 1).range,
        );
        cov.missing = covStats.missingLines.map(
            (lineNum) => editor.document.lineAt(lineNum - 1).range,
        );

        editor.setDecorations(config.excludedDecor, cov.excluded);
        editor.setDecorations(config.missingDecor, cov.missing);
        editor.setDecorations(config.executedDecor, cov.executed);

        statusBarItem.update({ loading: false, stats: covStats });
    } else {
        statusBarItem.update({ loading: false });
    }
};

// context: vscode.ExtensionContext
export async function activate() {
    Logger.log(`[Activating] ${Configs.extensionName}`);

    // Ensure that the cache is updated atleast once
    await updateCache();

    if (vscode.window.activeTextEditor) {
        updateFileHighlight(vscode.window.activeTextEditor);
    }

    // Setup a file watcher to watch our coverage file(s)
    // TODO: get URI from glob/config and setup watchers
    // const covFileWatcher = vscode.workspace.createFileSystemWatcher(
    //  getCoverageFileGlob(),
    //  false, false, false,
    // );

    // Update cache on any change in the coverage file(s)
    // covFileWatcher.onDidChange(async (uri) => await updateCache(uri.fsPath));
    // covFileWatcher.onDidCreate(async (uri) => await updateCache(uri.fsPath));
    // covFileWatcher.onDidDelete(async (uri) => await updateCache(uri.fsPath));
    // TODO: get URI from glob/config and setup watchers
    // covFileWatcher.onDidChange(async (uri) => await updateCache());
    // covFileWatcher.onDidCreate(async (uri) => await updateCache());
    // covFileWatcher.onDidDelete(async (uri) => await updateCache());

    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && !/extension-output-#\d/.test(editor.document.fileName)) {
            updateFileHighlight(editor);
        }
    });
}

export function deactivate() {}
