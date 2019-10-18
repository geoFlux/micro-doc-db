import { Database } from './async-sqlite3'
import { NotImplementedError, ParseError } from './custom-errors';
import { ArrowFunctionExpression, isArrowFunctionExpression, Expression, isObjectExpression, ObjectProperty, isObjectProperty, Identifier, isIdentifier, SourceLocation } from '@babel/types'
import { parseExpression } from '@babel/parser';

interface Dictionary<T> {
    [index: string]: T;
}
interface OrmMapItem {
    objPath: string,
    dbSelector: string
}
interface OrmView<T> {
    getAll: () => Promise<T[]>
}

interface MicroDot<T> {
    getAll: () => Promise<Record<T>[]>,
    initialize: () => Promise<void>,
    upsert: (recordOrT: Record<T> | T) => Promise<void>,
    delete: (record: {_rowid_: number}) => Promise<void>,
    bulkInsert: (items: T[]) => Promise<void>,
    getWhere(selector: (item: Record<T>) => boolean): Promise<Record<T>>
}

type Record<T> = T & {
    _rowid_: number
}

export const createMicroDot = <T>(db: Database, tablename: string): MicroDot<T> =>{
    const safeTablename = getSafeTableName(tablename);
    // const microDot: MicroDot<T> = {
    //     getAll: () => getAll<T>(db, safeTablename),
    //     initialize: () => initializeMicroDot(db, safeTablename)
    // }    

    // return microDot;    
    throw new Error('not implemented')
}
async function getAll<T>(db: Database, safeTablename: string): Promise<Record<T>[]> {
    const sqlSelect = `select _rowid_, val from ${safeTablename}`;    
    const results = await db.all<{val: string,_rowid_: number}>(sqlSelect);
    return results.map(x => ({
        ...JSON.parse(x.val),
        _rowid_: x._rowid_
    }));
}
export const createOrmView = <T>(db: Database, tablename: string, mapItems: OrmMapItem[]): OrmView<T> => {
    const selectAllQuery = `
    select
    ${
        mapItems.map(x => `${x.dbSelector} as ${x.objPath}`).join(',')
        }
    from "${tablename}"
    `
    throw new NotImplementedError();
    // return {
    //     getAll: () => db.all<T>(selectAllQuery)
    // }
}

function getSafeTableName(tablename: string) {
    
    //todo: ensure tablename is safe
    return tablename
}
async function  initializeMicroDot(db: Database, safeTablename: string): Promise<void> {    
    await ensureTableExists(db, safeTablename);    
}

async function ensureTableExists(db: Database, safeTablename: string): Promise<void>{
    if(!(await tableExists(db, safeTablename))) {
        await createTable(db, safeTablename);
    }
}
async function tableExists(db: Database, safeTablename: string): Promise<boolean> {
    const result = await db.get<{cnt:number}>('SELECT count(*) cnt FROM "main".sqlite_master where tbl_name = ?', safeTablename);
    return result.cnt > 0;    
}
const main = async () => {
    const db = new Database('db-test.db');
    //db.onTrace(sql => console.log(sql));
    type Person = {
        name: string,
        address: {
            street: string,
            zipcode: string,
            state: string,
            city: string
        },
        favColor: string
    }

    const people = await createMicroDot<Person>(db, 'people');
    await people.initialize();
    people.getWhere(person => person.address.city == 'new york');
    //translate = where json_extract('$.address.city') == 'new york'
}

main();


async function createTable(db: Database, safeTablename: string): Promise<void> {    
    await db.transaction(async () => {
        await db.run(`create table "${safeTablename}" ( val JSON)`)
    })                    
}

async function mapResultsToPaths(db: Database, mapItems: OrmMapItem[], sql: string, ...params: any[]) {
    const results = await db.all<any>(sql, params);
    return results.map(x => {
        const item = {} as any;

    })
    throw new NotImplementedError();
}
function getOrmMapFromPaths(paths: string[]): OrmMapItem[] {
    return paths.map(path => ({
        objPath: path,
        dbSelector: `$.${path}`
    }));
}

function getOrmMapFromFunc(func: Function): Dictionary<string> {
    const expr = parseExpression(func.toString())
    return getOrmMapFromExpression(expr);
}

function getOrmMapFromExpression(expr: Expression): Dictionary<string> {
    if (!isArrowFunctionExpression(expr)) {

        throw new ParseError('expression must be an arrow function', expr)
    }
    const body = expr.body;
    if (!isObjectExpression(body)) {
        throw new ParseError('body of expression must be an object expression', body)
    }

    const result: Dictionary<string> = {};
    for (const prop of body.properties) {
        if (!isObjectProperty(prop)) {
            throw new ParseError('all properties must be an object expression', prop)
        }
        const item = getOrmMapItem(prop);
        result[item.dbSelector] = item.dbSelector;
    }
    return result;
}

function getOrmMapItem(prop: ObjectProperty): OrmMapItem {
    const key = getPropKeyAsString(prop);
    const value = `$${getPropValueAsString(prop)}`;
    return {
        objPath: key,
        dbSelector: value
    }
}

function getPropKeyAsString(node: ObjectProperty): string {
    const propKey = node.key;
    if (!isIdentifier(propKey)) {
        throw new ParseError(`key must be identifier`, propKey)
    }
    throw new NotImplementedError();
}
function getPropValueAsString(node: ObjectProperty): string {
    throw new NotImplementedError();
}
const withTable = (tableName: string) =>{
    return {
        select: (columns: string)=>{
            return {
                where:(predicate: string) =>{
                    `select ${columns} from ${tableName} where ${predicate}`
                },
                all: () =>{
                    return `select ${columns} from ${tableName}`
                }
            }
        }
    }
}

withTable('workorders').select('*').all()