import {
    window,
    StatusBarAlignment,
    StatusBarItem,
} from 'vscode';
import { ICoverageStatsSummary } from '../models';
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
        { loading = true, summary }:
        { loading?: boolean, summary?: ICoverageStatsSummary },
    ) {
        const staticIcon = '$(globe)';
        const spinningIcon = '$(globe~spin)';
        const coveredIcon = '$(pass)';
        const missingIcon = '$(stop)';
        const excludedIcon = '$(stop-circle)';
        const branchIcon = '$(gist-fork)';
        const partialbranchIcon = '$(alert)';
        const separator = '$(gripper)';

        if (loading) {
            this.statusBarItem.text = `${spinningIcon}`;
            this.statusBarItem.tooltip = '';
            this.statusBarItem.show();
            return;
        }

        if (summary) {
            const percent = summary.percentCovered.toFixed(2);
            const {
                coveredLines, missingLines, excludedLines,
                numBranches, coveredBranches, missingBranches,
                numPartialBranches: partialBranches,
            } = summary;

            const textItems = [
                `${staticIcon} ${percent}%`,
                `${coveredIcon} ${coveredLines}`,
                `${missingIcon} ${missingLines}`,
                `${excludedIcon} ${excludedLines}`,
                `${separator}`,
                `${branchIcon}`,
                `${coveredIcon} ${coveredBranches}`,
                `${missingIcon} ${missingBranches}`,
                `${partialbranchIcon} ${partialBranches}`,
            ];
            const tooltipLines = [
                `Coverage: ${percent}%`,
                `- Covered: ${coveredLines}`,
                `- Missing: ${missingLines}`,
                `- Excluded: ${excludedLines}`,
                '',
                `Branches: ${numBranches}`,
                `- Covered: ${coveredBranches}`,
                `- Missing: ${missingBranches}`,
                `- Partial: ${partialBranches}`,
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
