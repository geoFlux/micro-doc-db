// const workorderId = 54321;

// const bind = (param: any) => {
//     return param;
// };
// const func1 = (item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId);
// const func2 = (item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId)&& item.workOrderNumber == 'blah';


// const crewId='this is the crewId'
// // const sqlExpr = parseWhereFunc((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId != bind(workorderId) && (item.workOrderNumber == bind('blah') || item.workOrderNumber == bind('blorp')) && item.crewId==bind(crewId))
// const sqlExpr = parseWhereFunc((item: WorkOrder, bind: <T>(param: T) => T) => item.workOrderId == bind(workorderId) && item.crewId == bind(crewId))
// console.log(sqlExpr.bindParams);
// console.log(sqlNodeToString(sqlExpr.whereExpr))