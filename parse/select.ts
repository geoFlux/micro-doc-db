import { parseExpression } from '@babel/parser'
import { isArrowFunctionExpression, Expression, isObjectExpression, ObjectProperty, isObjectProperty, isIdentifier, SourceLocation, arrowFunctionExpression, isMemberExpression, MemberExpression } from '@babel/types'
import { Dictionary } from 'lodash';

export interface SelectParseResult {
    tableAlias: string,
    objKeys: string[],
    dbKeys: string[]
}
export function parseSelectFunc(func: Function): SelectParseResult {
    return parseSelectExpr(parseExpression(func.toString()))
}
//happy path
function parseSelectExpr(expr: Expression): SelectParseResult {
    if (!isArrowFunctionExpression(expr))
        throw new Error('select function must be an Arrow Function')
    const params = expr.params;
    if (params.length < 1)
        throw Error('params < 1')
    if (!isIdentifier(params[0]))
        throw Error('params[0] not identifier')

    const tableAlias = params[0].name;
    if (!isObjectExpression(expr.body))
        throw Error('body must be ObjectExpression')

    let map: Dictionary<string> = {};
    let objKeys: string[] = [];
    let dbKeys: string[] = [];
    for (let prop of expr.body.properties) {
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

// function parseSelectProp(prop: ObjectProperty, map: Dictionary<string>) {

// }
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
function blah({ root }: getValuesOptions) {

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