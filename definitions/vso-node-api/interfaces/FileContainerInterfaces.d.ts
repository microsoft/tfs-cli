export declare enum ContainerItemStatus {
    Created = 1,
    PendingUpload = 2,
}
export declare enum ContainerItemType {
    Any = 0,
    Folder = 1,
    File = 2,
}
export declare enum ContainerOptions {
    None = 0,
}
export interface FileContainer {
    artifactUri: string;
    contentLocation: string;
    createdBy: string;
    dateCreated: Date;
    description: string;
    id: number;
    itemLocation: string;
    name: string;
    options: ContainerOptions;
    scopeIdentifier: string;
    securityToken: string;
    signingKeyId: string;
    size: number;
}
export interface FileContainerItem {
    containerId: number;
    contentId: number[];
    contentLocation: string;
    createdBy: string;
    dateCreated: Date;
    dateLastModified: Date;
    fileEncoding: number;
    fileHash: number[];
    fileLength: number;
    fileType: number;
    itemLocation: string;
    itemType: ContainerItemType;
    lastModifiedBy: string;
    path: string;
    scopeIdentifier: string;
    status: ContainerItemStatus;
    ticket: string;
}
export declare var TypeInfo: {
    ContainerItemStatus: {
        enumValues: {
            "created": number;
            "pendingUpload": number;
        };
    };
    ContainerItemType: {
        enumValues: {
            "any": number;
            "folder": number;
            "file": number;
        };
    };
    ContainerOptions: {
        enumValues: {
            "none": number;
        };
    };
    FileContainer: {
        fields: any;
    };
    FileContainerItem: {
        fields: any;
    };
};
