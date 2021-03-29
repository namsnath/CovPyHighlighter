import { readFileSync } from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import { ICoverageCache, CoverageStats, ICoverageStatsJson } from './models';

// Constants
const EXT_NAME = 'CovPyHighlighter';
const DEFAULT_COVERAGE_FILE = 'coverage.json';

enum Config {
	coverageFileName = 'covpyhighlighter.coverageFileName',
	coverageFilePath = 'covpyhighlighter.coverageFilePath',
	replacePath = 'covpyhighlighter.replacePath',
	replacePathWith = 'covpyhighlighter.replacePathWith',
};

let EXECUTED_DECOR: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType(
	{ backgroundColor: 'rgba(0, 255, 0, 0.2)'}
);

let EXCLUDED_DECOR: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType(
	{ backgroundColor: 'rgba(255, 255, 0, 0.2)'}
);

let MISSING_DECOR: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType(
	{ backgroundColor: 'rgba(255, 0, 0, 0.2)'}
);

// Caches/Dynamic
let OUTPUT_CHANNEL: vscode.OutputChannel | undefined;
let STATUS_BAR_ITEM: vscode.StatusBarItem | undefined;
let COV_CACHE: ICoverageCache = {};
// let FILE_CACHE: ICoverageCache = {};
let PLATFORM: NodeJS.Platform = os.platform();

// Functions
const createOutputChannel = () => {
	OUTPUT_CHANNEL = vscode.window.createOutputChannel(EXT_NAME);
};

const createStatusBarItem = () => {
	console.log('Creating StatusBarItem');
	STATUS_BAR_ITEM = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
};

const getFromConfig = (config: Config) => {
	const vscodeConfig = vscode.workspace.getConfiguration();
	return vscodeConfig.get(config);
};

const getCoverageFileGlob = () : vscode.GlobPattern => {
	const vscodeConfig = vscode.workspace.getConfiguration();
	const fileName: string = vscodeConfig.get(Config.coverageFileName) ?? DEFAULT_COVERAGE_FILE;
	const filePath: string | undefined = vscodeConfig.get(Config.coverageFilePath);

	if (filePath) {
		const filePathUri = vscode.Uri.file(filePath);
		const filePathCovUri = vscode.Uri.joinPath(filePathUri, fileName);
		console.log(`config fsPath: ${filePathCovUri.fsPath}`);
		return filePathCovUri.fsPath;
	}

	console.log('No custom filepath defined');
	return `**/${fileName}`;
};

const processJsonCoverage = (json: any) => {
	const vscodeConfig = vscode.workspace.getConfiguration();
	const replacePath: string = vscodeConfig.get(Config.replacePath) ?? "";
	const replacePathWith: string = vscodeConfig.get(Config.replacePathWith) ?? "";
	const covData: ICoverageCache = {};

	if (json.files) {
		Object.keys(json.files).map((file: string) => {
			const data: ICoverageStatsJson = json.files[file];
			const stats = new CoverageStats(file, data);

			covData[stats.replacedPath] = stats;

			if (replacePath) {
				const replacedStats = new CoverageStats(file, data, replacePath, replacePathWith);
				covData[replacedStats.replacedPath] = replacedStats;
			}
		});
	}

	return covData;
};

const parseCoverageFile = async (glob: vscode.GlobPattern) => {
	let mergedCovData: ICoverageCache = {};

	console.log(`Searching for coverage files with glob: ${glob}`);
	const matchingFiles = await vscode.workspace.findFiles(glob);
	console.log(`Found files: ${matchingFiles}`);

	matchingFiles.forEach((file) => {
		console.log(`Parsing File: ${file.fsPath}`);
		const content = readFileSync(file.fsPath);
		const jsonData = JSON.parse(content.toString());

		mergedCovData = Object.assign(
			mergedCovData, 
			processJsonCoverage(jsonData)
		);
	});

	return mergedCovData;
};

const updateCache = async (glob: vscode.GlobPattern) => {
	console.log('Updating Coverage Cache');
	COV_CACHE = await parseCoverageFile(glob);
};

const updateFileHighlight = (editor: vscode.TextEditor) => {
	console.log(`Updating: ${editor.document.fileName}`);
	const fullPath = editor.document.uri.fsPath;
	const fullPathLower = fullPath.toLowerCase();
	const path = editor.document.uri.path;
	const pathLower = path.toLowerCase();

	const cov = {
		excluded: <vscode.Range[]>[],
		executed: <vscode.Range[]>[],
		missing: <vscode.Range[]>[],
	};

	let covStats = COV_CACHE[fullPath] || COV_CACHE[path];

	if (!covStats) {
		const keys = Object.keys(COV_CACHE);
		for (let i in keys) {
			const file = keys[i];
			const fileLower = file.toLowerCase();
			
			const fileInPath = fullPath.includes(file) || path.includes(file);
			const fileInPathLower = fullPathLower.includes(fileLower) || pathLower.includes(fileLower);

			if (
				fileInPath || (PLATFORM === 'win32' && fileInPathLower)) {
				covStats = COV_CACHE[file];
				break;
			}
		}
	}

	if (covStats) {
		for (let i = 0; i < covStats.excludedLines.length; i++) {
			const lineNumber = covStats.excludedLines[i] - 1;
			const lineRange = editor.document.lineAt(lineNumber).range;
			cov.excluded.push(lineRange);
		}
		editor.setDecorations(EXCLUDED_DECOR, cov.excluded);

		for (let i = 0; i < covStats.missingLines.length; i++) {
			const lineNumber = covStats.missingLines[i] - 1;
			const lineRange = editor.document.lineAt(lineNumber).range;
			cov.missing.push(lineRange);
		}
		editor.setDecorations(MISSING_DECOR, cov.missing);

		for (let i = 0; i < covStats.executedLines.length; i++) {
			const lineNumber = covStats.executedLines[i] - 1;
			const lineRange = editor.document.lineAt(lineNumber).range;
			cov.executed.push(lineRange);
		}
		editor.setDecorations(EXECUTED_DECOR, cov.executed);

		if (STATUS_BAR_ITEM) {
			STATUS_BAR_ITEM.text = `${covStats.summary.percentCovered}% : ✓ ${covStats.summary.coveredLines} ✗ ${covStats.summary.missingLines}`;
			STATUS_BAR_ITEM.show();
		}
	}
};

// context: vscode.ExtensionContext
export async function activate() {
	// createOutputChannel();
	createStatusBarItem();
	console.log(`${EXT_NAME} activated`);

	// Ensure that the cache is updated atleast once
	await updateCache(getCoverageFileGlob());

	if (vscode.window.activeTextEditor) {
		updateFileHighlight(vscode.window.activeTextEditor);
	}

	// Setup a file watcher to watch our coverage file(s)
	const covFileWatcher = vscode.workspace.createFileSystemWatcher(
		getCoverageFileGlob(),
		false, false, false,
	);

	// Update cache on any change in the coverage file(s)
	covFileWatcher.onDidChange(async (uri) => await updateCache(uri.fsPath));
	covFileWatcher.onDidCreate(async (uri) => await updateCache(uri.fsPath));
	covFileWatcher.onDidDelete(async (uri) => await updateCache(uri.fsPath));

	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && !/extension-output-#\d/.test(editor.document.fileName)) {
			updateFileHighlight(editor);
		}
	});
}

export function deactivate() {}
