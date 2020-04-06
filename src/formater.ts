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

// 格式化所需要的上下文
interface FormatCtx {
    length: number;
    lines: string[];
    lineCnt: number;
    indent: number;
}

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
        return this.setting.lineBreak;
    }
    private indentLine(ctx: FormatCtx) {
        return this.setting.indent.repeat(ctx.indent);
    }

    /**
     * 格式化一个不可分隔的节点
     * @param node 
     * @param raw 
     */
    private formatAny(node: Node, raw: string): FormatCtx {
        let cmtNode = node as any;

        let ctx: FormatCtx = {
            length: 0,
            lines: [],
            lineCnt: 1,
            indent: 0
        };

        if (!cmtNode.__cmt) {
            ctx.length = raw.length;
            ctx.lines.push(raw);
            return ctx;
        }

        // 加上左右注释，如 --[[123]] --[[123]] local a -- 123
        let text = "";
        for (let cmt of cmtNode.__cmt[CommentType.CT_LEFT]) {
            text += (cmt as Comment).raw;
        }
        text += raw;
        for (let cmt of cmtNode.__cmt[CommentType.CT_RIGHT]) {
            text += (cmt as Comment).raw;
        }

        ctx.length = text.length;
        ctx.lines.push(text);

        return ctx;
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
    private formatComment(node: Comment): FormatCtx {
        // TODO: 多行注释
        return {
            length: node.raw.length,
            lines: [node.raw],
            lineCnt: 1,
            indent: 0
        };
    }

    private formatLocalStatement(node: LocalStatement): FormatCtx {
        let ctx: FormatCtx = {
            length: 0,
            lines: [],
            lineCnt: 0,
            indent: 0,
        };
        this.appendFormated("local ");
        for (const val of node.variables) {
            this.formatAny(val, val.name);
        }

        let init = (node as any).__init as Node[];
        if (init.length <= 0) {
            return ctx;
        }

        this.appendFormated(" = ");
        this.formatNodes(init);

        return ctx;
    }

    private formatMemberExpression(node: MemberExpression) {

    }

    private formatFunction(node: FunctionDeclaration): FormatCtx {
        let ctx: FormatCtx = {
            length: 0,
            lines: [],
            lineCnt: 0,
            indent: 0,
        };
        if (node.isLocal) {
            this.appendFormated("local ");
        }

        this.appendFormated("function ");

        let identifier = node.identifier;
        if (identifier) {
            this.formatNode(identifier);
        }

        this.appendFormated("(");
        this.appendFormated(") ");

        this.formatNodes((node as any).__body);

        this.appendFormated(" end");

        return ctx;
    }

    private formatTableConstructor(node: TableConstructorExpression) {
        let fields: Node[] = (node as any).__fields;

        let ctx: FormatCtx = {
            length: 0,
            lines: [],
            lineCnt: 0,
            indent: 0,
        };

        this.appendFormated("{");
        if (fields.length > 0) {
            this.breakLine();
            this.formatNodes(fields);
            this.breakLine();
        }

        this.appendFormated("}");

        return ctx;
    }

    private formatNode(node: Node): FormatCtx {
        switch (node.type) {
            case "Comment":
                return this.formatComment(node);
            case "Identifier":
                return this.formatAny(node, node.name);
            case "LocalStatement":
                return this.formatLocalStatement(node);
            case "FunctionDeclaration":
                return this.formatFunction(node);
            case "TableConstructorExpression":
                return this.formatTableConstructor(node);
        }

        console.log(`formater unknow ast node type ${node.type}`);
        return {
            length: 0,
            lines: [],
            lineCnt: 0,
            indent: 0
        };
    }

    private formatNodes(nodes: Node[]) {
        let ctxs: FormatCtx[] = [];
        for (const node of nodes) {
            ctxs.push(this.formatNode(node));
        }

        return ctxs;
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