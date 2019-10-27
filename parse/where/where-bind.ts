import { parseExpression } from '@babel/parser';
import { BindFunc, getBindParams } from './bind-params';
import { parseWhereExpr } from './where';
export function parseWhereFunc(func: (item: any, bind: BindFunc) => boolean) {
    const expr = parseExpression(func.toString());
    const whereExpr = parseWhereExpr(expr);
    console.log(JSON.stringify(whereExpr, null, '    '));
    const bindParams = getBindParams(func, whereExpr);
    //todo: adjust bndParams to take account of any literal values
    //and return the bindParams with the parsed where clause
    return {
        bindParams,
        whereExpr
    };
    // console.log(tmp)
}
