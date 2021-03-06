import { SqlNode, SqlBindParamNode, isSqlBindParamNode, isSqlLeftRightNode, isSqlLogicalNode, isSqlColumnNode, JavascriptComparisonOperator, isSqlComparisonNode } from "./sql-node";

import { NotImplementedError } from "../../custom-errors";
import { AssertionError } from "assert";
import { WorkOrder } from "../../WorkOrder";
export type BindFunc = <T>(param: T) => T;
import { set, get } from 'lodash';
import { parseWhereExpr } from './where';
import { parseExpression } from '@babel/parser';
interface BindProxyInfo{    
    position: number
    path: string, 
    comparisonOperator: JavascriptComparisonOperator, 
    shouldBeEqual: boolean, 
    value: any,
    isLiteralValue: boolean
}

//todo: passed in expression must not contain any literal nulls?
export function getBindParams<T>(func: (item: T, bind: BindFunc) => boolean, whereExpr?: SqlNode): any[] {
    whereExpr = whereExpr || parseWhereExpr(parseExpression(func.toString()))

    const proxyInfo = getBindProxyInfo(whereExpr);
    if(proxyInfo.some(x => x.isLiteralValue))
        throw Error('Literal values are not supported, please use the bind function')
    let paramNo = 0;
    const bindP: any = (param: any) => {
        proxyInfo[paramNo].value = param;
        paramNo++;
        return 1;
    }
    const proxy = getProxy(proxyInfo);        
    func(proxy, bindP);
                
    return proxyInfo.map(x => x.value);
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
        if(obj[propName] == null)
            Object.defineProperty(obj, propName, proxyProperty(proxyInfo, info.path));
    }
    return ret;
}
function proxyProperty(info: BindProxyInfo[], path: string) {
    const myInfos = info.filter(x => x.path == path);
    const proxy ={
        get: () => {
            const myInfo = myInfos.find(x => x.value == null) || myInfos[myInfos.length-1];
            const val = myInfo.isLiteralValue ? myInfo.value : 1;//BindP should always return 1
            const isNull = val == null;
            const type = typeof(val)

            
            if(myInfo.shouldBeEqual){
                switch(myInfo.comparisonOperator) {
                    case '!=':
                        if(val == null) return 'notnull'
                        if(type == 'boolean') return !val
                        if(type == 'number') return val - 1
                        if(type == 'string') return val+'notEqual'
                        throw new NotImplementedError()
                        break;
                    case '<':
                        if(val == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return getStringLessThan(val)
                        throw new NotImplementedError()
                        break;
                    case '>':
                        if(val == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val + 1
                        if(type == 'string') return val+'notEqual'
                        throw new NotImplementedError()
                        break;
                    case '==':
                    case '===':
                        if(val == null) return null
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
                        if(val == null) return null
                        if(type == 'boolean') return val
                        if(type == 'number') return val
                        if(type == 'string') return val
                        throw new NotImplementedError()
                        break;
                    case '<':
                        if(val == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val + 1
                        if(type == 'string') return val+'notEqual'
                    throw new NotImplementedError()
                        break;
                    case '>':
                        if(val == null) return 'notnull'
                        if(type == 'boolean') return -1
                        if(type == 'number') return val - 1
                        if(type == 'string') return getStringLessThan(val)                        
                        throw new NotImplementedError()
                        break;
                    case '==':
                    case '===':
                        if(val == null) return 'notnull'
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

const getStringLessThan = (val: string): string | number =>  {
    if(val == '') return -1
    return val.substr(0, val.length - 1)
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
            walkTree(node.left, [...ops])
            ops.pop()
            ops.push({op: node.javascriptOp, source: 'right'})
            walkTree(node.right, [...ops])
        }
        else if(isSqlComparisonNode(node)) {
            comparisonOperators.push(node.javascriptOp)
            walkTree(node.left, [...ops]);
            walkTree(node.right, [...ops]);
        }
        else if(isSqlLeftRightNode(node)) {
            walkTree(node.left, [...ops])
            walkTree(node.right, [...ops])
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

            let leftOp = ops.pop();
            while(leftOp != null && leftOp.source != 'left')
                leftOp = ops.pop();
            
            const value = node.isLiteral ? node.literalValue: null;
            if(leftOp == null){
                info.push({position: position++,comparisonOperator, path, shouldBeEqual: true, value, isLiteralValue: node.isLiteral})
            }
            //if we're to the left of an && operator, we want to always return true            
            else if(leftOp.op == '&&') {
                info.push({position: position++,comparisonOperator, path, shouldBeEqual: true, value, isLiteralValue: node.isLiteral})
            }            
            //if we're to the left of an || operator, we want to always return false             
            else if(leftOp.op == '||'){
                info.push({position: position++,comparisonOperator, path, shouldBeEqual: false, value, isLiteralValue: node.isLiteral})
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

