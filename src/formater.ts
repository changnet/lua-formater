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

export class Formater {
    private index = 0; // tokens的下标
    private tokens = new Array<TokenEx>();

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

    // 格式化函数声明
    private formatFunction() {
        let token;
        do {
            token = this.consume();
            console.log(JSON.stringify(token));
        } while (!token
            || (token.type === LTT.Punctuator && token.value === "("));
    }

    // 参考 luaparse.js parseStatement
    public doFormat(ctx: string) {
        this.doLex(ctx);

        const token = this.consume();
        if (!token) {
            return;
        }

        if (LTT.Keyword === token.type) {
            switch (token.value) {
                case "function": this.formatFunction(); break;
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
    }
}