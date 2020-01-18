import {
    Options,
    parse as luaParse,
    Parser as luaParser,

    Node,
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
export enum LTT {
    EOF = 1,
    StringLiteral = 2,
    Keyword = 4,
    Identifier = 8,
    NumericLiteral = 16,
    Punctuator = 32,
    BooleanLiteral = 64,
    NilLiteral = 128,
    VarargLiteral = 256
}

function test(text: string) {
    let parser: luaParser = luaParse(text, {
        locations: true, // 是否记录语法节点的位置(node)
        scope: false, // 是否记录作用域
        wait: true, // 是否等待显示调用end函数
        comments: false, // 是否记录注释
        ranges: true, // 记录语法节点的字符位置(第几个字符开始，第几个结束)
        luaVersion: "5.3"
    });

    let token;
    do {
        token = parser.lex();
        console.log(JSON.stringify(token));
    } while (token.type !== LTT.EOF);
}

test("local b = false; // ccccc");
