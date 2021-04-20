import ConfigProvider from './config/ConfigProvider';
import Configs from './config/Configs';
import CoverageCache from './coverage/CoverageCache';
import CoverageProvider from './coverage/CoverageProvider';
import CoverageStatusBarItem from './statusBar/CoverageStatusBarItem';
import FileCache from './coverage/FileCache';
import FileHighlight from './highlight/FileHighlight';
import Logger from './util/Logger';

// context: vscode.ExtensionContext
export async function activate() {
    Logger.log(`[Activating] ${Configs.extensionName}`);
    const config = ConfigProvider.getInstance();
    const statusBarItem = CoverageStatusBarItem.getInstance();

    const coverageCache = new CoverageCache();
    const fileCache = new FileCache();

    const coverageProvider = new CoverageProvider({
        coverageCache,
        fileCache,
        config,
    });
    await coverageProvider.init();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fileHighlight = new FileHighlight({
        coverageCache,
        fileCache,
        config,
        statusBarItem,
    });

    // TODO: Add command to force cache update
    // TODO: Add dispose calls to everything
    // TODO: Convert Logger and ConfigProvider to normal classes
}

export function deactivate() {}
