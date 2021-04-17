import { Range } from 'vscode';

/* eslint-disable @typescript-eslint/naming-convention */
export interface ICoverageStatsJson {
    executed_lines: number[];
    missing_lines: number[];
    excluded_lines: number[];
    summary: {
        covered_lines: number;
        num_statements: number;
        percent_covered: number;
        missing_lines: number;
        excluded_lines: number;
        // If branch is enabled
        num_branches?: number;
        num_partial_branches?: number;
        covered_branches?: number;
        missing_branches?: number;
    };
}
/* eslint-enable @typescript-eslint/naming-convention */

export interface ICoverageCache {
    [key: string]: CoverageStats;
}

export interface IFileDecorationRange {
    excludedRanges: Range[];
    executedRanges: Range[];
    missingRanges: Range[];
}

export interface IFileDecorationCache {
    [key: string]: IFileDecorationRange;
}

export class CoverageStats {
    public path: string;
    public replacedPath: string;
    public excludedLines: number[];
    public executedLines: number[];
    public missingLines: number[];
    public summary: {
        coveredLines: number;
        excludedLines: number;
        missingLines: number;
        numStatements: number;
        percentCovered: number;
        // If branch is enabled
        numBranches: number;
        numPartialBranches: number;
        coveredBranches: number;
        missingBranches: number;
    };

    constructor(
        path: string,
        stats: ICoverageStatsJson,
        pathToReplace: string = '',
        replacePathWith: string = '',
    ) {
        this.path = path;

        if (pathToReplace && replacePathWith) {
            this.replacedPath = path.replace(pathToReplace, replacePathWith);
        } else {
            this.replacedPath = path;
        }
        this.excludedLines = stats.excluded_lines;
        this.executedLines = stats.executed_lines;
        this.missingLines = stats.missing_lines;
        this.summary = {
            coveredLines: stats.summary.covered_lines,
            excludedLines: stats.summary.excluded_lines,
            missingLines: stats.summary.missing_lines,
            numStatements: stats.summary.num_statements,
            percentCovered: stats.summary.percent_covered,
            // If branch is enabled
            numBranches: stats.summary?.num_branches ?? 0,
            numPartialBranches: stats.summary?.num_partial_branches ?? 0,
            coveredBranches: stats.summary?.covered_branches ?? 0,
            missingBranches: stats.summary?.missing_branches ?? 0,
        };
    }
}
