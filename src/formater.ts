// 格式化

import {
    Parser,
} from "./parser";

import {
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

import {
    SettingCtx
} from "./setting";

export class Formater {
    private formatedCtx = ""; // 格式化后的内容

    private setting: SettingCtx;

    public constructor(setting: SettingCtx) {
        this.setting = setting;
    }

    // 添加格式化后的内容
    private appendFormated(ctx: string) {
        // 写入缩进

        this.formatedCtx += ctx;
    }

    private doFormat(body: Node[]) {
        this.formatedCtx = JSON.stringify(body);
    }

    public format(text: string) {
        let parser = new Parser();

        const body = parser.parse(text);
        this.doFormat(body);

        return this.formatedCtx;
    }
}