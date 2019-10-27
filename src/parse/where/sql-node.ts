import { Dictionary } from "lodash";

//this stuff is specific to parsing where clauses
//it's not designed to be able to represent any and all sql, just the where clause
//WIP
export interface SqlNode {
    type: string;
    text: string;
    parenthesized: boolean;
}

export interface SqlLeftRightNode extends SqlNode {
    left: SqlNode;
    right: SqlNode;
}
export interface SqlLeafNode extends SqlNode {    
}
export interface SqlLogicalNode extends SqlLeftRightNode {
    javascriptOp: "||" | "&&"
}
export type JavascriptComparisonOperator = '==' | '===' | '!=' | '>' | '<'
export interface SqlComparisonNode extends SqlLeftRightNode {
    javascriptOp: JavascriptComparisonOperator
}


export function isSqlLogicalNode(o: any): o is SqlLogicalNode {
    return o.javascriptOp != null
        && (o.javascriptOp == '||' || o.javascriptOp == '&&')
        && isSqlLeftRightNode(o)                
}
export function isSqlLogicalOrComparisonNode(o: any): o is SqlLogicalOrComparisonNode{
    return isSqlNode(o)
        && o.type == 'SqlLogicalOrComparisonNode'
}
export function isSqlComparisonNode(o: any): o is SqlComparisonNode {
    return isSqlLogicalOrComparisonNode(o)
        && (
            o.javascriptOp == '=='
            || o.javascriptOp == '==='
            || o.javascriptOp == '!='
            || o.javascriptOp == '>'
            || o.javascriptOp == '<'
        )
}
export class SqlLogicalOrComparisonNode implements SqlLeftRightNode {
     private get map(): Dictionary<string> {
        return {
            "==":"=",
            "===":"=",
            "||":"or",
            "&&":"and",
            "!=":"!=",
            ">":">",
            "<":"<"
        }
    }
    type = "SqlLogicalOrComparisonNode";
    text = this.map[this.javascriptOp];

    
    constructor(
        public javascriptOp: string,
        public left: SqlNode,
        public right: SqlNode,
        public parenthesized = false
    ) {
        if(this.map[javascriptOp] == null)
            throw new Error(`SqlLogicalOrComparisonNode - javascriptOp: ${javascriptOp} is invalid, must be one of ${this.validJavascriptOps.join(' ')}`)
    }

    public get validJavascriptOps() {
        return Object.keys(this.map);
    }
    
}
export class SqlColumnNode implements SqlLeafNode {
    type = 'SqlColumnExpression'
    text = `json_extract(val, '$.${this.path}')`
    constructor(
        public tableAlias: string,
        public path: string,
        public parenthesized = false
    ){}
}
export class SqlBindParamNode implements SqlLeafNode {
    type = 'BindParamExpression'
    text = `?`
    constructor(
        public isLiteral: boolean,
        public position: number,
        public parenthesized = false,
        public literalValue: any = null
    ){}
}

export function isSqlNode(obj: any): obj is SqlNode {
    return obj.type != null
        && obj.text != null
        && obj.parenthesized != null
}
export function isSqlLeftRightNode(o: any): o is SqlLeftRightNode {
    return o.left != null
        && o.right != null
        && isSqlNode(o)        
}

export function isSqlLeafNode(o: any): o is SqlLeafNode {
    return o.left == null
        && o.right == null
        && isSqlNode(o);
}
export function isSqlBindParamNode(o: any): o is SqlBindParamNode {
    return isSqlNode(o)
        && o.type == 'BindParamExpression'
}
export function isSqlColumnNode(o: any): o is SqlColumnNode {
    return isSqlNode(o)
        && o.type == 'SqlColumnExpression'
}