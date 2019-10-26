import { parseExpression } from '@babel/parser'
import { isArrowFunctionExpression, Expression, isObjectExpression, ObjectProperty, isObjectProperty, isIdentifier, SourceLocation, arrowFunctionExpression, isMemberExpression, MemberExpression, ObjectExpression, FunctionExpression, ArrowFunctionExpression, Identifier, Pattern, RestElement, TSParameterProperty, isFunctionExpression, isBlockStatement, isReturnStatement, isBinaryExpression, isLogicalExpression, BinaryExpression, LogicalExpression, isCallExpression, isLiteral, isStringLiteral, isNumericLiteral, isBooleanLiteral } from '@babel/types'
import { WorkOrder } from '../../WorkOrder'
import { NotImplementedError, ParseError } from '../../custom-errors';
import { getValueOfMemberExpression } from '../common';
import { SqlNode, SqlLogicalOrComparisonNode, SqlColumnNode, SqlBindParamNode, isSqlLeftRightNode, isSqlLeafNode, isSqlBindParamNode } from './sql-node';
import { BindFunc, getBindParams } from './bind-params';


function bindP<T>(val: T) {
    throw new NotImplementedError();
}


export function parseWhereFunc(func: (item: any, bind: BindFunc) => boolean) {
    
    const expr = parseExpression(func.toString());
    const whereExpr = parseWhereExpr(expr);
    console.log(JSON.stringify(whereExpr,null,'    '))
    const bindParams = getBindParams(func, whereExpr);
    //todo: adjust bndParams to take account of any literal values
    //and return the bindParams with the parsed where clause
    return {
        bindParams,
        whereExpr
    }    
// console.log(tmp)
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
        return new SqlLogicalOrComparisonNode(
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
    else if(isStringLiteral(expr) || isNumericLiteral(expr) || isBooleanLiteral(expr)) {
        //Literal = StringLiteral | NumericLiteral | NullLiteral | BooleanLiteral | RegExpLiteral | TemplateLiteral | BigIntLiteral;
        return new SqlBindParamNode(
            true,
            0,
            false,
            expr.value            
        )
    }
    throw new ParseError('unsupported expression type:'+expr.type, expr)    
}



//parseWhereFunc((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == 12345)

const workorderId = 54321;

const bind = (param: any) => {
    return param;
};
const func1 = (item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId);
const func2 = (item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId)&& item.workOrderNumber == 'blah';


const crewId='this is the crewId'
// const sqlExpr = parseWhereFunc((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId != bind(workorderId) && (item.workOrderNumber == bind('blah') || item.workOrderNumber == bind('blorp')) && item.crewId==bind(crewId))
const sqlExpr = parseWhereFunc((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId) && item.crewId == bind(crewId))
console.log(sqlExpr.bindParams);
console.log(sqlNodeToString(sqlExpr.whereExpr))




function sqlNodeToString(node: SqlNode | null): string {
    
    if(node == null)
        return '';
    if(isSqlLeftRightNode(node)) {
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