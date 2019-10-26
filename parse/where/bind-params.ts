import { SqlNode, SqlBindParamNode, isSqlBindParamNode, isSqlLeftRightNode, isSqlLogicalNode, isSqlColumnNode, JavascriptComparisonOperator, isSqlComparisonNode } from "./sql-node";

import { NotImplementedError } from "../../custom-errors";
import { AssertionError } from "assert";
import { WorkOrder } from "../../WorkOrder";
export type BindFunc = <T>(param: T) => T;
import { set, get } from 'lodash';

//todo: passed in expression must not contain any literal nulls?
export function getBindParams(func: (item: any, bind: BindFunc) => boolean, whereExpr: SqlNode): any[] {
    // const dynamicBindParams: any[] = []
    
    // const bind: any = (param: any) => {
    //     dynamicBindParams.push(param)
    //     return {};
    // };    

    const proxyInfo = getBindProxyInfo(whereExpr);
    
    do{
        let paramNo = 0;
        const bindP: any = (param: any) => {
            proxyInfo[paramNo].value = param;
            paramNo++;
            return param;
        }
        const proxy = getProxy(proxyInfo);        
        func(proxy, bindP);
    }while(proxyInfo.some(x => x.value == null))
    
    return proxyInfo.map(x => x.value);

    //todo: this doesn't work cause shit gets short-circuited, causing bind to not be called
    //todo: build a proxy object that evaluates all bind calls?
    


    // const bindNodes = getSqlBindNodes(whereExpr);
    // const bindParams: any[] = [];
    // for(let i=0; i<bindNodes.length; i++) {
    //     if(bindNodes[i].isLiteral) {
    //         bindParams.push(bindNodes[i].literalValue)
    //     }
    //     else{
    //         bindParams.push(dynamicBindParams.shift())
    //     }
    // }
    // return bindParams;
}

const getProxy = (proxyInfo: BindProxyInfo[]): any => {
    let ret: any = {}
    const getObj = (path: string): any => {
        const lastIndexOf = path.lastIndexOf('.');
        if(lastIndexOf < 0) return ret
        const objPath = path.substring(0, lastIndexOf);
        if(get(ret, objPath, null) == null)
            set(ret,objPath, {})
        return get(ret,objPath);
    }
    const getPropName = (path: string) => {
        const lastIndexOf = path.lastIndexOf('.')
        if(lastIndexOf < 0) return path;
        return path.substr(path.lastIndexOf('.') + 1)
    }
    for(let info of proxyInfo) {
        const obj = getObj(info.path);
        const propName = getPropName(info.path);
        Object.defineProperty(obj, propName, proxyProperty(proxyInfo, info.path));
        // if(get(ret, info.path, null) == null) {
        //     set(ret, info.path, getBindProxy( proxyInfo, info.path))
        // }
    }
    return ret;
}
function proxyProperty(info: BindProxyInfo[], path: string) {
    const myInfos = info.filter(x => x.path == path);
    let numTimesCalled = 0;
    const proxy ={
        get: () => {
            numTimesCalled++;
            if(numTimesCalled > myInfos.length){
                throw new Error(`proxy: ${path}, called ${numTimesCalled} times, expected:${myInfos.length}`)                
            }
            const myInfo = myInfos[numTimesCalled-1];
            const isNull = myInfo.value == null;
            const type = typeof(myInfo.value)
            const val = myInfo.value
            if(myInfo.shouldBeEqual){
                switch(myInfo.comparisonOperator) {
                    case '!=':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return !val
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                        throw new NotImplementedError()
                        break;
                    case '<':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return getStringLessThan(val)
                        throw new NotImplementedError()
                        break;
                    case '>':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                        throw new NotImplementedError()
                        break;
                    case '==':
                    case '===':
                        if(myInfo.value == null) return null
                        if(type == 'boolean') return val
                        if(type == 'number') return val
                        if(type == 'string') return val
                        throw new NotImplementedError()
                    default:
                        throw new NotImplementedError()
                }
            }
            else {//should be false
                switch(myInfo.comparisonOperator) {
                    case '!=':
                        if(myInfo.value == null) return null
                        if(type == 'boolean') return val
                        if(type == 'number') return val
                        if(type == 'string') return val
                        throw new NotImplementedError()
                        break;
                    case '<':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                    throw new NotImplementedError()
                        break;
                    case '>':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return getStringLessThan(val)                        
                        throw new NotImplementedError()
                        break;
                    case '==':
                    case '===':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return !val
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                        throw new NotImplementedError()
                    default:
                        throw new NotImplementedError()
                }
            }
        }
    }
    return proxy;
}
function getBindProxy(info: BindProxyInfo[], path: string) {
    const myInfos = info.filter(x => x.path == path);
    let numTimesCalled = 0;
    const proxy = (): any => new Proxy({},({
        get: () => {
            numTimesCalled++;
            if(numTimesCalled > myInfos.length){
                throw new Error(`proxy: ${path}, called ${numTimesCalled} times, expected:${myInfos.length}`)                
            }
            const myInfo = myInfos[numTimesCalled-1];
            const isNull = myInfo.value == null;
            const type = typeof(myInfo.value)
            const val = myInfo.value
            if(myInfo.shouldBeEqual){
                switch(myInfo.comparisonOperator) {
                    case '!=':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return !val
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                        throw new NotImplementedError()
                        break;
                    case '<':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return getStringLessThan(val)
                        throw new NotImplementedError()
                        break;
                    case '>':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                        throw new NotImplementedError()
                        break;
                    case '==':
                    case '===':
                        if(myInfo.value == null) return null
                        if(type == 'boolean') return val
                        if(type == 'number') return val
                        if(type == 'string') return val
                        throw new NotImplementedError()
                    default:
                        throw new NotImplementedError()
                }
            }
            else {//should be false
                switch(myInfo.comparisonOperator) {
                    case '!=':
                        if(myInfo.value == null) return null
                        if(type == 'boolean') return val
                        if(type == 'number') return val
                        if(type == 'string') return val
                        throw new NotImplementedError()
                        break;
                    case '<':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                    throw new NotImplementedError()
                        break;
                    case '>':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return getStringLessThan(val)                        
                        throw new NotImplementedError()
                        break;
                    case '==':
                    case '===':
                        if(myInfo.value == null) return 'notnull'
                        if(type == 'boolean') return !val
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                        throw new NotImplementedError()
                    default:
                        throw new NotImplementedError()
                }
            }
        }
    }))
    return proxy();
}
const getStringLessThan = (val: string): string | number =>  {
    if(val == '') return -1
    return val.substr(0, val.length - 1)
}


