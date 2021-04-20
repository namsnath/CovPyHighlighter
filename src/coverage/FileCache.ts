import { Uri } from 'vscode';
import {
    ICoverageStatsSummary,
    IFileCache,
    IFileCacheData,
    IFileDecorationRange,
} from '../models';

export default class FileCache {
    private cache: IFileCache;

    constructor() {
        this.cache = {};
    }

    public clear() {
        this.cache = {};
    }

    public getCache(): IFileCache {
        return this.cache;
    }

    public setCache(cache: IFileCache) {
        this.cache = cache;
    }

    public setFileCache(
        uri: Uri, decorationRanges: IFileDecorationRange, statSummary: ICoverageStatsSummary,
    ) {
        this.cache[uri.fsPath] = { decorationRanges, statSummary };
    }

    public getFileCache(uri: Uri): IFileCacheData | undefined {
        return this.cache[uri.fsPath];
    }
}
