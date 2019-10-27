import { SourceLocation } from "@babel/types";

export class ParseError extends Error {
    constructor(
        msg: string,
        { start, loc }: { start: number | null, loc: SourceLocation | null }
    ) {
        //todo: better error message, show function, indicate where error is
        const locStr = loc ? `, [${loc.start.line},${loc.start.column}]` : ''
        super(`${msg}${locStr}`);
    }
}
export class NotImplementedError extends Error {
    constructor() { super('not implemented'); }
}