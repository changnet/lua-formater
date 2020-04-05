// 格式化选项

// 经过初始化的格式化选项
export interface SettingCtx {
    indent: " " | "\t";
    indentWidth: number;
    lineBreak: "\n" | "\r\n";
    maxEmptyLine: number;

    indentOffset: number;
}

export class Setting {
    private indent: " " | "\t" = " "; // 缩进，空格或者tab键
    private indentWidth = 4; // 缩进宽度(N个字符)

    // 允许简短的语句格式化在同一行，如
    // table.sort(list, function(a,b) return a > b end)
    // 此选项对顶层的函数(没有缩进的)无效
    private allowShortStatOneLine = true;

    private lineBreak: "\n" | "\r\n" = "\n"; // 换行 \r\n or \n

    // 保留的最大空行数量
    private maxEmptyLine: number = 1;

    private toCtx(): SettingCtx {
        return {
            indent: this.indent,
            indentWidth: this.indentWidth,
            lineBreak: this.lineBreak,
            indentOffset: 0,
            maxEmptyLine: this.maxEmptyLine,
        };
    }

    // 从配置内容解析配置选项，如果ctx为空，则相当于使用默认配置
    public parseSetting(ctx?: string): SettingCtx {
        return this.toCtx();
    }
}
