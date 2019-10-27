import {Database as _Database, Statement as _Statement}  from 'sqlite3'

export class Database {
    private db: _Database;
    constructor(filename: string, mode?: number, callback?: (err: Error | null) => void) {
        this.db = new _Database(filename, mode, callback);
        
    }
    
    // prepare(sql: string, ...params: any[]): Statement {
    //     return new Promise<Statement>((resolve, reject) => {
    //         this.db.prepare(sql, params, (stmnt: _Statement, err: any) => {
    //             if(err) reject(err);
    //             else resolve(stmnt);
    //         })
    //     })
    // }
    get<T>(sql: string, ...params: any[]): Promise<T> {
        
        return new Promise((resolve, reject) =>
            this.db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)))
    }
    all<T>(sql: string, ...params: any[]): Promise<T[]> {
        return new Promise((resolve, reject) => 
            this.db.all(sql,params, (err,row) => err ? reject(err): resolve(row) ))
    }
    close(): Promise<void> {
        return new Promise((resolve, reject) =>
            this.db.close((err) => err ? reject(err) : resolve()))
    }
    run(sql: string, ...params: any[]): Promise<void> {
        return new Promise((resolve, reject) =>
            this.db.run(sql, params,(err) => err ? reject(err) : resolve()))
    }

    async transaction(callback: () => Promise<void>) {
        let transactionBegun = false;
        try {
            await this.db.run('BEGIN TRANSACTION')
            transactionBegun = true;
            await callback();
            await this.db.run('COMMIT');
        }
        catch(err) {
            if(transactionBegun)
                await this.db.run('ROLLBACK');
            throw err;
        }
        
    }
    onTrace(listener: (sql: string) => void) {
        this.db.on('trace', listener);
    }
    onProfile(listener: (sql: string) => void) {
        this.db.on('profile', listener);
    }
    onError(listener: (err: Error) => void) {
        this.db.on('error', listener);
    }
}