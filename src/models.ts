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
	};
}
/* eslint-enable @typescript-eslint/naming-convention */

export interface ICoverageCache {
	[key: string]: CoverageStats;
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
	};

	constructor(
		path: string, 
        stats: ICoverageStatsJson, 
		pathToReplace: string = "",
		replacePathWith: string = ""
	) {
		this.path = path;
		this.replacedPath = (pathToReplace && replacePathWith) ? path.replace(pathToReplace, replacePathWith) : path;
		this.excludedLines = stats.excluded_lines;
		this.executedLines = stats.executed_lines;
		this.missingLines = stats.missing_lines;
		this.summary = {
			coveredLines: stats.summary.covered_lines,
			excludedLines: stats.summary.excluded_lines,
			missingLines: stats.summary.missing_lines,
			numStatements: stats.summary.num_statements,
			percentCovered: stats.summary.percent_covered,
		};
	}
}