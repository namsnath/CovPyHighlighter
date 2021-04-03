import {
    window,
    workspace,
    TextEditorDecorationType,
    WorkspaceConfiguration,
} from 'vscode';
import Configs from './Configs';
import Logger from '../util/Logger';

// Create a TextEditor decoration from given bgColor
function createDecor(bgColor: string) {
    return window.createTextEditorDecorationType(
        { backgroundColor: bgColor },
    );
}

// Get the config from a given path or use default
function getConfig <Type>(
    root: WorkspaceConfiguration,
    path: string,
    defaultVal: Type,
): Type {
    return root.get(path) || defaultVal;
}

// Essentially a Singleton
export default class ConfigProvider {
    private static instance: ConfigProvider;

    public coverageFileName!: string;
    public coverageFilePath!: string;
    public replacePath!: string;
    public replacePathWith!: string;

    // TextEditorDecorations
    public excludedDecor!: TextEditorDecorationType;
    public executedDecor!: TextEditorDecorationType;
    public missingDecor!: TextEditorDecorationType;

    constructor() {
        Logger.log('[Initialising] ConfigProvider');
        this.setupConfigs();
        // Bind the setup method to re-run and update cached configs
        workspace.onDidChangeConfiguration(this.setupConfigs.bind(this));
    }

    public static getInstance(): ConfigProvider {
        if (!ConfigProvider.instance) {
            ConfigProvider.instance = new ConfigProvider();
        }

        return ConfigProvider.instance;
    }

    private setupConfigs() {
        Logger.log('[Updating] ConfigProvider');

        // WorkspaceConfiguration(s)
        const rootConfig = workspace.getConfiguration(Configs.root);
        const colorsConfig = workspace.getConfiguration(Configs.colorsRoot);

        // Updating class memebers
        this.coverageFileName = getConfig<string>(
            rootConfig,
            Configs.coverageFileName.path,
            Configs.coverageFileName.default,
        );

        this.coverageFilePath = getConfig<string>(
            rootConfig,
            Configs.coverageFilePath.path,
            Configs.coverageFilePath.default,
        );

        this.replacePath = getConfig<string>(
            rootConfig,
            Configs.replacePath.path,
            Configs.replacePath.default,
        );

        this.replacePathWith = getConfig<string>(
            rootConfig,
            Configs.replacePathWith.path,
            Configs.replacePathWith.default,
        );

        // Colors
        const excludedColor = getConfig<string>(
            colorsConfig,
            Configs.excludedColor.path,
            Configs.excludedColor.default,
        );

        const executedColor = getConfig<string>(
            colorsConfig,
            Configs.executedColor.path,
            Configs.executedColor.default,
        );

        const missingColor = getConfig<string>(
            colorsConfig,
            Configs.missingColor.path,
            Configs.missingColor.default,
        );

        this.excludedDecor = createDecor(excludedColor);
        this.executedDecor = createDecor(executedColor);
        this.missingDecor = createDecor(missingColor);
    }
}
