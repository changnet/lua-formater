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
    Unknow = 0, // 无效
    Comment = 1, // 注释
    Function = 2, // 函数
    Assignment = 3, // 赋值
    Expression = 4, // 表达式
    ConstValue = 5, // 常量(boolean、数字、字符串等)
    Punctuator = 6, // 运算符(如 + = % >=)
    CallExpr = 7, // 函数调用
    Identifier = 8, // 变量名，如 a.b.c
    IndexExpr = 9, // 索引取值，如tbl[idx]
    memberExpr = 10, // 取成员变量，如a.b或者a:b
}

interface BaseBlock<T> {
    bType: T;
    aboveCmt?: CommentBlock;
    rightCmt?: CommentBlock;
}

/** 独立注释 */
export interface CommentBlock extends BaseBlock<BlockType.Comment> {
    line: number;
    body: TokenEx[];
}

/** 函数 */
export interface FunctionBlock extends BaseBlock<BlockType.Function> {
    local: boolean;
    name: IdentifierBlock; // 包含 A.test 或 A:test
    parameters: TokenEx[];
    body: Block[];
    end: TokenEx;
}

/** 赋值 */
export interface AssignmentBlock extends BaseBlock<BlockType.Assignment> {
    local: boolean;
    name: IdentifierBlock[]; // 多个名字 a, M.b = 1, 1 + 2
    body: Block[];
}

/** 表达式 */
export interface ExpressionBlock extends BaseBlock<BlockType.Expression> {
    body: Block[];
}

/** 常量 */
export interface ConstBlock extends BaseBlock<BlockType.ConstValue> {
    body: TokenEx;
}

/** 运算符 */
export interface PunctuatorBlock extends BaseBlock<BlockType.Punctuator> {
    body: TokenEx[];
}

/** 函数调用 */
export interface CallBlock extends BaseBlock<BlockType.CallExpr> {
    method: "()" | "" | "{}";
    name: Block;
    args: Block[];
}

// 变量名 a.b.c
export interface IdentifierBlock extends BaseBlock<BlockType.Identifier> {
    body: TokenEx[];
}

// 索引成员
export interface IndexExprBlock extends BaseBlock<BlockType.IndexExpr> {
    body: ExpressionBlock;
}

// 访问成员变量 a.b.c
export interface MemberExprBlock extends BaseBlock<BlockType.memberExpr> {
    indexer: ":" | ".";
    body: IdentifierBlock;
}

export type Block = FunctionBlock | CommentBlock | AssignmentBlock
    | ExpressionBlock | ConstBlock | PunctuatorBlock | CallBlock
    | IdentifierBlock;

export class Parser {
    private index = -1; // tokens的下标
    private tokens = new Array<TokenEx>();
    private blocks = new Array<Block>();

    private token: TokenEx | null = null;

    private error(message?: string, token?: TokenEx) {
        let syntax = new SyntaxError(message);
        throw syntax;
    }

    private next() {
        this.index++;
        if (this.index >= this.tokens.length) {
            this.token = null;
            return null;
        }

        this.token = this.tokens[this.index];

        return this.token;
    }

    // 消耗一个token
    private consume(value?: string): TokenEx | null {
        const token = this.token;
        if (!token || (value && token.value !== value)) {
            return null;
        }

        this.next();
        return token;
    }

