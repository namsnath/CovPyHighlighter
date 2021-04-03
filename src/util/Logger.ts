import { window } from 'vscode';
import Configs from '../config/Configs';

export default class Logger {
    private static outputChannel = window.createOutputChannel(Configs.extensionName);

    public static log(data: string) {
        this.outputChannel.appendLine(data);
    }
}
