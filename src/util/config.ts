import {
    window,
    workspace, 
    TextEditorDecorationType,
} from 'vscode';

class ConfigDefaults {
    public static coverageFileName = 'coverage.json';
	public static coverageFilePath = '';
	public static replacePath = '';
	public static replacePathWith = '';

    public static excludedColor = 'rgba(255, 255, 0, 0.15)';
    public static executedColor = 'rgba(0, 255, 0, 0.15)';
    public static missingColor = 'rgba(255, 0, 0, 0.15)';
}

class ConfigPaths {
    // Root config
    public static root = 'covpyhighlighter';
	public static coverageFileName = 'coverageFileName';
	public static coverageFilePath = 'coverageFilePath';
	public static replacePath = 'replacePath';
	public static replacePathWith = 'replacePathWith';

    // Colors nesting
    public static colorsRoot = `${ConfigPaths.root}.colors`;
    public static excludedColor = 'excludedColor';
    public static executedColor = 'executedColor';
    public static missingColor = 'missingColor';
};

export class ConfigProvider {
    public extensionName = 'CovPyHighlighter';

    public coverageFileName!: string;
    public coverageFilePath!: string;
    public replacePath!: string;
    public replacePathWith!: string;

    // TextEditorDecorations
    public excludedDecor!: TextEditorDecorationType;
    public executedDecor!: TextEditorDecorationType;
    public missingDecor!: TextEditorDecorationType;

    constructor() {
        console.log('[Initialising] ConfigProvider');
        this.setupConfigs();

        // Bind the setup method to re-run and update cached configs
        workspace.onDidChangeConfiguration(this.setupConfigs.bind(this));
    }

    private setupConfigs() {
        console.log('[Updating][ConfigProvider]');
        const rootConfig = workspace.getConfiguration(ConfigPaths.root);

        this.coverageFileName = rootConfig.get(ConfigPaths.coverageFileName) as string || ConfigDefaults.coverageFileName;
        this.coverageFilePath = rootConfig.get(ConfigPaths.coverageFilePath) as string || ConfigDefaults.coverageFilePath;
        this.replacePath = rootConfig.get(ConfigPaths.replacePath) as string || ConfigDefaults.replacePath;
        this.replacePathWith = rootConfig.get(ConfigPaths.replacePathWith) as string || ConfigDefaults.replacePathWith;

        const colorsConfig = workspace.getConfiguration(ConfigPaths.colorsRoot);
        const excludedColor = colorsConfig.get(ConfigPaths.excludedColor) as string || ConfigDefaults.excludedColor;
        const executedColor = colorsConfig.get(ConfigPaths.executedColor) as string || ConfigDefaults.executedColor;
        const missingColor = colorsConfig.get(ConfigPaths.missingColor) as string || ConfigDefaults.missingColor;

        this.excludedDecor = window.createTextEditorDecorationType(
            { backgroundColor: excludedColor }
        );

        this.executedDecor = window.createTextEditorDecorationType(
            { backgroundColor: executedColor }
        );
        
        this.missingDecor = window.createTextEditorDecorationType(
            { backgroundColor: missingColor }
        );
    }
}