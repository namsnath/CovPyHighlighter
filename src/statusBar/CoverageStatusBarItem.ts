import {
    window,
    StatusBarAlignment,
    StatusBarItem,
} from 'vscode';
import { CoverageStats } from '../models';
import Logger from '../util/Logger';

export default class CoverageStatusBarItem {
    private static instance: CoverageStatusBarItem;
    private statusBarItem: StatusBarItem;

    // TODO: add configProvider in constructor if configs required
    constructor() {
        Logger.log('[Initialising] ConfigProvider');

        this.statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Left,
        );
        this.update({ loading: true });
    }

    public static getInstance(): CoverageStatusBarItem {
        if (!CoverageStatusBarItem.instance) {
            CoverageStatusBarItem.instance = new CoverageStatusBarItem();
        }

        return CoverageStatusBarItem.instance;
    }

    public update(
        { loading = true, stats }:
        { loading?: boolean, stats?: CoverageStats },
    ) {
        const staticIcon = '$(globe)';
        const spinningIcon = '$(globe~spin)';
        const coveredIcon = '$(pass)';
        const missingIcon = '$(stop)';
        const excludedIcon = '$(stop-circle)';
        // const branchIcon = '$(gist-fork)';

        if (loading) {
            this.statusBarItem.text = `${spinningIcon}`;
            this.statusBarItem.tooltip = '';
            this.statusBarItem.show();
            return;
        }

        if (stats) {
            const percent = stats.summary.percentCovered.toFixed(2);
            const covered = stats.summary.coveredLines;
            const missing = stats.summary.missingLines;
            const excluded = stats.summary.excludedLines;
            const textItems = [
                `${staticIcon} ${percent}%`,
                `${coveredIcon} ${covered}`,
                `${missingIcon} ${missing}`,
                `${excludedIcon} ${excluded}`,
            ];
            const tooltipLines = [
                `Coverage: ${percent}%`,
                `Covered: ${covered}`,
                `Missing: ${missing}`,
                `Excluded: ${excluded}`,
            ];

            this.statusBarItem.text = textItems.join(' ');
            this.statusBarItem.tooltip = tooltipLines.join('\n');
            this.statusBarItem.show();
            return;
        }

        this.statusBarItem.text = `${staticIcon} Coverage`;
        this.statusBarItem.tooltip = '';
        this.statusBarItem.show();
    }
}
