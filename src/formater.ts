// 格式化

import {
    Block,
    BlockType,
    CommentBlock,
    FunctionBlock,
    Parser,
} from "./parser";

import {
    SettingCtx
} from "./setting";

export class Formater {
    private formatedCtx = ""; // 格式化后的内容

    private setting: SettingCtx;

    public constructor(setting: SettingCtx) {
        this.setting = setting;
    }

    // 添加格式化后的内容
    private appendFormated(ctx: string) {
        // 写入缩进

        this.formatedCtx += ctx;
    }

    // 格式化注释
    private formatComment(block: CommentBlock) {
        let lastLine = -1;
        let setting = this.setting;

        for (const token of block.body) {
            if (lastLine === token.lineStart) {
                // 在同一行的注释 --[[123]] --[[456]]
                this.appendFormated(" ");
            }
            else if (-1 !== lastLine) {
                this.appendFormated(setting.lineBreak);
            }
            lastLine = token.line;
            this.appendFormated(token.comment!.raw);
        }
        this.appendFormated(setting.lineBreak);
        this.appendFormated(setting.lineBreak); // 相隔空行
    }

    // 格式化函数
    private formatFunction(block: FunctionBlock) {
        // 注释
        // local及函数名
        this.appendFormated("function ");

        // 函数名
        for (const token of block.name) {
            this.appendFormated(token.value);
        }

        // 参数
        let first = true;
        this.appendFormated("(");
        for (const param of block.parameters) {
            if (!first) {
                this.appendFormated(", ");
            }
            first = false;
            this.appendFormated(param.value);
            // TODO: 处理一下在参数中的注释
        }
        this.appendFormated(")");

        // 函数内容
        // end
        this.appendFormated(" ");
        this.appendFormated("end");
    }

    // 格式化代码
    private doFormat(blocks: Block[]) {
        for (const block of blocks) {
            switch (block.bType) {
                case BlockType.Comment:
                    this.formatComment(block);
                    break;
                case BlockType.Function:
                    this.formatFunction(block);
                    break;
            }
        }
    }

    public format(ctx: string) {
        let parser = new Parser();

        const blocks = parser.parse(ctx);
        this.doFormat(blocks);

        return this.formatedCtx;
    }
}