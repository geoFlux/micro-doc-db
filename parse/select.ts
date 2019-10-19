import { parseExpression } from '@babel/parser'
import { isArrowFunctionExpression, Expression, isObjectExpression, ObjectProperty, isObjectProperty, isIdentifier, SourceLocation, arrowFunctionExpression, isMemberExpression, MemberExpression, ObjectExpression, FunctionExpression, ArrowFunctionExpression, Identifier, Pattern, RestElement, TSParameterProperty, isFunctionExpression, isBlockStatement, isReturnStatement } from '@babel/types'
import { Dictionary } from 'lodash';

//TODO: modify parseSelectFunc so it can accept multiple potential tables

export interface SelectParseResult {
    tableAlias: string,
    objKeys: string[],
    dbKeys: string[]
}
export function parseSelectFunc(func: Function): SelectParseResult {
    const tmp = func.toString();
    return parseSelectExpr(parseExpression(func.toString()))
}
//happy path
function parseSelectExpr(expr: Expression): SelectParseResult {
    if(isArrowFunctionExpression(expr))
        return parseSelectExprArrowFunc(expr);
    if(isFunctionExpression(expr))
        return parseSelectExprFunc(expr);
    
    throw Error('expression must be ArrowFunctionExpression or FunctionExpression ')
    
}
function parseSelectExprArrowFunc(expr: ArrowFunctionExpression): SelectParseResult {
    if (!isObjectExpression(expr.body))
        throw Error('body must be ObjectExpression')

    return parseSelectExprBody(expr.params, expr.body);    
}
function parseSelectExprFunc(expr: FunctionExpression): SelectParseResult {
    if (!isBlockStatement(expr.body))
        throw new Error('expected block statement function body')
    if (!isReturnStatement(expr.body.body[0]))
        throw new Error('expected single line return function body')
    if (!isObjectExpression(expr.body.body[0].argument))
        throw new Error('expected object expression in return statement')
    
    return parseSelectExprBody(expr.params, expr.body.body[0].argument);        
        
}
function parseSelectExprBody(params: Array<Identifier | Pattern | RestElement | TSParameterProperty>, body: ObjectExpression): SelectParseResult {
    if (params.length < 1)
        throw Error('params < 1')
    if (!isIdentifier(params[0]))
        throw Error('params[0] not identifier')

    const tableAlias = params[0].name;

    let objKeys: string[] = [];
    let dbKeys: string[] = [];
    for (let prop of body.properties) {
        if (!isObjectProperty(prop))
            throw Error('expecting ObjectProperty')

        objKeys = objKeys.concat(getKeys(null, prop))
        dbKeys = dbKeys.concat(getValues(prop, { root: '$' }));
    }
    return {
        tableAlias,
        objKeys,
        dbKeys
    };
}
function getKeys(path: string | null, prop: ObjectProperty): string[] {
    const appendToPath = (name: string) => `${path != null ? `${path}.` : ''}${name}`
    if (!isIdentifier(prop.key))
        throw new Error('expected key to be identifier')
    if (isMemberExpression(prop.value)) {
        return [appendToPath(prop.key.name)];
    }
    else if (isObjectExpression(prop.value)) {
        let subKeys: string[] = [];

        for (let subProp of prop.value.properties) {
            if (!isObjectProperty(subProp))
                throw new Error('expected subProp to be object property')
            subKeys = subKeys.concat(getKeys(appendToPath(prop.key.name), subProp))
        }
        return subKeys;
    }

    throw new Error('unexpected type for prop.value')
}

type getValuesOptions = {
    root?: string
}



function getValues(prop: ObjectProperty, opts: getValuesOptions): string[] {
    if (isMemberExpression(prop.value)) {
        return [getValueOfMemberExpression(prop.value, opts)];
    }
    else if (isObjectExpression(prop.value)) {
        let subValues: string[] = [];
        for (let subProp of prop.value.properties) {
            if (!isObjectProperty(subProp))
                throw new Error('expected subProp to be object property')
            subValues = subValues.concat(getValues(subProp, opts))
        }
        return subValues;
    }
    throw new Error('not implemented')
}

function getValueOfMemberExpression(propVal: MemberExpression, { root }: getValuesOptions): string {

    if (isIdentifier(propVal.object) && isIdentifier(propVal.property)) {
        root = root || propVal.object.name;
        return `${root}.${propVal.property.name}`
    }
    else if (isMemberExpression(propVal.object) && isIdentifier(propVal.property)) {
        let tmp = `${getValueOfMemberExpression(propVal.object, { root })}.${propVal.property.name}`;
        return `${getValueOfMemberExpression(propVal.object, { root })}.${propVal.property.name}`
    }
    throw new Error('expected identifier')

    // else if(isMemberExpression(prop.value) && )
    throw new Error('not implemented')
}