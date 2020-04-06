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
import { AnyARecord } from 'dns';

// comment type
export enum CommentType {
    CT_LEFT,   // 在左边的注释，如：local --[[comment]] val = true
    CT_RIGHT,  // 在右边的注释，如：local val -- comment 
    // CT_INSIDE, // 在内部的注释，如：local tbl = { --[[comment]] }
    CT_MAX

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
}

export class Parser {
    private index = 0;
    private cmt: Comment | null = null;
    private last: Node | null = null;

    private comments: Comment[] = [];

    private next() {
        if (this.index >= this.comments.length) {
            this.cmt = null;
            return false;
        }

        this.cmt = this.comments[this.index];

        this.index += 1;
        return true;
    }

    /**
     * 对比位置
     * @return number, -1: src < dst,1: src > dst, 2:src包含dst, -2: dst包含src
     */
    public static locationComp(src: Location, dst: Location): number {
        const sel = src.end.line;
        const ssl = src.start.line;
        const sec = src.end.column;
        const ssc = src.start.column;

        const del = dst.end.line;
        const dsl = dst.start.line;
        const dec = dst.end.column;
        const dsc = dst.start.column;

        if (sel < dsl) {
            return -1;
        }

        if (sel === dsl && sec < dsc) {
            return -1;
        }

        if (ssl > del) {
            return 1;
        }

        if (ssl === del && ssc > dec) {
            return 1;
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

    /**
     * 判断两个节点是否在同一行，仅适用于只占一行的节点
     */
    public static nodeSameLine(src: Node, dst: Node) {
        return src.loc!.end.line === dst.loc!.end.line;
    }

    // 对代码进行语法解析
    private doParse(text: string) {
        let options: Options = {
            locations: true, // 是否记录语法节点的位置(node)
            scope: false, // 是否记录作用域
            wait: false, // 是否等待显示调用end函数
            comments: true, // 是否记录注释
            ranges: false, // 记录语法节点的字符位置(第几个字符开始，第几个结束)
            luaVersion: "5.3",
            onCreateNode: () => { },
            onCreateScope: () => { },
            onDestroyScope: () => { },
            onLocalDeclaration: () => { },
            extendedIdentifiers: false
        };

        let chunk = luaParse(text, options);

        this.comments = chunk.comments as any as Comment[];
        return chunk;
    }

    /**
     * 注入注释，直到注释的位置不在node之前
     * @param node 对比位置的node
     * @param list 需要注入注释的列表
     */
    private until(node: Node, list: Node[]) {
        while (this.cmt) {
            let pos = Parser.nodeComp(this.cmt, node);
            if (-1 !== pos) {
                return pos;
            }

            list.push(this.cmt);
            this.next();
        }

        return 0;
    }

    /**
     * 把注释注入到具体语法节点
     * @param node 
     * @param cmt 
     * @param cty 
     */
    private inject(node: Node, cty: CommentType) {
        assert(this.cmt);
        // 一个节点可能存在多条注释，如 local a --[[abc]] --[[def]]
        let cmtNode = node as any;

        if (!cmtNode.__cmt) {
            cmtNode.__cmt = new Array<Comment[]>(CommentType.CT_MAX);
            for (let i = 0; i < CommentType.CT_MAX; i++) {
                cmtNode.__cmt[i] = [];
            }
        }
        cmtNode.__cmt[cty].push(this.cmt);

        this.next();
    }

    /**
     * 把某个节点之前(或之后)的注释全部注入到节点Node
     * @param node 需要注入的节点，该节点必须是一个不可再拆分的节点，如 Identenfier
     * @param pos 节点之前(或之后)
     */
    private injectUntil(node: Node, pos: number) {
        let cty: CommentType =
            -1 === pos ? CommentType.CT_LEFT : CommentType.CT_RIGHT;

        this.inject(node, cty);
        while (this.cmt && pos === Parser.nodeComp(this.cmt, node)) {
            this.inject(node, cty);
        }
    }

    /**
     * 把注释注入到注释前一个语法节点
     * @param node 需要注入的节点，该节点必须是一个不可再拆分的节点，如 Identenfier
     */
    private injectIntoAny(node: Node) {
        // 注入到a: local a -- abc
        // 注入到b: local a, b -- abc

        let cmt = this.cmt;
        if (!cmt) {
            return;
        }

        let pos = Parser.nodeComp(cmt, node);
        if (!this.last) {
            // 没有上一个语法节点，比如 local --[[abc]] val = true
            // 那么只能注入到val中
            if (-1 === pos) {
                this.injectUntil(node, CommentType.CT_LEFT);
            }
            this.last = node;
            return;
        }

        // 注释在上一个节点和当前节点之间，注入到上一个节点
        if (1 === pos) {
            this.injectUntil(this.last, CommentType.CT_RIGHT);
            this.last = node;
            return;
        }

        assert(false); // node已经是不可分隔节点，不会出现2 -2等位置情况
    }

    private injectIntoLocalStatement(node: LocalStatement) {
        for (let val of node.variables) {
            if (!this.cmt) {
                return;
            }
            this.injectIntoAny(val);
        }

        /**
         * 对于这种数组，里面的节点不属于不可拆分的语法节点，需要转换成一个数组来存储
         * 不然像下面这个例子，abc这个注释放到fase，或者函数里都不对，将会出现错误
         * local a, b = 
         *  false,
         *   -- abc
         *  function(a, b) end
         */
        (node as any).__init = this.injectIntoNodes(node.init);
    }

    private injectIntoFunction(node: FunctionDeclaration) {
        let identifier = node.identifier;
        if (identifier) {
            this.injectIntoNode(identifier);
        }

        let cmtNode = node as any;

        // TODO
        // function(--[[abc]]) end
        // 这里的注释 abc 是识别不出来在参数里还是在函数里的
        cmtNode.__parameters = this.injectIntoNodes(node.parameters);
        cmtNode.__body = this.injectIntoNodesRange(node.body, node.loc!);
    }

    private injectInfoTableConstructor(node: TableConstructorExpression) {
        let cmtNode = node as any;
        cmtNode.__fields = this.injectIntoNodesRange(node.fields, node.loc!);
    }

    private injectIntoNode(node: Node) {
        // 清除上一个节点，last只用于某个节点内部的关系判断，不用于两个并行节点的判断
        this.last = null;
        switch (node.type) {
            case "Identifier":
                this.injectIntoAny(node);
                break;
            case "MemberExpression":
                break;
            case "LocalStatement":
                this.injectIntoLocalStatement(node);
                break;
            case "FunctionDeclaration":
                this.injectIntoFunction(node);
                break;
            case "TableConstructorExpression":
                this.injectInfoTableConstructor(node);
                break;
            default:
                console.log(`unknow node type ${node.type}`);
                assert(false);
                break;
        }
    }

    /**
     * 注入注释到节点列表
     * @param nodes 
     * @param loc chunk的loc不包含前后注释
     */
    private injectIntoNodes(nodes: Node[]) {
        if (!this.cmt) {
            return nodes;
        }

        let cmtNodes: Node[] = [];
        for (let node of nodes) {
            // 没有注释需要处理了
            if (!this.cmt) {
                cmtNodes.push(node);
                continue;
            }

            // 把当前节点之前的注释全部插入到数组之中
            let pos = this.until(node, cmtNodes);
            cmtNodes.push(node);
            switch (pos) {
                case 0:
                    // 没有注释需要处理了
                    break;
                case 1:
                    // 注释在当前Node之后，等下一个循环处理
                    break;
                case 2:
                    // 注释不可能包含代码
                    assert(false, "impossiable position 2");
                    break;
                case -1:
                    // 注释在当前Node之前，这个应该在until里处理了
                    assert(false, "impossiable position -1");
                    break;
                case -2:
                    // 注释包含在代码之中，需要进行节点解析处理
                    this.injectIntoNode(node);
                    break;
            }
        }

        return cmtNodes;
    }

    private injectIntoNodesRange(nodes: Node[], loc?: Location) {
        if (!this.cmt) {
            return nodes;
        }

        // 注释必须在上层父节点的范围内，否则就是有注释漏处理了，放到了其他节点处理
        // TODO: 如果以注释开始，则chunk的范围不包含注释的范围，看下这个是bug还是
        // 需要特殊处理
        if (loc) {
            assert(-2 === Parser.locationComp(this.cmt.loc!, loc));
        }

        let cmtNodes = this.injectIntoNodes(nodes);
        // 语法结点注释完成，记录多出的注释
        while (this.cmt
            && (!loc || -2 === Parser.locationComp(this.cmt.loc!, loc))) {
            cmtNodes.push(this.cmt);
            this.next();
        }

        return cmtNodes;
    }

    public parse(text: string) {
        let chunk = this.doParse(text);

        this.next();

        // chunk.loc不包含前后的注释范围
        return this.injectIntoNodesRange(chunk.body);
    }
}
