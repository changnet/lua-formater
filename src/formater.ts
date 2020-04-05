// 格式化

import * as assert from 'assert';

import {
    Parser,
    CommentType
} from "./parser";

import {
    Chunk,

    Node,
    Token,
    Comment,
    Statement,
    Identifier,
    FunctionDeclaration,
    LocalStatement,
    MemberExpression,
    AssignmentStatement,
    Expression,
    IndexExpression,
    ReturnStatement,
    TableConstructorExpression,
    CallStatement,
    Base
} from 'luaparse';

import {
    SettingCtx
} from "./setting";

export class Formater {
    private formatedCtx = ""; // 格式化后的内容

    private setting: SettingCtx;
    private lastLine = 0;

    public constructor(setting: SettingCtx) {
        this.setting = setting;
    }

    // 添加格式化后的内容
    private appendFormated(ctx: string, line: number = -1) {
        // 写入缩进
        for (let index = 0; index < this.setting.indentOffset; index++) {
            this.formatedCtx += this.setting.indent;
        }

        this.formatedCtx += ctx;

        if (line >= 0) {
            this.lastLine = line;
        }
    }

    private breakLine() {
        this.formatedCtx += this.setting.lineBreak;
    }

    /**
     * 
     * @param node 
     * @param raw 
     */
    private formatAny(node: Node, raw: string) {
        let cmtNode = node as any;

        if (!cmtNode.__cmt) {
            this.appendFormated(raw, node.loc!.end.line);
            return;
        }

        for (let cmt of cmtNode.__cmt[CommentType.CT_LEFT]) {
            this.formatComment(cmt as Comment);
        }
        this.appendFormated(raw, node.loc!.end.line);
        for (let cmt of cmtNode.__cmt[CommentType.CT_RIGHT]) {
            this.formatComment(cmt as Comment);
        }
    }

    /**
     * 格式化空行
     * @param node 准备写入的节点
     */
    private formatEmptyLine(node: Node) {
        if (!this.lastLine) {
            return;
        }

        let lines = node.loc!.start.line - this.lastLine;
        assert(lines >= 0);

        let maxLines = Math.min(lines, this.setting.maxEmptyLine);
        for (let index = 0; index < maxLines; index++) {
            this.formatedCtx += this.setting.lineBreak;
        }
    }

    /**
     * 格式化注释
     * @param node 
     */
    private formatComment(node: Comment) {
        this.appendFormated(node.raw, node.loc!.end.line);
    }

    private formatLocalStatement(node: LocalStatement) {
        this.appendFormated("local ");
        for (const val of node.variables) {
            this.formatAny(val, val.name);
        }

        let __init = (node as any).__init as Node[];
        this.formatNodes(__init || node.init);
    }

    private formatNodes(nodes: Node[]) {
        for (const node of nodes) {
            this.formatEmptyLine(node);
            switch (node.type) {
                case "Comment": this.formatComment(node); break;
                case "LocalStatement": this.formatLocalStatement(node); break;
            }
        }
    }

    private doFormat(nodes: Node[]) {
        console.log(JSON.stringify(nodes));
        this.formatNodes(nodes);
    }

    public format(text: string) {
        let parser = new Parser();

        const nodes = parser.parse(text);
        this.doFormat(nodes);

        return this.formatedCtx;
    }
}