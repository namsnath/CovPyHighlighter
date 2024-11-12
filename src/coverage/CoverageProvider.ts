import { readFile } from 'fs';
import { promisify } from 'util';
import { FileSystemWatcher, Uri, workspace } from 'vscode';
import ConfigProvider from '../config/ConfigProvider';
import { CoverageStats, ICoverageCache, ICoverageStatsJson } from '../models';
import Logger from '../util/Logger';
import CoverageCache from './CoverageCache';
import FileCache from './FileCache';

const readFileAsync = promisify(readFile);

interface ICoverageProvider {
    coverageCache: CoverageCache;
    fileCache: FileCache;
    config: ConfigProvider;
}

export default class CoverageProvider {
    private coverageCache: CoverageCache;
    private fileCache: FileCache;
    private config: ConfigProvider;

    public fileUris: Uri[];
    private fileDataJson: any;
    private coverageData: ICoverageCache;
    private fileWatchers: FileSystemWatcher[];

    constructor({ coverageCache, fileCache, config }: ICoverageProvider) {
        this.config = config;
        this.coverageCache = coverageCache;
        this.fileCache = fileCache;

        this.fileUris = [];
        this.fileDataJson = {};
        this.coverageData = {};
        this.fileWatchers = [];
    }

    public async init() {
        Logger.log('[Initialising] CoverageProvider');
        await this.refresh(true);
    }

    public async refresh(refetchFileUris = false) {
        Logger.log('[Updating] CoverageProvider');

        if (refetchFileUris) {
            this.fileUris = await this.getCoverageFileUris();
        }

        this.fileDataJson = await this.getCoverageFileData();
        this.coverageData = this.processJsonCoverage();
        this.updateCache();

        if (refetchFileUris) {
            this.setupFileWatchers();
        }
    }

    private async getCoverageFileUris(): Promise<Uri[]> {
        const files: Uri[] = [];
        const { coverageFilePath, coverageFileName } = this.config;

        if (coverageFilePath) {
            const filePathUri = Uri.file(coverageFilePath);
            const covFilePathUri = Uri.joinPath(filePathUri, coverageFileName);

            Logger.log(`[CoverageFile][FromConfig] ${covFilePathUri.fsPath}`);
            files.push(covFilePathUri);
        }

        const glob = `**/${coverageFileName}`;
        const globFiles = await workspace.findFiles(glob);
        Logger.log(`[CoverageFile][FromGlob] ${globFiles}`);
        files.push(...globFiles);

        return Array.from(new Set(files));
    }

    private async getCoverageFileData(): Promise<any> {
        const promises = Promise.all(
            this.fileUris.map((file, i) => {
                Logger.log(`[CoverageFile][Reading] (${i + 1}/${this.fileUris.length}) ${file.fsPath}`);
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

    private processJsonCoverage(): ICoverageCache {
        const covData: ICoverageCache = {};

        if (this.fileDataJson && this.fileDataJson.files) {
            // Look for the 'files' key in coverage JSON, and iterate through each file
            Object.keys(this.fileDataJson.files).forEach((file: string) => {
                // Create CoverageStats for each file and assign to covData
                const data: ICoverageStatsJson = this.fileDataJson.files[file];
                const stats = new CoverageStats(file, data);

                covData[stats.replacedPath] = stats;

                if (this.config.replacePath) {
                    const replacedStats = new CoverageStats(
                        file, data,
                        this.config.replacePath,
                        this.config.replacePathWith,
                    );
                    covData[replacedStats.replacedPath] = replacedStats;
                }
            });
        }

        return covData;
    }

    private updateCache() {
        Logger.log('[Updating][CoverageCache]');

        if (this.coverageData && Object.keys(this.coverageData).length > 0) {
            this.coverageCache.setCoverageCache(this.coverageData);
            this.fileCache.clear();
            return;
        }

        Logger.log('No data found, could not update cache');
    }

    private setupFileWatchers() {
        Logger.log(`[FileWatchers][Disposing] ${this.fileWatchers.length}`);
        this.fileWatchers.map((watcher) => watcher.dispose());
        this.fileWatchers = [];

        Logger.log(`[FileWatchers][Creating] ${this.fileUris.length}`);
        this.fileWatchers = this.fileUris.map((file) => {
            const watcher = workspace.createFileSystemWatcher(
                file.fsPath,
                false, false, false,
            );

            watcher.onDidChange(() => this.refresh());
            watcher.onDidCreate(() => this.refresh(true));
            watcher.onDidDelete(() => this.refresh(true));

            return watcher;
        });
    }
}
