import { parseExpression } from '@babel/parser'
import { isArrowFunctionExpression, Expression, isObjectExpression, ObjectProperty, isObjectProperty, isIdentifier, SourceLocation, arrowFunctionExpression, isMemberExpression, MemberExpression, ObjectExpression, FunctionExpression, ArrowFunctionExpression, Identifier, Pattern, RestElement, TSParameterProperty, isFunctionExpression, isBlockStatement, isReturnStatement, isBinaryExpression, isLogicalExpression, BinaryExpression, LogicalExpression, isCallExpression, isLiteral } from '@babel/types'
import { WorkOrder } from '../../WorkOrder'
import { NotImplementedError, ParseError } from '../../custom-errors';
import { getValueOfMemberExpression } from '../common';
import { SqlNode, SqlLogicalNode, SqlColumnNode, SqlBindParamNode, isSqlBinaryNode, isSqlLeafNode } from './sql-node';




type BindFunc = <T>(param: T) => T;
export function parseWhereFunc(func: (item: any, bind: BindFunc) => boolean) {
    const bindParams = getBindParams(func);

    const expr = parseExpression(func.toString());
    //todo: adjust bindParams to take account of any literal values
    //and return the bindParams with the parsed where clause
    return parseWhereExpr(expr)    
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
function parseWhereExpr(expr: Expression): SqlNode {
    if(isArrowFunctionExpression(expr))
        return parseWhereExprArrowFunc(expr)
    if(isFunctionExpression(expr))
        return parseWhereExprFunction(expr)
    throw new Error('not implemented')
}

function parseWhereExprArrowFunc(expr: ArrowFunctionExpression): SqlNode {
    const returnExpr = expr.body;
    if (!isBinaryExpression(returnExpr) && !isLogicalExpression(returnExpr))
        throw new ParseError("expected return statement to be binary or logical expression", returnExpr);
    return parseWhereExprBody(returnExpr);    
}
function parseWhereExprFunction(expr: FunctionExpression): SqlNode {
    if (!isBlockStatement(expr.body)) 
        throw new ParseError("expected block statement function body", expr.body);
    if (!isReturnStatement(expr.body.body[0]))
        throw new ParseError("expected single line return function body", expr.body.body[0]);
    const returnExpr = expr.body.body[0];
    if(!isBinaryExpression(returnExpr) && !isLogicalExpression(returnExpr))
        throw new ParseError('expected return statement to be binary or logical expression', returnExpr);
    
    return parseWhereExprBody(returnExpr);    
}

function isParenthesized(expr: any): boolean {
    return expr.extra && expr.extra.parenthesized == true
}
function parseWhereExprBody(expr: Expression): SqlNode {    
    if(isBinaryExpression(expr) || isLogicalExpression(expr)) {                
        return new SqlLogicalNode(
            expr.operator,
            parseWhereExprBody(expr.left),
            parseWhereExprBody(expr.right),
            isParenthesized(expr)
        )
    }
    else if(isMemberExpression(expr)) {
        const tmp = getValueOfMemberExpression(expr,{prependRoot:false})
        return new SqlColumnNode(
            tmp.rootObj,
            tmp.path
        )        
    }
    else if(isCallExpression(expr) && isIdentifier(expr.callee)) {
        if(expr.callee.name == 'bind') {
            return new SqlBindParamNode(
                false,
                0//todo: get the correct position
            )
        }
    }
    else if(isLiteral(expr)) {
        return new SqlBindParamNode(
            true,
            0
        )
    }
    throw new NotImplementedError();
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
const func1 = (item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId);
const func2 = (item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId)&& item.workOrderNumber == 'blah';

const expr1 = parseExpression(func1.toString())
const expr2 = parseExpression(func2.toString())
const sqlExpr = parseWhereFunc((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId) && (item.workOrderNumber == 'blah' || item.workOrderNumber == 'blorp'))
console.log(sqlNodeToString(sqlExpr))




function sqlNodeToString(node: SqlNode | null): string {
    
    if(node == null)
        return '';
    if(isSqlBinaryNode(node)) {
        const leftPren = node.left.parenthesized ? ['(',')']: ['','']
        const rightPren = node.right && node.right.parenthesized ? ['(',')']: ['', '']
        return `${leftPren[0]}${sqlNodeToString(node.left)}${leftPren[1]} ${node.text} ${rightPren[0]}${sqlNodeToString(node.right)}${rightPren[1]}`
    }
    else if(isSqlLeafNode(node)){
        return node.text
    }
    else {
        throw new Error('unsupported SqlNode type:'+ JSON.stringify(node,null,'  '))
    }
}
//console.log(newExpression);