import * as assert from 'assert';

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
import { AssertionError } from 'assert';

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

    // 消耗一个token
    private consume(): TokenEx | null {
        if (this.index >= this.tokens.length) {
            return null;
        }

        let index = this.index++;
        return this.tokens[index];
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
        do {
            token = this.consume();
            console.log(JSON.stringify(token));
        } while (!token
            || (token.type === LTT.Punctuator && token.value === "("));

        this.blockEnd(CodeBlockType.Function);
    }

    // 对要格式化的代码进行语法解析
    private doParse() {
        let token;
        do {
            token = this.consume();
            if (!token) {
                return;
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

    // 格式化函数
    private formatFunction(block: CodeBlock) {
        // 如何计算断行
        // 什么时候把内容写入文件。是先拼成string再写入，还是格式化单个block直接写入
    }

    // 对解析好的代码块进行格式化
    private doFormat() {
        for (const block of this.blocks) {
            switch (block.type) {
                case CodeBlockType.Function: this.formatFunction(block); break;
            }
        }
    }

    // 参考 luaparse.js parseStatement
    public format(ctx: string) {
        this.doLex(ctx);
        this.doParse();
        this.doFormat();
    }
}