import { parseSelectFunc, SelectParseResult } from "./parse/select";
import { Database } from './async-sqlite3'
import * as _ from 'lodash'
import { WorkOrder } from "./WorkOrder";
import { parseWhereFunc, BindFunc } from './parse/where'
import { sqlNodeToWhereClause } from "./parse/where/sql-node";
import { NotImplementedError } from "./custom-errors";
interface tvabm5 {
    assetUid:   number;
    assetnum:   string;
    siteid:     string;
    tvabm5code: string;
    tvabm5id:   number;
}


const main = async () => {
    const db = new Database('mam_doc.db')
    const besMethods = createMicroDoc<tvabm5>(db, 'tvabm5')

    const methods = await besMethods
        .query((x,bind) => x.siteid == bind('pso'))
        .all()
        .go()
    console.log(methods);

    // let db = new Database('mwm_doc.db');

    // const workorders = createMicroDoc<WorkOrder>(db, 'WorkOrder');
    // let woList: any = null;
    // console.time('select new')

    // woList = await workorders
    //     .select(item => ({
    //         workOrderId: item.workOrderId,
    //         wonum: item.workOrderNumber,
    //         location: {
    //             description: item.location.description,
    //             areaDetailDesc: item.location.areaDetails.description
    //         }
    //     }))
    //     .all()

    // console.timeEnd('select new')

    // console.log(woList);
}
type Record<T> = T & {
    _rowid_: number
}
function createMicroDoc<T>(db: Database, tableName: string) {
    return {
        query: (filterFunc: (item: T, bind: BindFunc ) => boolean) => ({
            select: <T2>(selector: (item: T) => T2) => {
                return {
                    go: ():  Promise<T2[]> => selectWhere(db, tableName, selector, filterFunc),
                    toSql: () => getSql(db, tableName, selector, filterFunc)
                }
            },
            all:() => ({
                go: (): Promise<T[]> => selectWhere(db, tableName, undefined, filterFunc),
                toSql: () => getSql(db, tableName, undefined, filterFunc)
            })
        }),
        all: (): Promise<Record<T>[]> => {
            throw new NotImplementedError();
        },
        // select: <T2>(selector: (item: T) => T2) => ({

        //     where: (filterFunc: (item: T, bind: BindFunc ) => boolean) => {
        //         return selectWhere(db, tableName, selector, filterFunc)
        //     },
        //     all: (): Promise<Record<T>[]> => {
        //         return selectAll(db, tableName, selector)
        //     }
        // })
    }
}
async function  selectAll<T>(db: Database, tableName: string, selector: (item: T) => any): Promise<any[]> {

    const parseResult = parseSelectFunc(selector);
    const sqlString = buildSelect(tableName, parseResult);
    let result = await db.all<{extracted_cols: string}>(sqlString);
    return mapDbResults(result, parseResult);
}
async function  selectWhere<T>(db: Database, tableName: string, selector?: (item: T) => any, filterFunc?: (item: T, bind: BindFunc ) => boolean): Promise<any[]> {

    const {sql, params, parseResult} = getSql(db, tableName, selector, filterFunc);
    let result = await db.all<{extracted_cols: string}>(sql,...params);
    return mapDbResults(result, parseResult);
}
function getSql<T>(db: Database, tableName: string, selector?: (item: T) => any, filterFunc?: (item: T, bind: BindFunc ) => boolean) {
    let whereStr: string | undefined = undefined;
    let bindParams: any = [];
    if(filterFunc != null){
        const result = parseWhereFunc(filterFunc);
        bindParams = result.bindParams;
        whereStr = sqlNodeToWhereClause(result.whereExpr);
    }

    const parseResult = parseSelectFunc(selector);
    const sqlString = buildSelect(tableName, parseResult, whereStr);
    return {
        sql: sqlString,
        params: bindParams,
        parseResult
    }
}
function mapDbResults(result: any[], parseResult: SelectParseResult) {
    if(parseResult.isAllColumns) {
        return result.map(x => x.val);
    }
    return result.map(x => ({
            rowid: x['_rowid_'],
            cols:JSON.parse(x.extracted_cols) as any[]
        })
    )
        .map((y) => {
            let ret: any = {};
            ret['_rowid_'] = y.rowid;
            for(let i=0; i< y.cols.length; i++){
                _.set(ret, parseResult.objKeys[i], y.cols[i])
            }
            return ret;
        })
}
function buildSelect(tableName: string, parseResult: SelectParseResult, where?: string) {
    let colList: string;
    const tableAlias = parseResult.tableAliases[0] ? parseResult.tableAliases[0]: tableName
    if(parseResult.isAllColumns) {
        colList = ` json_patch(val,'{"_row_id":'||_rowid_||'}') val `
    }
    else {
        colList = `json_extract(val, '${parseResult.dbKeys.map(x => x.jsonSelect).join("','") }') as extracted_cols,_rowid_`
    }

    let sqlString = `with "${tableAlias}" as (
        select
            ${colList}
        from "${tableName}"
        ${where ? 'where': ''} ${where ? where: ''} COLLATE NOCASE
    )
    select * from "${tableAlias}"
    `
    return sqlString;
}


main();

