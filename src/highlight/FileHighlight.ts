import { TextEditor, window } from 'vscode';
import ConfigProvider from '../config/ConfigProvider';
import CoverageCache from '../coverage/CoverageCache';
import FileCache from '../coverage/FileCache';
import { IFileDecorationRange } from '../models';
import CoverageStatusBarItem from '../statusBar/CoverageStatusBarItem';
import Logger from '../util/Logger';

interface IFileHighlight {
    fileCache: FileCache;
    coverageCache: CoverageCache;
    config: ConfigProvider;
    statusBarItem: CoverageStatusBarItem;
}

export default class FileHighlight {
    private fileCache: FileCache;
    private coverageCache: CoverageCache;
    private config: ConfigProvider;
    private statusBarItem: CoverageStatusBarItem;

    constructor(
        {
            coverageCache, fileCache, config, statusBarItem,
        }: IFileHighlight,
    ) {
        this.coverageCache = coverageCache;
        this.fileCache = fileCache;
        this.config = config;
        this.statusBarItem = statusBarItem;

        if (window.activeTextEditor) {
            this.updateFileHighlight(window.activeTextEditor);
        }
        window.onDidChangeActiveTextEditor((e) => this.editorChangeCallback(e));
    }

    private editorChangeCallback(editor: TextEditor | undefined) {
        if (editor && !/extension-output-#\d/.test(editor.document.fileName)) {
            this.updateFileHighlight(editor);
        }
    }

    private updateDecorations(editor: TextEditor, decorationRanges: IFileDecorationRange) {
        editor.setDecorations(this.config.excludedDecor, decorationRanges.excludedRanges);
        editor.setDecorations(this.config.missingDecor, decorationRanges.missingRanges);
        editor.setDecorations(this.config.executedDecor, decorationRanges.executedRanges);
    }

    public updateFileHighlight(editor: TextEditor) {
        this.statusBarItem.update({ loading: true });

        const { uri, lineAt } = editor.document;
        const fullPath = uri.fsPath;
        const cachedFile = this.fileCache.getFileCache(uri);

        if (cachedFile) {
            Logger.log(`[Updating][FileHighlight][FoundInFileCache] ${fullPath}`);
            this.updateDecorations(editor, cachedFile.decorationRanges);
            this.statusBarItem.update({ loading: false, summary: cachedFile.statSummary });
            return;
        }

        const decorations: IFileDecorationRange = {
            excludedRanges: [],
            executedRanges: [],
            missingRanges: [],
        };

        const covStats = this.coverageCache.getCoverage(uri);

        if (covStats) {
            Logger.log(`[Updating][FileHighlight] ${fullPath}`);
            decorations.excludedRanges = covStats.excludedLines.map(
                (lineNum) => lineAt(lineNum - 1).range,
            );
            decorations.executedRanges = covStats.executedLines.map(
                (lineNum) => lineAt(lineNum - 1).range,
            );
            decorations.missingRanges = covStats.missingLines.map(
                (lineNum) => lineAt(lineNum - 1).range,
            );

            this.updateDecorations(editor, decorations);
            this.fileCache.setFileCache(uri, decorations, covStats.summary);
            this.statusBarItem.update({ loading: false, summary: covStats.summary });
        } else {
            Logger.log(`[Updating][FileHighlight][NotFound] ${fullPath}`);
            this.statusBarItem.update({ loading: false });
        }
    }
}
