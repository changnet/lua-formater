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

        this.index += 1;
        this.cmt = this.comments[this.index];

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
            scope: true, // 是否记录作用域
            wait: false, // 是否等待显示调用end函数
            comments: true, // 是否记录注释
            ranges: true, // 记录语法节点的字符位置(第几个字符开始，第几个结束)
            luaVersion: "5.3",
            onCreateNode: () => { },
            onCreateScope: () => { },
            onDestroyScope: () => { },
            onLocalDeclaration: () => { },
            extendedIdentifiers: false
        };

        return luaParse(text, options);
    }

    // 插入注释
    private injectComment() {
        let body: Node[] = [];
        for (let node of this.body) {
            // 没有注释需要处理了
            if (!this.next()) {
                body.push(node);
                continue;
            }

            let pos = Parser.nodeComp(this.cmt!, node)
            switch (pos) {
                case 1: body.push(this.cmt!); break;
                case 2: break;
                case -1:
                case -2: break;
            }
        }

        return body;
    }

    public parse(text: string) {
        this.doParse(text);

        return this.injectComment();
    }
}