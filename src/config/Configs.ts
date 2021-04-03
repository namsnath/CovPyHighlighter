export default class Configs {
    // Base
    public static extensionName = 'CovPyHighlighter';

    // ConfigPaths
    public static root = 'covpyhighlighter';
    public static colorsRoot = `${Configs.root}.colors`;

    // Root config
    public static coverageFileName = {
        path: 'coverageFileName',
        default: 'coverage.json',
    };
    public static coverageFilePath = {
        path: 'coverageFilePath',
        default: '',
    };
    public static replacePath = {
        path: 'replacePath',
        default: '',
    };
    public static replacePathWith = {
        path: 'replacePathWith',
        default: '',
    };

    // Colors nesting
    public static excludedColor = {
        path: 'excludedColor',
        default: 'rgba(255, 255, 0, 0.15)',
    };
    public static executedColor = {
        path: 'executedColor',
        default: 'rgba(0, 255, 0, 0.15)',
    };
    public static missingColor = {
        path: 'missingColor',
        default: 'rgba(255, 0, 0, 0.15)',
    };
}
