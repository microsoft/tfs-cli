/// <reference path="../node/node.d.ts" />
/// <reference path="../q/Q.d.ts" />
import Q = require('q');
import basem = require('./ClientApiBases');
import VsoBaseInterfaces = require('./interfaces/common/VsoBaseInterfaces');
import TfvcInterfaces = require("./interfaces/TfvcInterfaces");
export interface ITfvcApi extends basem.ClientApiBase {
    getBranch(path: string, project: string, includeParent: boolean, includeChildren: boolean, onResult: (err: any, statusCode: number, Branche: TfvcInterfaces.TfvcBranch) => void): void;
    getBranches(project: string, includeParent: boolean, includeChildren: boolean, includeDeleted: boolean, includeLinks: boolean, onResult: (err: any, statusCode: number, Branches: TfvcInterfaces.TfvcBranch[]) => void): void;
    getBranchRefs(scopePath: string, project: string, includeDeleted: boolean, includeLinks: boolean, onResult: (err: any, statusCode: number, Branches: TfvcInterfaces.TfvcBranchRef[]) => void): void;
    getChangesetChanges(id: number, skip: number, top: number, onResult: (err: any, statusCode: number, ChangesetChanges: TfvcInterfaces.TfvcChange[]) => void): void;
    createChangeset(changeset: TfvcInterfaces.TfvcChangeset, project: string, onResult: (err: any, statusCode: number, Changeset: TfvcInterfaces.TfvcChangesetRef) => void): void;
    getChangeset(id: number, project: string, maxChangeCount: number, includeDetails: boolean, includeWorkItems: boolean, maxCommentLength: number, includeSourceRename: boolean, skip: number, top: number, orderby: string, searchCriteria: TfvcInterfaces.TfvcChangesetSearchCriteria, onResult: (err: any, statusCode: number, Changeset: TfvcInterfaces.TfvcChangeset) => void): void;
    getChangesets(project: string, maxChangeCount: number, includeDetails: boolean, includeWorkItems: boolean, maxCommentLength: number, includeSourceRename: boolean, skip: number, top: number, orderby: string, searchCriteria: TfvcInterfaces.TfvcChangesetSearchCriteria, onResult: (err: any, statusCode: number, Changesets: TfvcInterfaces.TfvcChangesetRef[]) => void): void;
    getBatchedChangesets(changesetsRequestData: TfvcInterfaces.TfvcChangesetsRequestData, onResult: (err: any, statusCode: number, ChangesetsBatch: TfvcInterfaces.TfvcChangesetRef[]) => void): void;
    getChangesetWorkItems(id: number, onResult: (err: any, statusCode: number, ChangesetWorkItems: TfvcInterfaces.AssociatedWorkItem[]) => void): void;
    getItemsBatch(itemRequestData: TfvcInterfaces.TfvcItemRequestData, project: string, onResult: (err: any, statusCode: number, ItemBatch: TfvcInterfaces.TfvcItem[][]) => void): void;
    getItem(path: string, project: string, fileName: string, download: boolean, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, Item: TfvcInterfaces.TfvcItem) => void): void;
    getItemContent(path: string, project: string, fileName: string, download: boolean, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    getItems(project: string, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, includeLinks: boolean, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, Items: TfvcInterfaces.TfvcItem[]) => void): void;
    getItemText(path: string, project: string, fileName: string, download: boolean, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    getItemZip(path: string, project: string, fileName: string, download: boolean, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    getLabelItems(labelId: string, top: number, skip: number, onResult: (err: any, statusCode: number, LabelItems: TfvcInterfaces.TfvcItem[]) => void): void;
    getLabel(labelId: string, requestData: TfvcInterfaces.TfvcLabelRequestData, project: string, onResult: (err: any, statusCode: number, Label: TfvcInterfaces.TfvcLabel) => void): void;
    getLabels(requestData: TfvcInterfaces.TfvcLabelRequestData, project: string, top: number, skip: number, onResult: (err: any, statusCode: number, Labels: TfvcInterfaces.TfvcLabelRef[]) => void): void;
    getProjectInfo(projectId: string, project: string, onResult: (err: any, statusCode: number, ProjectInfo: TfvcInterfaces.VersionControlProjectInfo) => void): void;
    getProjectInfos(project: string, onResult: (err: any, statusCode: number, ProjectInfo: TfvcInterfaces.VersionControlProjectInfo[]) => void): void;
    getShelvesetChanges(shelvesetId: string, top: number, skip: number, onResult: (err: any, statusCode: number, ShelvesetChanges: TfvcInterfaces.TfvcChange[]) => void): void;
    getShelveset(shelvesetId: string, requestData: TfvcInterfaces.TfvcShelvesetRequestData, onResult: (err: any, statusCode: number, Shelveset: TfvcInterfaces.TfvcShelveset) => void): void;
    getShelvesets(requestData: TfvcInterfaces.TfvcShelvesetRequestData, top: number, skip: number, onResult: (err: any, statusCode: number, Shelvesets: TfvcInterfaces.TfvcShelvesetRef[]) => void): void;
    getShelvesetWorkItems(shelvesetId: string, onResult: (err: any, statusCode: number, ShelvesetWorkItems: TfvcInterfaces.AssociatedWorkItem[]) => void): void;
}
export interface IQTfvcApi extends basem.QClientApiBase {
    getBranch(path: string, project?: string, includeParent?: boolean, includeChildren?: boolean): Q.Promise<TfvcInterfaces.TfvcBranch>;
    getBranches(project?: string, includeParent?: boolean, includeChildren?: boolean, includeDeleted?: boolean, includeLinks?: boolean): Q.Promise<TfvcInterfaces.TfvcBranch[]>;
    getBranchRefs(scopePath: string, project?: string, includeDeleted?: boolean, includeLinks?: boolean): Q.Promise<TfvcInterfaces.TfvcBranchRef[]>;
    getChangesetChanges(id?: number, skip?: number, top?: number): Q.Promise<TfvcInterfaces.TfvcChange[]>;
    createChangeset(changeset: TfvcInterfaces.TfvcChangeset, project?: string): Q.Promise<TfvcInterfaces.TfvcChangesetRef>;
    getChangeset(id: number, project?: string, maxChangeCount?: number, includeDetails?: boolean, includeWorkItems?: boolean, maxCommentLength?: number, includeSourceRename?: boolean, skip?: number, top?: number, orderby?: string, searchCriteria?: TfvcInterfaces.TfvcChangesetSearchCriteria): Q.Promise<TfvcInterfaces.TfvcChangeset>;
    getChangesets(project?: string, maxChangeCount?: number, includeDetails?: boolean, includeWorkItems?: boolean, maxCommentLength?: number, includeSourceRename?: boolean, skip?: number, top?: number, orderby?: string, searchCriteria?: TfvcInterfaces.TfvcChangesetSearchCriteria): Q.Promise<TfvcInterfaces.TfvcChangesetRef[]>;
    getBatchedChangesets(changesetsRequestData: TfvcInterfaces.TfvcChangesetsRequestData): Q.Promise<TfvcInterfaces.TfvcChangesetRef[]>;
    getChangesetWorkItems(id?: number): Q.Promise<TfvcInterfaces.AssociatedWorkItem[]>;
    getItemsBatch(itemRequestData: TfvcInterfaces.TfvcItemRequestData, project?: string): Q.Promise<TfvcInterfaces.TfvcItem[][]>;
    getItem(path: string, project?: string, fileName?: string, download?: boolean, scopePath?: string, recursionLevel?: TfvcInterfaces.VersionControlRecursionType, versionDescriptor?: TfvcInterfaces.TfvcVersionDescriptor): Q.Promise<TfvcInterfaces.TfvcItem>;
    getItems(project?: string, scopePath?: string, recursionLevel?: TfvcInterfaces.VersionControlRecursionType, includeLinks?: boolean, versionDescriptor?: TfvcInterfaces.TfvcVersionDescriptor): Q.Promise<TfvcInterfaces.TfvcItem[]>;
    getLabelItems(labelId: string, top?: number, skip?: number): Q.Promise<TfvcInterfaces.TfvcItem[]>;
    getLabel(labelId: string, requestData: TfvcInterfaces.TfvcLabelRequestData, project?: string): Q.Promise<TfvcInterfaces.TfvcLabel>;
    getLabels(requestData: TfvcInterfaces.TfvcLabelRequestData, project?: string, top?: number, skip?: number): Q.Promise<TfvcInterfaces.TfvcLabelRef[]>;
    getProjectInfo(projectId: string, project?: string): Q.Promise<TfvcInterfaces.VersionControlProjectInfo>;
    getProjectInfos(project?: string): Q.Promise<TfvcInterfaces.VersionControlProjectInfo[]>;
    getShelvesetChanges(shelvesetId: string, top?: number, skip?: number): Q.Promise<TfvcInterfaces.TfvcChange[]>;
    getShelveset(shelvesetId: string, requestData: TfvcInterfaces.TfvcShelvesetRequestData): Q.Promise<TfvcInterfaces.TfvcShelveset>;
    getShelvesets(requestData: TfvcInterfaces.TfvcShelvesetRequestData, top?: number, skip?: number): Q.Promise<TfvcInterfaces.TfvcShelvesetRef[]>;
    getShelvesetWorkItems(shelvesetId: string): Q.Promise<TfvcInterfaces.AssociatedWorkItem[]>;
}
export declare class TfvcApi extends basem.ClientApiBase implements ITfvcApi {
    constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[]);
    getBranch(path: string, project: string, includeParent: boolean, includeChildren: boolean, onResult: (err: any, statusCode: number, Branche: TfvcInterfaces.TfvcBranch) => void): void;
    getBranches(project: string, includeParent: boolean, includeChildren: boolean, includeDeleted: boolean, includeLinks: boolean, onResult: (err: any, statusCode: number, Branches: TfvcInterfaces.TfvcBranch[]) => void): void;
    getBranchRefs(scopePath: string, project: string, includeDeleted: boolean, includeLinks: boolean, onResult: (err: any, statusCode: number, Branches: TfvcInterfaces.TfvcBranchRef[]) => void): void;
    getChangesetChanges(id: number, skip: number, top: number, onResult: (err: any, statusCode: number, ChangesetChanges: TfvcInterfaces.TfvcChange[]) => void): void;
    createChangeset(changeset: TfvcInterfaces.TfvcChangeset, project: string, onResult: (err: any, statusCode: number, Changeset: TfvcInterfaces.TfvcChangesetRef) => void): void;
    getChangeset(id: number, project: string, maxChangeCount: number, includeDetails: boolean, includeWorkItems: boolean, maxCommentLength: number, includeSourceRename: boolean, skip: number, top: number, orderby: string, searchCriteria: TfvcInterfaces.TfvcChangesetSearchCriteria, onResult: (err: any, statusCode: number, Changeset: TfvcInterfaces.TfvcChangeset) => void): void;
    getChangesets(project: string, maxChangeCount: number, includeDetails: boolean, includeWorkItems: boolean, maxCommentLength: number, includeSourceRename: boolean, skip: number, top: number, orderby: string, searchCriteria: TfvcInterfaces.TfvcChangesetSearchCriteria, onResult: (err: any, statusCode: number, Changesets: TfvcInterfaces.TfvcChangesetRef[]) => void): void;
    getBatchedChangesets(changesetsRequestData: TfvcInterfaces.TfvcChangesetsRequestData, onResult: (err: any, statusCode: number, ChangesetsBatch: TfvcInterfaces.TfvcChangesetRef[]) => void): void;
    getChangesetWorkItems(id: number, onResult: (err: any, statusCode: number, ChangesetWorkItems: TfvcInterfaces.AssociatedWorkItem[]) => void): void;
    getItemsBatch(itemRequestData: TfvcInterfaces.TfvcItemRequestData, project: string, onResult: (err: any, statusCode: number, ItemBatch: TfvcInterfaces.TfvcItem[][]) => void): void;
    getItem(path: string, project: string, fileName: string, download: boolean, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, Item: TfvcInterfaces.TfvcItem) => void): void;
    getItemContent(path: string, project: string, fileName: string, download: boolean, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    getItems(project: string, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, includeLinks: boolean, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, Items: TfvcInterfaces.TfvcItem[]) => void): void;
    getItemText(path: string, project: string, fileName: string, download: boolean, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    getItemZip(path: string, project: string, fileName: string, download: boolean, scopePath: string, recursionLevel: TfvcInterfaces.VersionControlRecursionType, versionDescriptor: TfvcInterfaces.TfvcVersionDescriptor, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    getLabelItems(labelId: string, top: number, skip: number, onResult: (err: any, statusCode: number, LabelItems: TfvcInterfaces.TfvcItem[]) => void): void;
    getLabel(labelId: string, requestData: TfvcInterfaces.TfvcLabelRequestData, project: string, onResult: (err: any, statusCode: number, Label: TfvcInterfaces.TfvcLabel) => void): void;
    getLabels(requestData: TfvcInterfaces.TfvcLabelRequestData, project: string, top: number, skip: number, onResult: (err: any, statusCode: number, Labels: TfvcInterfaces.TfvcLabelRef[]) => void): void;
    getProjectInfo(projectId: string, project: string, onResult: (err: any, statusCode: number, ProjectInfo: TfvcInterfaces.VersionControlProjectInfo) => void): void;
    getProjectInfos(project: string, onResult: (err: any, statusCode: number, ProjectInfo: TfvcInterfaces.VersionControlProjectInfo[]) => void): void;
    getShelvesetChanges(shelvesetId: string, top: number, skip: number, onResult: (err: any, statusCode: number, ShelvesetChanges: TfvcInterfaces.TfvcChange[]) => void): void;
    getShelveset(shelvesetId: string, requestData: TfvcInterfaces.TfvcShelvesetRequestData, onResult: (err: any, statusCode: number, Shelveset: TfvcInterfaces.TfvcShelveset) => void): void;
    getShelvesets(requestData: TfvcInterfaces.TfvcShelvesetRequestData, top: number, skip: number, onResult: (err: any, statusCode: number, Shelvesets: TfvcInterfaces.TfvcShelvesetRef[]) => void): void;
    getShelvesetWorkItems(shelvesetId: string, onResult: (err: any, statusCode: number, ShelvesetWorkItems: TfvcInterfaces.AssociatedWorkItem[]) => void): void;
}
export declare class QTfvcApi extends basem.QClientApiBase implements IQTfvcApi {
    api: TfvcApi;
    constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[]);
    getBranch(path: string, project?: string, includeParent?: boolean, includeChildren?: boolean): Q.Promise<TfvcInterfaces.TfvcBranch>;
    getBranches(project?: string, includeParent?: boolean, includeChildren?: boolean, includeDeleted?: boolean, includeLinks?: boolean): Q.Promise<TfvcInterfaces.TfvcBranch[]>;
    getBranchRefs(scopePath: string, project?: string, includeDeleted?: boolean, includeLinks?: boolean): Q.Promise<TfvcInterfaces.TfvcBranchRef[]>;
    getChangesetChanges(id?: number, skip?: number, top?: number): Q.Promise<TfvcInterfaces.TfvcChange[]>;
    createChangeset(changeset: TfvcInterfaces.TfvcChangeset, project?: string): Q.Promise<TfvcInterfaces.TfvcChangesetRef>;
    getChangeset(id: number, project?: string, maxChangeCount?: number, includeDetails?: boolean, includeWorkItems?: boolean, maxCommentLength?: number, includeSourceRename?: boolean, skip?: number, top?: number, orderby?: string, searchCriteria?: TfvcInterfaces.TfvcChangesetSearchCriteria): Q.Promise<TfvcInterfaces.TfvcChangeset>;
    getChangesets(project?: string, maxChangeCount?: number, includeDetails?: boolean, includeWorkItems?: boolean, maxCommentLength?: number, includeSourceRename?: boolean, skip?: number, top?: number, orderby?: string, searchCriteria?: TfvcInterfaces.TfvcChangesetSearchCriteria): Q.Promise<TfvcInterfaces.TfvcChangesetRef[]>;
    getBatchedChangesets(changesetsRequestData: TfvcInterfaces.TfvcChangesetsRequestData): Q.Promise<TfvcInterfaces.TfvcChangesetRef[]>;
    getChangesetWorkItems(id?: number): Q.Promise<TfvcInterfaces.AssociatedWorkItem[]>;
    getItemsBatch(itemRequestData: TfvcInterfaces.TfvcItemRequestData, project?: string): Q.Promise<TfvcInterfaces.TfvcItem[][]>;
    getItem(path: string, project?: string, fileName?: string, download?: boolean, scopePath?: string, recursionLevel?: TfvcInterfaces.VersionControlRecursionType, versionDescriptor?: TfvcInterfaces.TfvcVersionDescriptor): Q.Promise<TfvcInterfaces.TfvcItem>;
    getItems(project?: string, scopePath?: string, recursionLevel?: TfvcInterfaces.VersionControlRecursionType, includeLinks?: boolean, versionDescriptor?: TfvcInterfaces.TfvcVersionDescriptor): Q.Promise<TfvcInterfaces.TfvcItem[]>;
    getLabelItems(labelId: string, top?: number, skip?: number): Q.Promise<TfvcInterfaces.TfvcItem[]>;
    getLabel(labelId: string, requestData: TfvcInterfaces.TfvcLabelRequestData, project?: string): Q.Promise<TfvcInterfaces.TfvcLabel>;
    getLabels(requestData: TfvcInterfaces.TfvcLabelRequestData, project?: string, top?: number, skip?: number): Q.Promise<TfvcInterfaces.TfvcLabelRef[]>;
    getProjectInfo(projectId: string, project?: string): Q.Promise<TfvcInterfaces.VersionControlProjectInfo>;
    getProjectInfos(project?: string): Q.Promise<TfvcInterfaces.VersionControlProjectInfo[]>;
    getShelvesetChanges(shelvesetId: string, top?: number, skip?: number): Q.Promise<TfvcInterfaces.TfvcChange[]>;
    getShelveset(shelvesetId: string, requestData: TfvcInterfaces.TfvcShelvesetRequestData): Q.Promise<TfvcInterfaces.TfvcShelveset>;
    getShelvesets(requestData: TfvcInterfaces.TfvcShelvesetRequestData, top?: number, skip?: number): Q.Promise<TfvcInterfaces.TfvcShelvesetRef[]>;
    getShelvesetWorkItems(shelvesetId: string): Q.Promise<TfvcInterfaces.AssociatedWorkItem[]>;
}
