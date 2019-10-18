import {parseSelectFunc} from './parse/select';
interface blah {
    id: number,
    name: string,
    address: {
        line1: string,
        line2: string,
        zipcode: string,
        extra: {
            line3: string
            line4: string
        }
    }
}

// const parseResult = parseSelectFunc((item: blah) => ({
//     id: item.id,
//     userName: item.name,
//     myExtra: {
//         myLines: item.address.extra.line4,
//         evenMoreStuff: {
//             anotherLine: item.address.extra.line3
//         }
//     }
// }))
const parseResult = parseSelectFunc(function(item: blah) {    
        return {
            id: item.id,
            userName: item.name,
            myExtra: {
                myLines: item.address.extra.line4,
                evenMoreStuff: {
                    anotherLine: item.address.extra.line3
                }
            }
        };
    }
)
console.log(parseResult);