interface BindProxyInfo{    
    position: number
    path: string, 
    comparisonOperator: JavascriptComparisonOperator, 
    shouldBeEqual: boolean, 
    value: any
}
function getBindProxyInfo(expr: SqlNode): BindProxyInfo[] {
    const info: BindProxyInfo[] = [];
    type operator = {op: '&&' | '||', source: 'left'|'right'}
    const paths: string[] = [];
    const comparisonOperators: JavascriptComparisonOperator[] = []
    let position = 0;
    const walkTree = (node: SqlNode, ops: operator[] ) =>{
        if(isSqlLogicalNode(node)) {
            ops.push({op: node.javascriptOp, source: 'left'})
            walkTree(node.left, ops)
            ops.pop()
            ops.push({op: node.javascriptOp, source: 'right'})
            walkTree(node.right, ops)
        }
        else if(isSqlComparisonNode(node)) {
            comparisonOperators.push(node.javascriptOp)
            walkTree(node.left, ops);
            walkTree(node.right, ops);
        }
        else if(isSqlLeftRightNode(node)) {
            walkTree(node.left, ops)
            walkTree(node.right, ops)
        }
        else if(isSqlColumnNode(node)){
            paths.push(node.path);
        }
        else if(isSqlBindParamNode(node)){
            const path = paths.pop();
            if(path == null)
                throw new Error('expected path to be defined')
            const comparisonOperator = comparisonOperators.pop();
            if(comparisonOperator == null)
                throw new Error('expected comparison operator to be defined')
            let myOp = ops.pop();
            while(myOp != null && myOp.source != 'left')
                myOp = ops.pop();
            
            const value = node.isLiteral ? node.literalValue: null;
            if(myOp == null){
                info.push({position: position++,comparisonOperator, path, shouldBeEqual: true, value})
            }
            //if we're to the left of an && operator, we want to always return true            
            else if(myOp.op == '&&') {
                info.push({position: position++,comparisonOperator, path, shouldBeEqual: true, value})
            }
            //if we're to the left of an && operator, we want to always return true 
            else if(myOp.op == '||'){
                info.push({position: position++,comparisonOperator, path, shouldBeEqual: false, value})
            }            
        }
        else {
            throw new NotImplementedError();
        }        
    }
    walkTree(expr, []);
    return info;
}
export function getSqlBindNodes(whereExpr: SqlNode): SqlBindParamNode[] {
    if(isSqlBindParamNode(whereExpr)){
        return [whereExpr]
    }
    else if(isSqlLeftRightNode(whereExpr)) {
        return [
            ...getSqlBindNodes(whereExpr.left),
            ...getSqlBindNodes(whereExpr.right)
        ]
    }
    else {
        return [];
    }
    throw new NotImplementedError()
}
function assert(assertion: boolean, msg: string) {
    if(!assertion)
        throw Error(msg)
}
const test1 = () =>{
    const expr = {
        "javascriptOp": "&&",
        "left": {
            "javascriptOp": "==",
            "left": {
                "tableAlias": "item",
                "path": "workOrderId",
                "parenthesized": false,
                "type": "SqlColumnExpression",
                "text": "json_extract(val, '$.workOrderId')"
            },
            "right": {
                "isLiteral": false,
                "position": 0,
                "parenthesized": false,
                "literalValue": null,
                "type": "BindParamExpression",
                "text": "?"
            },
            "parenthesized": false,
            "type": "SqlLogicalOrComparisonNode",
            "text": "="
        },
        "right": {
            "javascriptOp": "==",
            "left": {
                "tableAlias": "item",
                "path": "crewId",
                "parenthesized": false,
                "type": "SqlColumnExpression",
                "text": "json_extract(val, '$.crewId')"
            },
            "right": {
                "isLiteral": false,
                "position": 0,
                "parenthesized": false,
                "literalValue": null,
                "type": "BindParamExpression",
                "text": "?"
            },
            "parenthesized": false,
            "type": "SqlLogicalOrComparisonNode",
            "text": "="
        },
        "parenthesized": false,
        "type": "SqlLogicalOrComparisonNode",
        "text": "and"
    }
    const workorderId =1234;
    const crewId = 'crewIdValue'
    const bindParams = getBindParams((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId) && item.crewId == bind(crewId), expr)
    assert(bindParams[0] === workorderId, `expected ${bindParams[0]} to be ${workorderId}`)
    assert(bindParams[1] === crewId, `expected ${bindParams[1]} to be ${crewId}`)
}

test1();