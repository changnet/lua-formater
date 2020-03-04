// 格式化选项

export class Setting {
    private indent = " "; // 缩进，空格或者tab键
    private indentWidth = 4; // 缩进宽度(N个字符)

    // 允许简短的语句格式化在同一行，如
    // table.sort(list, function(a,b) return a > b end)
    // 此选项对顶层的函数(没有缩进的)无效
    private allowShortStatOneLine = true;
}
