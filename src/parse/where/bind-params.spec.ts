import { getBindParams } from "./bind-params";
import { WorkOrder } from "../../WorkOrder";
import { equal,throws } from "assert";


describe("getBindParams", () => {
    it('&& with parens', () => {
        const workorderId =1234;
        const crewId = 'crewIdValue'
        const requiredClearance = '14ft'
        const workOrderNumber = '5343'
        const bindParams = getBindParams((item: WorkOrder, bind: <T>(param: T) => T) => 
            item.workOrderId == bind(workorderId) 
            && item.crewId == bind(crewId)
            || (item.requiredClearance == bind(requiredClearance) && item.workOrderNumber == bind(workOrderNumber))
        )
        equal(bindParams[0] , workorderId, `expected ${bindParams[0]} to be ${workorderId}`)
        equal(bindParams[1] , crewId, `expected ${bindParams[1]} to be ${crewId}`)
        equal(bindParams[2] , requiredClearance, `expected ${bindParams[2]} to be ${requiredClearance}`)
        equal(bindParams[3] , workOrderNumber, `expected ${bindParams[3]} to be ${workOrderNumber}`)
    })
        
    it('item.workOrderId == bind(workorderId) && item.crewId == bind(crewId)', () => {
        const workorderId =1234;
        const crewId = 'crewIdValue'
        const bindParams = getBindParams((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId) && item.crewId == bind(crewId))
        equal(bindParams[0] , workorderId, `expected ${bindParams[0]} to be ${workorderId}`)
        equal(bindParams[1] , crewId, `expected ${bindParams[1]} to be ${crewId}`)    
    })
    it("item.workOrderId == bind(workorderId1) || item.workOrderId == bind(workorderId2)", () => {
        const workorderId1 =1234;
        const workorderId2 = 4321
        const bindParams = getBindParams((item: WorkOrder, bind: <T>(param: T) => T) => {
            return item.workOrderId == bind(workorderId1) 
                || item.workOrderId == bind(workorderId2)
        })
        equal(bindParams[0], workorderId1, `expected ${bindParams[0]} to be ${workorderId1}`)
        equal(bindParams[1], workorderId2, `expected ${bindParams[1]} to be ${workorderId2}`)
    });

    it(`item.workOrderId == bind(workorderId1) 
        || item.workOrderId == bind(workorderId2)
        && item.workOrderId != bind(workorderId3)
        || item.workOrderId != bind(workorderId4)`, () => {
        const workorderId1 =1234;
        const workorderId2 = 4321
        const workorderId3 = 2000;
        const workorderId4 = 2001;
        const bindParams = getBindParams((item: WorkOrder, bind: <T>(param: T) => T) => {
            return item.workOrderId > bind(workorderId1) 
                || item.workOrderId < bind(workorderId2)
                && item.workOrderId != bind(workorderId3)
                || item.workOrderId != bind(workorderId4)
        })
        equal(bindParams[0], workorderId1, `expected ${bindParams[0]} to be ${workorderId1}`)
        equal(bindParams[1], workorderId2, `expected ${bindParams[1]} to be ${workorderId2}`)
        equal(bindParams[2], workorderId3, `expected ${bindParams[2]} to be ${workorderId3}`)
        equal(bindParams[3], workorderId4, `expected ${bindParams[3]} to be ${workorderId4}`)

    });
    it(`Should not allow literal values`,() => {        
        throws(() => {
            const workorderId =1234;        
            getBindParams((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId) && item.crewId == '1234')
        })                
    })
    
});