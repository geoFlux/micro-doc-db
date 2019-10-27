import { isArrowFunctionExpression, Expression, isObjectExpression, ObjectProperty, isObjectProperty, isIdentifier, SourceLocation, arrowFunctionExpression, isMemberExpression, MemberExpression, ObjectExpression, FunctionExpression, ArrowFunctionExpression, Identifier, Pattern, RestElement, TSParameterProperty, isFunctionExpression, isBlockStatement, isReturnStatement, isBinaryExpression, isLogicalExpression, BinaryExpression, LogicalExpression, isCallExpression, isLiteral, isStringLiteral, isNumericLiteral, isBooleanLiteral } from '@babel/types'
import { WorkOrder } from '../../WorkOrder'
import { NotImplementedError, ParseError } from '../../custom-errors';
import { getValueOfMemberExpression } from '../common';
import { SqlNode, SqlLogicalOrComparisonNode, SqlColumnNode, SqlBindParamNode, isSqlLeftRightNode, isSqlLeafNode, isSqlBindParamNode } from './sql-node';
import { parseWhereFunc } from './where-bind';


function bindP<T>(val: T) {
    throw new NotImplementedError();
}


export function parseWhereExpr(expr: Expression): SqlNode {
    if(isArrowFunctionExpression(expr))
        return parseWhereExprArrowFunc(expr)
    if(isFunctionExpression(expr))
        return parseWhereExprFunction(expr)
    throw new Error('not implemented')
}

function parseWhereExprArrowFunc(expr: ArrowFunctionExpression): SqlNode {
    let returnExpr: any = expr.body;
    if(isBlockStatement(expr.body) && isReturnStatement(expr.body.body[0]) )
        returnExpr = expr.body.body[0].argument
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