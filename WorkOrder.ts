
export interface WorkOrder {
    actualStart: Date;
    areTasksPristine: boolean;
    chartOfAccount: ChartOfAccount;
    class: string;
    crewId: string;
    currentStatus: string;
    description: string;
    elevation: number;
    estdur: number;
    failDate: null;
    failureClass: string;
    failureReport: any[];
    glAccount: string;
    hasChildren: boolean;
    hasParent: boolean;
    hasTasks: boolean;
    isPristine: boolean;
    isTask: boolean;
    jobPlan: JobPlan;
    jpNum: string;
    latitude: number;
    location: Location;
    locationId: LocationID;
    lochierarchy: Lochierarchy[];
    longitude: number;
    multiAssetLocation: any[];
    photos: any[];
    priority: number;
    remarkDate: null;
    requiredClearance: string;
    scheduledEnd: Date;
    scheduledStart: Date;
    siteId: string;
    statuses: any[];
    workLocation: string;
    workLogs: any[];
    workOrderId: number;
    workOrderNumber: string;
    workType: string;
    workWeek: string;
    wpLabor: WpLabor[];
}
export interface ChartOfAccount {
    accountName:                 string;
    accountName_LongDescription: string;
    glAccount:                   string;
    orgId:                       string;
    workOrderId:                 number;
}

export interface JobPlan {
    description: string;
    jobplanId:   number;
    jpNum:       string;
    orgId:       string;
    revision:    number;
    status:      Status;
}

export enum Status {
    Active = "ACTIVE",
}

export interface Location {
    area:             string;
    areaDetails:      AreaDetails;
    description:      string;
    locationId:       LocationID;
    physicalLocation: string;
    status:           Status;
    unid:             string;
    workLogs:         any[];
}

export interface AreaDetails {
    description: string;
    domainId:    string;
    value:       string;
}

export enum LocationID {
    S1997 = "S1997",
    S1997C = "S1997-C",
    S1997M = "S1997-M",
    S1997P = "S1997-P",
    The000000000007624 = "000000000007624",
    The000000000010010 = "000000000010010",
    The000000000220868 = "000000000220868",
    The000000300033818 = "000000300033818",
    The000000300038545 = "000000300038545",
    The000000300050680 = "000000300050680",
}

export interface Lochierarchy {
    childLocations: ChildLocations;
    parent:         LocationID;
    path:           LocationID[];
    system:         string;
}

export interface ChildLocations {
    description: string;
    locationId:  string;
    status:      Status;
    unid:        string;
    alias?:      string;
}

export interface WpLabor {
    craft:      string;
    laborhrs:   number;
    laborid:    string;
    quantity:   number;
    skilllevel: string;
}