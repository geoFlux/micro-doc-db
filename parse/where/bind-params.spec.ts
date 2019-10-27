import { getBindParams } from "./bind-params";
import { WorkOrder } from "../../WorkOrder";

function assert(assertion: boolean, msg: string) {
    if(!assertion)
        throw Error(msg)
}
const test1 = () =>{
    
    const workorderId =1234;
    const crewId = 'crewIdValue'
    const bindParams = getBindParams((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId) && item.crewId == bind(crewId))
    assert(bindParams[0] === workorderId, `expected ${bindParams[0]} to be ${workorderId}`)
    assert(bindParams[1] === crewId, `expected ${bindParams[1]} to be ${crewId}`)
}

const test2 = () => {
    const workorderId =1234;
    const crewId = 'crewIdValue'
    const requiredClearance = '14ft'
    const workOrderNumber = '5343'
    const bindParams = getBindParams((item: WorkOrder, bind: <T>(param: T) => T) => 
        item.workOrderId == bind(workorderId) 
        && item.crewId == bind(crewId)
        || (item.requiredClearance == bind(requiredClearance) && item.workOrderNumber == bind(workOrderNumber))
    )
    assert(bindParams[0] === workorderId, `expected ${bindParams[0]} to be ${workorderId}`)
    assert(bindParams[1] === crewId, `expected ${bindParams[1]} to be ${crewId}`)
    assert(bindParams[2] === requiredClearance, `expected ${bindParams[2]} to be ${requiredClearance}`)
    assert(bindParams[3] === workOrderNumber, `expected ${bindParams[3]} to be ${workOrderNumber}`)
}
// test1();
test2();
console.log('tests ok')