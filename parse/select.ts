import { parseExpression } from '@babel/parser'
import { isArrowFunctionExpression, Expression, isObjectExpression, ObjectProperty, isObjectProperty, isIdentifier, SourceLocation, arrowFunctionExpression, isMemberExpression, MemberExpression, ObjectExpression, FunctionExpression, ArrowFunctionExpression, Identifier, Pattern, RestElement, TSParameterProperty, isFunctionExpression, isBlockStatement, isReturnStatement } from '@babel/types'
import { Dictionary } from 'lodash';
import { ParseError } from '../custom-errors';

//TODO: modify parseSelectFunc so it can accept multiple potential tables

export interface SelectParseResult {
    tableAliases: string[],
    objKeys: string[],
    dbKeys: {
        jsonSelect: string,
        tableAlias: string
    }[]
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

    const tableAliases = getTableAliases(params)

    let objKeys: string[] = [];
    let dbKeys: getValuesResult[] = [];
    for (let prop of body.properties) {
        if (!isObjectProperty(prop))
            throw Error('expecting ObjectProperty')

        objKeys = objKeys.concat(getKeys(null, prop))        
        dbKeys = dbKeys.concat(
          getValues(prop, {
            root: "$",
            validRootObjects: getTableAliases(params)
          })
        );
    }
    
    return {
        tableAliases,
        objKeys,
        dbKeys: dbKeys.map(x =>({
            jsonSelect: x.path,
            tableAlias: x.rootObj
        }))
    };
}
function getTableAliases(params: Array<Identifier | Pattern | RestElement | TSParameterProperty>){
    return params.map(x => {
        if(!isIdentifier(x))
            throw new ParseError('expected param to be Identifier', x)
        return x.name;
    })
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
    root?: string,
    validRootObjects: string[]
}

type getValuesResult = { 
    path: string, 
    rootObj: string 
};
function getValues(prop: ObjectProperty, opts: getValuesOptions): getValuesResult[] {
    if (isMemberExpression(prop.value)) {
        return [getValueOfMemberExpression(prop.value, opts)];
    }
    else if (isObjectExpression(prop.value)) {
        let subValues: getValuesResult[] = [];
        for (let subProp of prop.value.properties) {
            if (!isObjectProperty(subProp))
                throw new Error('expected subProp to be object property')
            subValues = subValues.concat(getValues(subProp, opts))
        }
        return subValues;
    }
    throw new Error('not implemented')
}
function getValueOfMemberExpression(propVal: MemberExpression, { root, validRootObjects }: getValuesOptions): getValuesResult {

    if (isIdentifier(propVal.object) && isIdentifier(propVal.property)) {
        root = root || propVal.object.name;
        return {
            path: `${root}.${propVal.property.name}`,
            rootObj: propVal.object.name
        }        
    }
    else if (isMemberExpression(propVal.object) && isIdentifier(propVal.property)) {
        const tmp = getValueOfMemberExpression(propVal.object, { root, validRootObjects });
        return {
            rootObj: tmp.rootObj,
            path: `${tmp.path}.${propVal.property.name}`
        }         
    }
    throw new Error('expected identifier')
}