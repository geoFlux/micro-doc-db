import { parseSelectFunc, SelectParseResult } from "./parse/select";
import { Database } from './async-sqlite3'
import * as _ from 'lodash'
import { WorkOrder } from "./WorkOrder";
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
    console.time('select')
    // const woList = await workorders.selectAll(item => ({
    //     workOrderId: item.workOrderId,
    //     wonum: item.workOrderNumber,
    //     location: {
    //         description: item.location.description,
    //         areaDetailDesc: item.location.areaDetails.description
    //     }
    // }))

    // const woList = await workorders.selectWhere(item => ({
    //     workOrderId: item.workOrderId,
    //     wonum: item.workOrderNumber,
    //     location: {
    //         description: item.location.description,
    //         areaDetailDesc: item.location.areaDetails.description
    //     }
    // }),
    //     "json_extract(val, '$.workOrderNumber') = ?","118163957"
    // )
    const woList = await workorders
        .select(item => ({
            workOrderId: item.workOrderId,
            wonum: item.workOrderNumber,
            location: {
                description: item.location.description,
                areaDetailDesc: item.location.areaDetails.description
            }
        }))
        .where("json_extract(val, '$.workOrderNumber') = ?", "118163957")

    console.timeEnd('select')
    console.log(woList);
}
type Record<T> = T & {
    _rowid_: number
}
function createMicroDoc<T>(db: Database, tableName: string) {
    return {

        select: <T2>(selector: (item: T) => T2) => ({
            where: (where: string, ...params: any[]): Promise<Record<T>[]> => {
                return selectWhere(db, tableName, selector, where, ...params)
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
async function  selectWhere<T>(db: Database, tableName: string, selector: (item: T) => any, where: string, ...params: any[]): Promise<any[]> {

    const parseResult = parseSelectFunc(selector);
    const sqlString = buildSelect(tableName, parseResult, where);

    let result = await db.all<{extracted_cols: string}>(sqlString,...params);
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

