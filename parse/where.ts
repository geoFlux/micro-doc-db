import { parseExpression } from '@babel/parser'
import { isArrowFunctionExpression, Expression, isObjectExpression, ObjectProperty, isObjectProperty, isIdentifier, SourceLocation, arrowFunctionExpression, isMemberExpression, MemberExpression, ObjectExpression, FunctionExpression, ArrowFunctionExpression, Identifier, Pattern, RestElement, TSParameterProperty, isFunctionExpression, isBlockStatement, isReturnStatement } from '@babel/types'
import { WorkOrder } from '../WorkOrder'

type BindFunc = <T>(param: T) => T;
export function parseWhereFunc(func: (item: any, bind: BindFunc) => boolean) {
    const bindParams = getBindParams(func);

    const expr = parseExpression(func.toString());
    const tmp = JSON.stringify(expr, null, '  ');
    // console.log(tmp)
}
function getBindParams(func: (item: any, bind: BindFunc) => boolean): any[] {
    const bindParams: any[] = []
    const bind: any = (param: any) => {
        bindParams.push(param)
        return {};
    };
    const proxy = getProxy();
    func(proxy, bind);
    return bindParams;
}
function parseWhereExpr(expr: Expression) {

}

const getProxy = (): any => new Proxy({}, ({
    get: () => getProxy(),
    set: () => true
}))

//parseWhereFunc((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == 12345)

const workorderId = 54321;

const bind = (param: any) => {
    return param;
};

parseWhereFunc((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId) && (item.workOrderNumber == 'blah' || item.workOrderNumber == 'blorp'))

interface SqlNode {
    type: string;
    text: string;
    left: SqlNode | null;
    right: SqlNode | null;
    parenthesized: boolean;
}
class SqlBinaryNode implements SqlNode {
    type = 'SqlBinaryExpression';
    text = this.operator;
    constructor(
        public operator: 'and' | 'or' | '=',
        public left: SqlNode,
        public right: SqlNode,
        public parenthesized = false
    )
    {}
}
class SqlColumnNode implements SqlNode {
    type = 'SqlColumnExpression'
    text = `json_extract(val, '$.${this.path}')`
    left = null;
    right = null;
    constructor(
        public tableAlias: string,
        public path: string,
        public parenthesized = false
    ){}
}
class BindParamNode implements SqlNode {
    type = 'BindParamExpression'
    text = `?`
    left = null;
    right = null;
    constructor(
        public isConstant: boolean,
        public position: number,
        public parenthesized = false
    ){}
}

const newExpression: SqlNode = new SqlBinaryNode(
    "and",
    new SqlBinaryNode(
        "=",
        new SqlColumnNode("item", "workOrderId"),
        new BindParamNode(false, 0)
    ),
    new SqlBinaryNode(
        "or",
        new SqlBinaryNode(
            "=",
            new SqlColumnNode("item", "siteId"),
            new BindParamNode(false, 1)
        ),
        new SqlBinaryNode(
            "=",
            new SqlColumnNode("item", "siteId"),
            new BindParamNode(false, 2),
        ),
        true
    )
);

console.log(
    printSqlNode(newExpression)
)
function printSqlNode(node: SqlNode | null): string {
    if(node == null)
        return '';
    if(node.left != null) {
        const leftPren = node.left.parenthesized ? ['(',')']: ['','']
        const rightPren = node.right && node.right.parenthesized ? ['(',')']: ['', '']
        return `${leftPren[0]}${printSqlNode(node.left)}${leftPren[1]} ${node.text} ${rightPren[0]}${printSqlNode(node.right)}${rightPren[1]}`
    }
    if(node.left == null && node.right == null) {
        return node.text;
    }

    throw new Error('not implemented')
}
//console.log(newExpression);