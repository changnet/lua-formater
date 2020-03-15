// 解析lua源代码

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

export interface TokenEx extends Token {
    comment?: Comment; // 扩展Token，允许注释和其他Node存放在一数组内

    /*
    inline comment
    test(a--[[aaaa]], b, c)
    "aaaa" is a's inline comment
    */
    inlineCmt?: Token[];
}

export enum BlockType {
    Unknow = 0,
    Comment = 1,
    Function = 2,
    Assignment = 3,
}

interface BaseBlock<T> {
    bType: T;
    aboveCmt?: TokenEx[];
    rightCmt?: TokenEx[];
}

// 变量名，可包含多个token，如 A.B.c = 1中的 A.B.c
type TokenList = TokenEx[];

// 独立注释
export interface CommentBlock extends BaseBlock<BlockType.Comment> {
    body: TokenEx[];
}

// 函数
export interface FunctionBlock extends BaseBlock<BlockType.Function> {
    local: boolean;
    name: TokenList; // 包含 A.test 或 A:test
    parameters: TokenEx[];
    body: Block[];
    end: TokenEx;
}

// 赋值
export interface AssignmentBlock extends BaseBlock<BlockType.Assignment> {
    local: boolean;
    name: TokenList[]; // 多个名字 a, b = 1, 1 + 2
    body: Block[];
}

export type Block = FunctionBlock | CommentBlock | AssignmentBlock;

export class Parser {
    private index = 0; // tokens的下标
    private tokens = new Array<TokenEx>();
    private blocks = new Array<Block>();

    private error(message?: string, token?: TokenEx) {
        let syntax = new SyntaxError(message);
        throw syntax;
    }

    private peek(): TokenEx | null {
        if (this.index >= this.tokens.length) {
            return null;
        }

        return this.tokens[this.index];
    }

    private next() {
        this.index++;
    }

    // 消耗一个token
    private consume(value?: string): TokenEx | null {
        if (this.index >= this.tokens.length) {
            return null;
        }

        const token = this.tokens[this.index];
        if (!value || token.value === value) {
            this.index++;
            return token;
        }

        return null;
    }

    // 检测下一个token是否为想要的token
    private expect(tokenType: LTT, value?: string) {
        const index = this.index;
        if (index >= this.tokens.length) {
            return false;
        }

        const token = this.tokens[index];
        if (token.type === tokenType && (!value || value === token.value)) {
            return true;
        }

        return false;
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
                let line = node.loc!.end.line;
                let lineStart = node.loc!.start.line;
                this.tokens.push({
                    type: LTT.Comment, value: node.value,
                    line: line, range: [0, 0], lineStart: lineStart,
                    comment: node
                });
            }
        });

        let token;
        while (true) {
            token = parser.lex();
            if (token.type !== LTT.EOF) {
                this.tokens.push(token);
            }
            else {
                break;
            }
        }
    }

    // 解析变量名
    private parseIdentifier() {
        let identifier = new Array<TokenEx>();

        let token = this.peek();
        while (token) {
            if (token.type === LTT.Identifier
                || token.value === "." || token.value === ":") {
                identifier.push(token);
                this.next();
            } else {
                break;
            }
        }

        return identifier;
    }

    // 解析连续的注释
    private parseComment(): TokenEx[] | null {
        let token = this.peek();

        // 先判断一次，如果不是注释避免创建下面的数组
        if (!token || token.type !== LTT.Comment) {
            return null;
        }

        let lastLine = -1;
        let comments = new Array<TokenEx>();
        while (token) {
            // 遇到非注释代码，则当前注释不是独立的，返回给其他代码块处理
            if (token.type !== LTT.Comment) {
                return comments;
            }

            // 一个注释块，必须是连续的，如果中间有空行，那就不算连续
            // --[[abc]] --[[def]] 这种在同一行的也算
            if (-1 !== lastLine && token.lineStart - lastLine > 1) {
                break;
            }

            lastLine = token.line;
            comments.push(token);

            this.next();
            token = this.peek();
        }

        this.blocks.push({
            bType: BlockType.Comment,
            body: comments
        });
        return null;
    }

    // 解析函数声明
    private parseFunction(local = false): FunctionBlock {
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
            while (this.expect(LTT.Comment)) {
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
            local: local,
            name: name,
            parameters: paramters,
            body: [],
            end: endToken!
        };
    }

    // 解析local声明
    private parseLocalStatement(): Block {
        const token = this.consume();
        if (!token) {
            this.error("expect local statement");
        }

        // local function test() end
        if (token!.value === "function") {
            return this.parseFunction(true);
        }

        // local a, b = 1, 2 + 1
        return this.parseAssignment(true);
    }

    // 解析表达式
    private parseExpression() {

    }

    // 解析赋值操作
    private parseAssignment(local = false): AssignmentBlock {
        // 解析变量名 A.b, c = 1, test()
        let names = new Array<TokenList>();

        do {
            let name = this.parseIdentifier();
            names.push(name);

        } while (this.consume(","));

        if (this.consume("=")) {
            this.parseExpression();
        }

        return {
            bType: BlockType.Assignment,
            local: local,
            name: names,
            body: []
        };
    }

    // 对代码进行语法解析并格式化
    // 参考 luaparse.js parseStatement
    private doParse() {
        while (this.index < this.tokens.length - 1) {
            const comments = this.parseComment();

            const token = this.peek();
            if (!token) {
                break;
            }

            let block: Block | null = null;
            if (LTT.Keyword === token.type) {
                this.next();
                switch (token.value) {
                    case "function": block = this.parseFunction(); break;
                    case "local": block = this.parseLocalStatement(); break;
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
                    if (comments) {
                        block.aboveCmt = comments;
                    }
                    this.blocks.push(block);
                }
            }
        }
    }
    public parse(ctx: string) {
        this.doLex(ctx);
        this.doParse();

        return this.blocks;
    }
}