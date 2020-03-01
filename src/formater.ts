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
}

enum CodeBlockType {
    Unknow = 0,
    Function = 1,
}

// 代码块
interface CodeBlock {
    type: CodeBlockType;
    token: TokenEx[];
    sub?: CodeBlock[];
}

export class Formater {
    private index = 0; // tokens的下标
    private tokens = new Array<TokenEx>();
    private blocks = new Array<CodeBlock>();
    private curBlock: CodeBlock | null = null;
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

    // 开启新的代码块
    private blockBegin(first: TokenEx) {
        this.curBlock = {
            type: CodeBlockType.Unknow,
            token: [first],
        };
    }

    // 结束当前解析的代码块
    private blockEnd(type: CodeBlockType) {
        assert(this.curBlock);

        this.curBlock!.type = type;
        this.blocks.push(this.curBlock!);
    }

    // 格式化函数声明
    private parseFunction() {
        let token;

        // 函数名
        let name = "";
        do {
            token = this.consume();
            if (!token || token.value === "(") {
                break;
            }

            // TODO: 这里需要过滤注释
            name = name + token.value;
        } while (true);
        console.log(`function name ${name}`);

        // 参数
        let paramters = new Array<string>();
        do {
            token = this.consume();
            if (!token || token.value === ")") {
                break;
            }

            if (token.value === ",") {
                continue;
            }

            // TODO: 这里需要过滤注释
            paramters.push(token.value);
        } while (true);
        console.log(`function paraters ${JSON.stringify(paramters)}`);

        // 函数内容
        // 函数结束
        token = this.consume();
        assert(token && token.value === "end");

        // 写入函数注释
        // 计算整个函数能否放到同一行
        // 写入函数名
        // 计算参数断行、对齐并写入参数
        // 写入函数内容
        // 写入end

        // TODO: 有些对齐需要知道一个codeblock才知道如何处理，如 注释对齐
        // local a = 123, -- a
        // local b = 12345678, -- b

        this.blockEnd(CodeBlockType.Function);
    }

    // 对代码进行语法解析并格式化
    // 参考 luaparse.js parseStatement
    // 边解析边格式化，这样可以知道注释和代码的相对位置，原始的断行等信息，更容易处理
    // 如果解析完后再格式化，很多信息就没了
    private doFormat() {
        let token;
        do {
            token = this.consume();
            if (!token) {
                break;
            }

            this.blockBegin(token);
            if (LTT.Keyword === token.type) {
                switch (token.value) {
                    case "function": this.parseFunction(); break;
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
            }
        } while (token);
    }

    public format(ctx: string) {
        this.doLex(ctx);
        this.doFormat();
    }
}