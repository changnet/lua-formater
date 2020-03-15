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
import { timingSafeEqual } from 'crypto';

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
    comment?: Node; // 扩展Token，允许注释和其他Node存放在一数组内

    /*
    inline comment
    test(a--[[aaaa]], b, c)
    "aaaa" is a's inline comment
    */
    inlineCmt?: Token[];
}

enum BlockType {
    Unknow = 0,
    Comment = 1,
    Function = 2,
}

interface BaseBlock<T> {
    bType: T;
    aboveCmt?: TokenEx[];
    rightCmt?: TokenEx[];
}

// 独立注释
interface CommentBlock extends BaseBlock<BlockType.Comment> {
    body: TokenEx[];
}

// 函数
interface FunctionBlock extends BaseBlock<BlockType.Function> {
    name: TokenEx[];
    parameters: TokenEx[];
    body: Block[];
    end: TokenEx;
}

type Block = FunctionBlock | CommentBlock;

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

    // 检测下一个token是否为想要的token
    private peek(tokenType: LTT, value?: string) {
        if (this.index >= this.tokens.length) {
            return false;
        }

        const token = this.tokens[this.index + 1];
        if (token.type === tokenType && (!value || value === token.value)) {
            return true;
        }

        return false;
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

    // 解析连续的注释
    private parseComment(): TokenEx[] | null {
        if (!this.peek(LTT.Comment)) {
            return null;
        }

        let lastLine = -1;
        let comments = new Array<TokenEx>();
        do {
            const token = this.consume()!;
            const line = token.comment!.loc!.end.line;
            // 一个注释块，必须是连续的，如果中间有空行，那就不算连续
            // --[[abc]] --[[def]] 这种在同一行的也算
            if (-1 === lastLine || line - lastLine <= 1) {
                lastLine = line;
                comments.push(token);
            }
        } while (this.peek(LTT.Comment));

        return comments;
    }

    // 是否为独立的注释
    private isIndepentComment(comments: TokenEx[], token: TokenEx | null) {
        if (!token) {
            return true;
        }

        // 一个注释块，必须是连续的，如果中间有空行，那就不算连续
        // --[[abc]] --[[def]] 这种在同一行的也算
        const last = comments[comments.length - 1];
        if (token.comment!.loc!.end.line - last.comment!.loc!.end.line <= 1) {
            return true;
        }

        return false;
    }

    // 解析函数声明
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

            paramters.push(token);

            // inline注释
            while (this.peek(LTT.Comment)) {
                if (!token.inlineCmt) {
                    token.inlineCmt = new Array<TokenEx>();
                }
                token.inlineCmt.push(this.consume()!);
            }
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
            const comments = this.parseComment();
            token = this.consume();

            if (comments && this.isIndepentComment(comments, token)) {
                this.blocks.push({
                    bType: BlockType.Comment,
                    body: comments
                });
            }

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