// 解析lua源代码

import * as assert from 'assert';

import {
    Options,
    parse as luaParse,
    Parser as luaParser,

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

// LuaTokenType
enum LTT {
    EOF = 1,
    StringLiteral = 2,
    Keyword = 4,
    Identifier = 8,
    NumericLiteral = 16,
    Punctuator = 32,
    BooleanLiteral = 64,
    NilLiteral = 128,
    VarargLiteral = 256,
    Comment = 512,
}

export interface Location {
    start: {
        line: number;
        column: number;
    };
    end: {
        line: number;
        column: number;
    };
};

export class Parser {
    private index = 0;
    private cmt: Comment | null = null;

    private body: Node[] = [];
    private comments: Comment[] = [];

    private next() {
        if (this.index >= this.comments.length) {
            this.cmt = null;
            return false;
        }

        this.cmt = this.comments[this.index];

        this.index += 1;
        return true;
    }

    /**
     * 对比位置
     * @return number, -1: src < dst,1: src > dst, 2:src包含dst, -2: dst包含src
     */
    public static locationComp(src: Location, dst: Location): number {
        const sel = src.end.line
        const ssl = src.start.line
        const sec = src.end.column
        const ssc = src.start.column

        const del = dst.end.line
        const dsl = dst.start.line
        const dec = dst.end.column
        const dsc = dst.start.column

        if (sel < dsl) {
            return 1;
        }

        if (sel === dsl && sec < dsc) {
            return 1;
        }

        if (ssl > del) {
            return -1;
        }

        if (ssl === del && ssc > dec) {
            return -1;
        }

        /**
         * 不存在相等的位置，但是存在包含的位置
         * 如 [ --[[abc]] ] 这个table就包含了注释abc
         */

        if ((ssl < dsl || (ssl === dsl && ssc < dsc))
            && (sel > del || (sel === del && sec > dec))) {
            return 2;
        }

        if ((ssl > dsl || (ssl === dsl && ssc > dsc))
            && (sel < del || (sel === del && sec < dec))) {
            return -2;
        }

        // 剩下的只有一种可能，相等。但是这个值一般用不到
        return 0;
    }

    public static nodeComp(src: Node, dst: Node) {
        return Parser.locationComp(src.loc!, dst.loc!);
    }

    // 对代码进行语法解析
    private doParse(text: string) {
        let options: Options = {
            locations: true, // 是否记录语法节点的位置(node)
            scope: false, // 是否记录作用域
            wait: false, // 是否等待显示调用end函数
            comments: true, // 是否记录注释
            ranges: false, // 记录语法节点的字符位置(第几个字符开始，第几个结束)
            luaVersion: "5.3",
            onCreateNode: () => { },
            onCreateScope: () => { },
            onDestroyScope: () => { },
            onLocalDeclaration: () => { },
            extendedIdentifiers: false
        };

        let chunk = luaParse(text, options);

        this.body = chunk.body;
        this.comments = chunk.comments as any as Comment[];
    }

    /**
     * 注入注释，直到注释的位置不在node之前
     * @param node 对比位置的node
     * @param list 需要注入注释的列表
     */
    private until(node: Node, list: Node[]) {
        while (this.cmt) {
            let pos = Parser.nodeComp(this.cmt!, node);
            if (1 !== pos) {
                return pos;
            }

            list.push(this.cmt);
            this.next();
        }

        return 0;
    }

    private injectNode(node: Node) {
        switch (node.type) {
            case "LocalStatement": break;
        }
    }

    private injectNodes(nodes: Node[]) {
        let cmtNodes: Node[] = [];
        for (let node of nodes) {
            // 没有注释需要处理了
            if (!this.cmt) {
                cmtNodes.push(node);
                continue;
            }

            let pos = this.until(node, cmtNodes);
            cmtNodes.push(node);
            switch (pos) {
                case 0:
                    // 没有注释需要处理了
                    break;
                case 1:
                    // 这个应该在until里处理了
                    assert(false, "impossiable position 1");
                    break;
                case 2:
                    // 注释不可能包含代码
                    assert(false, "impossiable position 2");
                    break;
                case -1:
                    // 下一个注释在此节点之后，不用处理注释
                    continue;
                case -2:
                    // 注释包含在代码之中，需要进行节点解析处理
                    this.injectNode(node);
                    break;
            }

            this.next();
        }

        return cmtNodes;
    }

    /**
     * 插入注释
     * 并列关系的，直接插入一个Comment Node，如在顶层的文档注释，和其他node并列
     * 归属关系的，附加到对应的node里。 如: test(a, b --[[abc]], c) -- def
     */
    private injectComment() {
        // 没有任何注释
        if (!this.next()) {
            return this.body;
        }

        // 把注释注入到语法节点
        let body = this.injectNodes(this.body);

        // 语法结点注释完成，记录多出的注释
        while (this.cmt) {
            body.push(this.cmt);
            this.next();
        }

        return body;
    }

    public parse(text: string) {
        this.doParse(text);

        return this.injectComment();
    }
}