import { platform } from 'os';
import { Uri } from 'vscode';
import { CoverageStats, ICoverageCache } from '../models';

export default class CoverageCache {
    private cache: ICoverageCache;

    constructor() {
        this.cache = {};
    }

    public getCoverageCache() {
        return this.cache;
    }

    public getCoverage(uri: Uri): CoverageStats | undefined {
        const isWindows = platform() === 'win32';
        const { fsPath: fullPath, path } = uri;

        const fullPathLower = fullPath.toLowerCase();
        const pathLower = path.toLowerCase();

        if (this.cache[path]) {
            return this.cache[path];
        }

        if (this.cache[fullPath]) {
            return this.cache[fullPath];
        }

        if (isWindows && this.cache[pathLower]) {
            return this.cache[pathLower];
        }

        if (isWindows && this.cache[fullPathLower]) {
            return this.cache[fullPathLower];
        }

        // TODO: Add direct dict access for cache[path, fullPath, pathLower, fullPathLower]
        // Will improve efficiency, if not found, can do manual find
        const matchingFile = Object.keys(this.cache).find((file) => {
            // If file ends with the path
            // For cases when coverage.json does not have full paths
            if (path.endsWith(file) || fullPath.endsWith(file)) {
                return true;
            }

            if (isWindows) {
                // Process file names to remove ambiguity
                const fileLow = file.toLowerCase();
                if (pathLower.endsWith(fileLow) || fullPathLower.endsWith(fileLow)) {
                    return true;
                }
            }

            return false;
        });

        if (matchingFile) {
            return this.cache[matchingFile];
        }

        // If the path could not be found in cache
        return undefined;
    }

    public setCoverageCache(cache: ICoverageCache) {
        this.cache = cache;
    }

    // public setCoverage() {
    //     // For updating a single coverage object
    // }
}