    // 检测下一个token是否为想要的token
    private expect(value: string) {
        if (!this.token || this.token.value !== value) {
            this.error(`expect: ${value}`);
            return null;
        }

        return this.next();
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
    private parseIdentifier(): IdentifierBlock {
        let identifier = new Array<TokenEx>();

        let token = this.token;
        while (token) {
            if (token.type === LTT.Identifier
                || token.value === "." || token.value === ":") {
                identifier.push(token);
                token = this.next();
            } else {
                break;
            }
        }

        return {
            bType: BlockType.Identifier,
            body: identifier
        };
    }

    // 解析连续的注释
    private parseComment(): CommentBlock | null {
        let token = this.token;

        // 先判断一次，如果不是注释避免创建下面的数组
        if (!token || token.type !== LTT.Comment) {
            return null;
        }

        let lastLine = -1;
        let comments = new Array<TokenEx>();
        while (token) {
            // 遇到非注释代码，则当前注释不是独立的，返回给其他代码块处理
            if (token.type !== LTT.Comment) {
                break;
            }

            // 一个注释块，必须是连续的，如果中间有空行，那就不算连续
            // --[[abc]] --[[def]] 这种在同一行的也算
            if (-1 !== lastLine && token.lineStart - lastLine > 1) {
                break;
            }

            lastLine = token.line;
            comments.push(token);

            token = this.next();
        }

        return {
            bType: BlockType.Comment,
            line: lastLine,
            body: comments
        };
    }

    // 解析函数声明
    private parseFunction(local = false): FunctionBlock {
        // 函数名
        let name = this.parseIdentifier();

        // 参数
        this.expect("(");
        let paramters = new Array<TokenEx>();
        do {
            let token = this.token;
            if (!token) {
                break;
            }

            paramters.push(token);
            token = this.next();

            // inline注释
            while (token && token.type === LTT.Comment) {
                if (!token.inlineCmt) {
                    token.inlineCmt = new Array<TokenEx>();
                }
                token.inlineCmt.push(token);
                token = this.next();
            }
        } while (this.consume(","));
        this.expect(")"); // 函数参数结束

        // 函数内容
        // 函数结束
        this.expect("end");

        return {
            bType: BlockType.Function,
            local: local,
            name: name,
            parameters: paramters,
            body: [],
            end: this.token!
        };
    }

    // 解析local声明
    private parseLocalStatement(): Block {
        const token = this.token;
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

    /** 是否为一元运算符*/
    private isUnary(token: TokenEx) {
        // local len = #list
        if (LTT.Punctuator === token.type) {
            return '#-~'.indexOf(token.value) >= 0;
        }
        // local a = not finish
        if (LTT.Keyword === token.type) {
            return 'not' === token.value;
        }

        return false;
    }

    /**
     * 解释函数调用
     * @param name 函数名
     * IdentifierBlock ::= a.b.c()
     * MemberExprBlock ::= a:b()
     * IndexExprBlock  ::= list[idx]()
     * CallBlock       ::= get():()
     */
    private parseCallExpression(name: Block): CallBlock {

        let block: CallBlock = {
            bType: BlockType.CallExpr,
            name: name,
            args: [],
            method: "",
        };

        return block;
    }

    // 参考lua parse parsePrefixExpression
    //     前缀表达式
    //     prefixexp ::= prefix {suffix}
    //     prefix ::= Name | '(' exp ')' -> test | (tbl[idx])
    //     suffix ::= '[' exp ']' | '.' Name | ':' Name args | args
    //     -> test[index] | test.a | test:b | (a, b, c)
    //
    //     args ::= '(' [explist] ')' | tableconstructor | String
    private parsePrefixExpression(): ExpressionBlock | null {
        let token = this.token;
        if (!token) {
            return null;
        }

        // The prefix 开始解释前缀
        let base;
        if (LTT.Identifier === token.type) {
            // a.b.c(1,2,3)中的a.b.c
            base = this.parseIdentifier();
        } else if (this.consume('(')) {
            // (tbl)带括号的前缀
            base = this.parseExpectedExpression();
            this.expect(')');
        }

        // 没有前缀，则肯定不是前缀表达式。 not ok这种就没有前缀
        if (!base) {
            return null;
        }

        let exprBlock: ExpressionBlock = {
            bType: BlockType.Expression,
            body: []
        };

        // The suffix
        // 一个表达式可能嵌套，需要循环解析。如 list[idx].get():test()
        while (true) {
            if (LTT.StringLiteral === token.type) {
                // string call: print "abcdef"
                base = this.parseCallExpression(base);
                continue;
            }
            if (LTT.Punctuator !== token.type) {
                break;
            }
            switch (token.value) {
                case '[':
                    // 数组索引 test[1 + 2]
                    this.next();
                    let expression = this.parseExpectedExpression();
                    // base = finishNode(ast.indexExpression(base, expression));
                    this.expect(']');
                    break;
                case '.':
                    // 成员 a.b
                    this.next();
                    //let identifier = this.parseIdentifier();
                    //base = finishNode(ast.memberExpression(base, '.', identifier));
                    break;
                case ':':
                    // 成员 a:b
                    this.next();
                    // let identifier = this.parseIdentifier();
                    //base = finishNode(ast.memberExpression(base, ':', identifier));
                    // Once a : is found, this has to be a CallExpression, otherwise
                    // throw an error.
                    base = this.parseCallExpression(base);
                    break;
                case '(': case '{': // args
                    // 函数调用 print(a, b, c) | print {1, 2, 3}
                    base = this.parseCallExpression(base);
                    break;
                default:
                    exprBlock.body.push(base);
                    return exprBlock;
            }
        }

        return exprBlock;
    }

    /**
     * 解析表达式
     * 参考 parseAssignmentOrCallStatement
     */
    private parseExpression(): ExpressionBlock | null {
        return null;
    }

    // 保证必须解析出一个表达式
    private parseExpectedExpression() {
        const expression = this.parseExpression();
        if (!expression) {
            this.error("expect a expression");
        }
        return expression;
    }

    // 解析赋值操作
    private parseAssignment(local = false): AssignmentBlock {
        // 解析变量名 A.b, c = 1, test()
        let names = new Array<IdentifierBlock>();

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
        this.next();
        while (this.token) {
            let cmtBlock = this.parseComment();
            // 如果当前注释不和下面的代码连在一起，则是独立的注释
            const token = this.token;
            if (cmtBlock && (!token || token.lineStart !== cmtBlock.line)) {
                this.blocks.push(cmtBlock);
                continue;
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
                    if (cmtBlock) {
                        block.aboveCmt = cmtBlock;
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