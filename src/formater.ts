import * as assert from 'assert';

import { Setting } from "./setting";

import {
    Options,
    parse as luaParse,
    Parser as luaParser,

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
    CallStatement
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

interface TokenEx extends Token {
    comment?: Comment;

    /*
    inline comment
    test(a--[[aaaa]], b, c)
    "aaaa" is a's inline comment
    */
    inlineCmt?: Token[];
}

enum BlockType {
    Unknow = 0,
    Function = 1,
}

interface BaseBlock<T> {
    bType: T;
    aboveCmt?: TokenEx[];
    rightCmt?: TokenEx[];
}

interface FunctionBlock extends BaseBlock<BlockType.Function> {
    name: TokenEx[];
    parameters: TokenEx[];
    body: Block[];
    end: TokenEx;
}

type Block = FunctionBlock;

export class Formater {
    private index = 0; // tokens的下标
    private tokens = new Array<TokenEx>();
    private blocks = new Array<Block>();
    private formatedCtx = ""; // 格式化后的内容

    // 消耗一个token
    private consume(): TokenEx | null {
        if (this.index >= this.tokens.length) {
            return null;
        }

        let index = this.index++;
        return this.tokens[index];
    }

    // 添加格式化后的内容
    private appendFormated(indent: number, ctx: string) {
        // 写入缩进

        this.formatedCtx += ctx;
    }

    // 词法解析
    private doLex(text: string) {
        let parser: luaParser = luaParse(text, {
            locations: true, // 是否记录语法节点的位置(node)
            scope: false, // 是否记录作用域
            wait: true, // 是否等待显示调用end函数
            comments: true, // 是否记录注释
            ranges: false, // 记录语法节点的字符位置(第几个字符开始，第几个结束)
            luaVersion: "5.3",

            // 注释不会在token中返回，需要在create node中处理
            onCreateNode: node => {
                if (node.type !== "Comment") {
                    return;
                }
                let line = node.loc ? node.loc.start.line : 0;
                this.tokens.push({
                    type: LTT.Comment, value: node.value,
                    line: line, range: [0, 0], lineStart: 0, comment: node
                });
            }
        });

        let token;
        do {
            token = parser.lex();
            this.tokens.push(token);
        } while (token.type !== LTT.EOF);
    }

    // 格式化函数声明
    private parseFunction(): FunctionBlock {
        let token;

        // 函数名
        let name = new Array<TokenEx>();
        do {
            token = this.consume();
            if (!token || token.value === "(") {
                break;
            }

            // TODO: 这里需要过滤注释
            name.push(token);
        } while (true);

        // 参数
        let paramters = new Array<TokenEx>();
        do {
            token = this.consume();
            if (!token || token.value === ")") {
                break;
            }

            if (token.value === ",") {
                continue;
            }

            // TODO: 这里需要过滤注释
            paramters.push(token);
        } while (true);

        // 函数内容
        // 函数结束
        const endToken = this.consume();
        assert(endToken && endToken.value === "end");

        return {
            bType: BlockType.Function,
            name: name,
            parameters: paramters,
            body: [],
            end: endToken!
        };
    }

    // 对代码进行语法解析并格式化
    // 参考 luaparse.js parseStatement
    private doParse() {
        let token;
        do {
            token = this.consume();
            if (!token) {
                break;
            }

            let block: Block | null = null;
            if (LTT.Keyword === token.type) {
                switch (token.value) {
                    case "function": block = this.parseFunction(); break;
                    // "if"
                    // "return"
                    // "function"
                    // "while"
                    // "for"
                    // "repeat"
                    // "break"
                    // "do"
                    // "goto"
                }

                if (block) {
                    this.blocks.push(block);
                }
            }
        } while (token);
    }

    // 格式化函数
    private formatFunction(block: FunctionBlock) {
        // 注释
        // local及函数名
        this.appendFormated(0, "function ");

        // 函数名
        for (const token of block.name) {
            this.appendFormated(0, token.value);
        }

        // 参数
        let first = true;
        this.appendFormated(0, "(");
        for (const param of block.parameters) {
            if (!first) {
                this.appendFormated(0, ", ");
            }
            first = false;
            this.appendFormated(0, param.value);
            // TODO: 处理一下在参数中的注释
        }
        this.appendFormated(0, ")");

        // 函数内容
        // end
        this.appendFormated(0, " ");
        this.appendFormated(0, "end");
    }

    // 格式化代码
    private doFormat() {
        for (const block of this.blocks) {
            switch (block.bType) {
                case BlockType.Function:
                    this.formatFunction(block);
                    break;
            }
        }
    }

    public format(ctx: string) {
        this.doLex(ctx);
        this.doParse();
        this.doFormat();

        return this.formatedCtx;
    }
}