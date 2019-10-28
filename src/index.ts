import { parseSelectFunc, SelectParseResult } from "./parse/select";
import { Database } from './async-sqlite3'
import * as _ from 'lodash'
import { WorkOrder } from "./WorkOrder";
import { parseWhereFunc, BindFunc } from './parse/where'
import { sqlNodeToWhereClause } from "./parse/where/sql-node";
import { NotImplementedError } from "./custom-errors";
interface blah {
    id: number;
    name: string;
    address: {
        line1: string;
        line2: string;
        zipcode: string;
        extra: {
            line3: string;
            line4: string;
        };
    };
}

const main = async () => {
    // const tableName = 'WorkOrder'
    // const parseResult = parseSelectFunc((item: WorkOrder) => ({
    //     workOrderId: item.workOrderId,
    //     workOrderNumber: item.workOrderNumber,
    //     currentStatus: item.currentStatus,
    //     locationDescription: item.location.description,
    //     location: item.location
    // }))


    // console.log(parseResult);



    // let sqlString = `with "${parseResult.tableAlias}" as (
    //     select json_extract(val, '${parseResult.dbKeys.join("','") }') as extracted_cols
    //     from "${tableName}"
    // )
    // select extracted_cols from "${parseResult.tableAlias}"
    // `

    // console.log(sqlString)

     let db = new Database('mwm_doc.db');
    // let result = await db.get<{extracted_cols: string}>(sqlString);

    // const tmp = JSON.parse(result.extracted_cols);
    // console.log(result);

    const workorders = createMicroDoc<WorkOrder>(db, 'WorkOrder');
let woList: any = null;
    console.time('select new')
    // const woList = await workorders
    //     .where((item,bind) => item.workOrderNumber == bind("118163957") || item.workOrderNumber == bind("118163998") )
    //     .select(item => ({
    //         workOrderId: item.workOrderId,
    //         wonum: item.workOrderNumber,
    //         location: {
    //             description: item.location.description,
    //             areaDetailDesc: item.location.areaDetails.description
    //         }
    //     }))
    woList = await workorders
        .select(item => ({
            workOrderId: item.workOrderId,
            wonum: item.workOrderNumber,
            location: {
                description: item.location.description,
                areaDetailDesc: item.location.areaDetails.description
            }
        }))
        .all()

    console.timeEnd('select new')

    console.log(woList);
}
type Record<T> = T & {
    _rowid_: number
}
function createMicroDoc<T>(db: Database, tableName: string) {
    return {
        where: (filterFunc: (item: T, bind: BindFunc ) => boolean) => ({
            select: <T2>(selector: (item: T) => T2) => {
                return selectWhere(db, tableName, selector, filterFunc)
            }
        }),
        all: (): Promise<Record<T>[]> => {
            throw new NotImplementedError();
        },
        select: <T2>(selector: (item: T) => T2) => ({

            where: (filterFunc: (item: T, bind: BindFunc ) => boolean) => {
                return selectWhere(db, tableName, selector, filterFunc)
            },
            all: (): Promise<Record<T>[]> => {
                return selectAll(db, tableName, selector)
            }
        })
    }
}
async function  selectAll<T>(db: Database, tableName: string, selector: (item: T) => any): Promise<any[]> {

    const parseResult = parseSelectFunc(selector);
    const sqlString = buildSelect(tableName, parseResult);
    let result = await db.all<{extracted_cols: string}>(sqlString);
    return mapDbResults(result, parseResult);
}
async function  selectWhere<T>(db: Database, tableName: string, selector: (item: T) => any, filterFunc: (item: T, bind: BindFunc ) => boolean): Promise<any[]> {
    const {bindParams, whereExpr} = parseWhereFunc(filterFunc);
    const whereStr = sqlNodeToWhereClause(whereExpr);
    const parseResult = parseSelectFunc(selector);
    const sqlString = buildSelect(tableName, parseResult, whereStr);

    let result = await db.all<{extracted_cols: string}>(sqlString,...bindParams);
    return mapDbResults(result, parseResult);
}
function mapDbResults(result: any[], parseResult: SelectParseResult) {
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
    let sqlString = `with "${parseResult.tableAliases[0]}" as (
        select
            json_extract(val, '${parseResult.dbKeys.map(x => x.jsonSelect).join("','") }') as extracted_cols,
            _rowid_
        from "${tableName}"
        ${where ? 'where': ''} ${where ? where: ''}
    )
    select _rowid_, extracted_cols from "${parseResult.tableAliases[0]}"
    `
    return sqlString;
}


main();

