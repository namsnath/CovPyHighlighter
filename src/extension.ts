import * as fs from 'fs';
import { promisify } from 'util';
import * as os from 'os';
import * as vscode from 'vscode';
import { ICoverageCache, CoverageStats, ICoverageStatsJson } from './models';
import { ConfigProvider } from './util/config';

// Promisified Functions
const readFileAsync = promisify(fs.readFile);

// Caches/Dynamic
let config: ConfigProvider;
let OUTPUT_CHANNEL: vscode.OutputChannel | undefined;
let STATUS_BAR_ITEM: vscode.StatusBarItem | undefined;
let COV_CACHE: ICoverageCache = {};
// let FILE_CACHE: ICoverageCache = {};
let PLATFORM: NodeJS.Platform = os.platform();

// Functions
const createOutputChannel = () => {
	console.log('[Creating] OutputChannel');
	OUTPUT_CHANNEL = vscode.window.createOutputChannel(config.extensionName);
};

const createStatusBarItem = () => {
	console.log('[Creating] StatusBarItem');
	STATUS_BAR_ITEM = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
};

// TODO: Add command to statusBarItem
const updateStatusBarItem = (
	{loading = true, stats}: 
	{loading?: boolean, stats?: CoverageStats | null}
) => {
	if (!STATUS_BAR_ITEM) {
		return;
	}

	const staticIcon = "$(globe)";
	const spinningIcon = "$(globe~spin)";

	if (loading) {
		STATUS_BAR_ITEM.text = `${spinningIcon}`;
		STATUS_BAR_ITEM.show();
		return;
	}

	if (stats) {
		const percent = stats.summary.percentCovered.toFixed(2);
		const covered = stats.summary.coveredLines;
		const missing = stats.summary.missingLines;

		STATUS_BAR_ITEM.text = `${staticIcon} ${percent}% : ✓ ${covered} ✗ ${missing}`;
		STATUS_BAR_ITEM.show();
		return;
	}

	STATUS_BAR_ITEM.text = `${staticIcon} Coverage`;
	STATUS_BAR_ITEM.show();
};

const getCoverageFileFromConfigPath = async (): Promise<any> => {
	if (config.coverageFilePath) {
		const filePathUri = vscode.Uri.file(config.coverageFilePath);
		const filePathCovUri = vscode.Uri.joinPath(filePathUri, config.coverageFileName);
		console.info(`[CoverageFile][Found] ${filePathCovUri.fsPath}`);

		try {
			console.info(`[CoverageFile][Parsing] ${filePathCovUri.fsPath}`);
			const content = await readFileAsync(filePathCovUri.fsPath);
			const jsonData = JSON.parse(content.toString());

			console.info(`[CoverageFile][Parsed] ${filePathCovUri.fsPath}`);
			return jsonData;
		} catch (err) {
			console.warn(`[CoverageFile][NotExist] ${filePathCovUri.fsPath}`);
			return;
		}
	}
};

const getCoverageFileFromGlob = async (): Promise<any> => {
	const glob = `**/${config.coverageFileName}`;
	let mergedCovData: ICoverageCache = {};

	console.log(`[Searching][CoverageFileGlob] ${glob}`);
	const matchingFiles = await vscode.workspace.findFiles(glob);
	console.log(`[CoverageFile][Found] ${matchingFiles}`);

	matchingFiles.forEach((file) => {
		console.log(`[CoverageFile][Parsing] ${file.fsPath}`);
		const content = fs.readFileSync(file.fsPath);
		const jsonData = JSON.parse(content.toString());
		console.log(`[CoverageFile][Parsed] ${file.fsPath}`);

		mergedCovData = Object.assign(
			mergedCovData, 
			jsonData
		);
	});

	return mergedCovData;
};

const processJsonCoverage = (json: any) => {
	const covData: ICoverageCache = {};

	if (json && json.files) {
		Object.keys(json.files).map((file: string) => {
			const data: ICoverageStatsJson = json.files[file];
			const stats = new CoverageStats(file, data);

			covData[stats.replacedPath] = stats;

			if (config.replacePath) {
				const replacedStats = new CoverageStats(file, data, config.replacePath, config.replacePathWith);
				covData[replacedStats.replacedPath] = replacedStats;
			}
		});
	}

	return covData;
};

const updateCache = async () => {
	console.log('[Updating][CoverageCache]');
	
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

	console.warn('No data found, could not update cache');
};

const updateFileHighlight = (editor: vscode.TextEditor) => {
	console.log(`[Updating][FileHighlight] ${editor.document.fileName}`);
	updateStatusBarItem({loading: true});

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

			if (fileInPath || (PLATFORM === 'win32' && fileInPathLower)) {
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
		editor.setDecorations(config.excludedDecor, cov.excluded);

		for (let i = 0; i < covStats.missingLines.length; i++) {
			const lineNumber = covStats.missingLines[i] - 1;
			const lineRange = editor.document.lineAt(lineNumber).range;
			cov.missing.push(lineRange);
		}
		editor.setDecorations(config.missingDecor, cov.missing);

		for (let i = 0; i < covStats.executedLines.length; i++) {
			const lineNumber = covStats.executedLines[i] - 1;
			const lineRange = editor.document.lineAt(lineNumber).range;
			cov.executed.push(lineRange);
		}
		editor.setDecorations(config.executedDecor, cov.executed);

		updateStatusBarItem({loading: false, stats: covStats});
	} else {
		updateStatusBarItem({loading: false});
	}
};

// context: vscode.ExtensionContext
export async function activate() {
	// Configs
	config = new ConfigProvider();
	console.log(`[Activating] ${config.extensionName}`);

	// createOutputChannel();
	createStatusBarItem();
	updateStatusBarItem({loading: true});

	// Ensure that the cache is updated atleast once
	await updateCache();

	if (vscode.window.activeTextEditor) {
		updateFileHighlight(vscode.window.activeTextEditor);
	}

	// Setup a file watcher to watch our coverage file(s)
	// TODO: get URI from glob/config and setup watchers
	// const covFileWatcher = vscode.workspace.createFileSystemWatcher(
	// 	getCoverageFileGlob(),
	// 	false, false, false,
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
