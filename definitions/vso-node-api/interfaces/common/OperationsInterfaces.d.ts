export interface OperationReference {
    id: string;
    status: OperationStatus;
    url: string;
}
export declare enum OperationStatus {
    NotSet = 0,
    Queued = 1,
    InProgress = 2,
    Cancelled = 3,
    Succeeded = 4,
    Failed = 5,
}
export declare var TypeInfo: {
    OperationReference: {
        fields: any;
    };
    OperationStatus: {
        enumValues: {
            "notSet": number;
            "queued": number;
            "inProgress": number;
            "cancelled": number;
            "succeeded": number;
            "failed": number;
        };
    };
};
