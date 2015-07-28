import TfsInterfaces = require("../interfaces/common/TfsInterfaces");
import VSSInterfaces = require("../interfaces/common/VSSInterfaces");
export interface AssociatedWorkItem {
    assignedTo: string;
    id: number;
    state: string;
    title: string;
    url: string;
    webUrl: string;
    workItemType: string;
}
export interface Change<T> {
    changeType: VersionControlChangeType;
    item: T;
    newContent: ItemContent;
    sourceServerItem: string;
    url: string;
}
export interface ChangeCountDictionary {
}
export interface ChangeList<T> {
    allChangesIncluded: boolean;
    changeCounts: {
        [key: number]: number;
    };
    changes: Change<T>[];
    comment: string;
    commentTruncated: boolean;
    creationDate: Date;
    notes: CheckinNote[];
    owner: string;
    ownerDisplayName: string;
    ownerId: string;
    sortDate: Date;
    version: string;
}
export interface ChangeListSearchCriteria {
    compareVersion: string;
    excludeDeletes: boolean;
    followRenames: boolean;
    fromDate: string;
    fromVersion: string;
    itemPath: string;
    itemVersion: string;
    skip: number;
    toDate: string;
    top: number;
    toVersion: string;
    user: string;
}
export interface CheckinNote {
    name: string;
    value: string;
}
export interface FileContentMetadata {
    contentType: string;
    encoding: number;
    extension: string;
    fileName: string;
    isBinary: boolean;
    isImage: boolean;
    vsLink: string;
}
export interface GitBaseVersionDescriptor extends GitVersionDescriptor {
    baseVersion: string;
    baseVersionOptions: GitVersionOptions;
    baseVersionType: GitVersionType;
}
export interface GitBlobRef {
    _links: any;
    objectId: string;
    size: number;
    url: string;
}
export interface GitBranchStats {
    aheadCount: number;
    behindCount: number;
    commit: GitCommitRef;
    isBaseVersion: boolean;
    name: string;
}
export interface GitChange extends Change<GitItem> {
}
export interface GitCommit extends GitCommitRef {
    push: GitPushRef;
    treeId: string;
}
export interface GitCommitChanges {
    changeCounts: ChangeCountDictionary;
    changes: GitChange[];
}
export interface GitCommitDiffs {
    aheadCount: number;
    allChangesIncluded: boolean;
    behindCount: number;
    changeCounts: {
        [key: number]: number;
    };
    changes: GitChange[];
    commonCommit: string;
}
export interface GitCommitRef {
    _links: any;
    author: GitUserDate;
    changeCounts: ChangeCountDictionary;
    changes: GitChange[];
    comment: string;
    commentTruncated: boolean;
    commitId: string;
    committer: GitUserDate;
    parents: string[];
    remoteUrl: string;
    url: string;
}
export interface GitCommitToCreate {
    baseRef: GitRef;
    comment: string;
    pathActions: GitPathAction[];
}
export interface GitHistoryQueryResults extends HistoryQueryResults<GitItem> {
    startingCommitId: string;
    unpopulatedCount: number;
    unprocessedCount: number;
}
export interface GitItem extends ItemModel {
    commitId: string;
    gitObjectType: GitObjectType;
    latestProcessedChange: GitCommitRef;
    objectId: string;
}
export interface GitItemDescriptor {
    path: string;
    recursionLevel: VersionControlRecursionType;
    version: string;
    versionOptions: GitVersionOptions;
    versionType: GitVersionType;
}
export interface GitItemRequestData {
    includeContentMetadata: boolean;
    includeLinks: boolean;
    itemDescriptors: GitItemDescriptor[];
    latestProcessedChange: boolean;
}
export interface GitMediaObjectRef {
    _links: any;
    id: string;
    oid: string;
    size: number;
    url: string;
}
export declare enum GitObjectType {
    Bad = 0,
    Commit = 1,
    Tree = 2,
    Blob = 3,
    Tag = 4,
    Ext2 = 5,
    OfsDelta = 6,
    RefDelta = 7,
}
export interface GitPathAction {
    action: GitPathActions;
    base64Content: string;
    path: string;
    rawTextContent: string;
    targetPath: string;
}
export declare enum GitPathActions {
    None = 0,
    Edit = 1,
    Delete = 2,
    Add = 3,
    Rename = 4,
}
export interface GitPullRequest {
    _links: any;
    closedDate: Date;
    codeReviewId: number;
    createdBy: VSSInterfaces.IdentityRef;
    creationDate: Date;
    description: string;
    lastMergeCommit: GitCommitRef;
    lastMergeSourceCommit: GitCommitRef;
    lastMergeTargetCommit: GitCommitRef;
    mergeId: string;
    mergeStatus: PullRequestAsyncStatus;
    pullRequestId: number;
    remoteUrl: string;
    repository: GitRepository;
    reviewers: IdentityRefWithVote[];
    sourceRefName: string;
    status: PullRequestStatus;
    targetRefName: string;
    title: string;
    upgraded: boolean;
    url: string;
}
export interface GitPullRequestSearchCriteria {
    creatorId: string;
    includeLinks: boolean;
    repositoryId: string;
    reviewerId: string;
    sourceRefName: string;
    status: PullRequestStatus;
    targetRefName: string;
}
export interface GitPush extends GitPushRef {
    commits: GitCommitRef[];
    refUpdates: GitRefUpdate[];
    repository: GitRepository;
}
export interface GitPushEventData {
    afterId: string;
    beforeId: string;
    branch: string;
    commits: GitCommit[];
    repository: GitRepository;
}
export interface GitPushRef {
    _links: any;
    date: Date;
    pushCorrelationId: string;
    pushedBy: VSSInterfaces.IdentityRef;
    pushId: number;
    url: string;
}
export interface GitPushSearchCriteria {
    fromDate: Date;
    includeLinks: boolean;
    includeRefUpdates: boolean;
    pusherId: string;
    refName: string;
    toDate: Date;
}
export interface GitQueryCommitsCriteria {
    $skip: number;
    $top: number;
    author: string;
    compareVersion: GitVersionDescriptor;
    excludeDeletes: boolean;
    fromCommitId: string;
    fromDate: string;
    ids: string[];
    includeLinks: boolean;
    itemPath: string;
    itemVersion: GitVersionDescriptor;
    toCommitId: string;
    toDate: string;
    user: string;
}
export interface GitRef {
    _links: any;
    isLockedBy: VSSInterfaces.IdentityRef;
    name: string;
    objectId: string;
    url: string;
}
export interface GitRefUpdate {
    name: string;
    newObjectId: string;
    oldObjectId: string;
    repositoryId: string;
}
export declare enum GitRefUpdateMode {
    BestEffort = 0,
    AllOrNone = 1,
}
export interface GitRefUpdateResult {
    customMessage: string;
    name: string;
    newObjectId: string;
    oldObjectId: string;
    rejectedBy: string;
    repositoryId: string;
    success: boolean;
    updateStatus: GitRefUpdateStatus;
}
export interface GitRefUpdateResultSet {
    countFailed: number;
    countSucceeded: number;
    pushCorrelationId: string;
    pushIds: {
        [key: number]: number;
    };
    pushTime: Date;
    results: GitRefUpdateResult[];
}
export declare enum GitRefUpdateStatus {
    Succeeded = 0,
    ForcePushRequired = 1,
    StaleOldObjectId = 2,
    InvalidRefName = 3,
    Unprocessed = 4,
    UnresolvableToCommit = 5,
    WritePermissionRequired = 6,
    ManageNotePermissionRequired = 7,
    CreateBranchPermissionRequired = 8,
    CreateTagPermissionRequired = 9,
    RejectedByPlugin = 10,
    Locked = 11,
    RefNameConflict = 12,
    RejectedByPolicy = 13,
    SucceededNonExistentRef = 14,
    SucceededCorruptRef = 15,
}
export interface GitRepository {
    _links: any;
    defaultBranch: string;
    id: string;
    name: string;
    project: TfsInterfaces.TeamProjectReference;
    remoteUrl: string;
    url: string;
}
export declare enum GitRepositoryPermissions {
    None = 0,
    Administer = 1,
    GenericRead = 2,
    GenericContribute = 4,
    ForcePush = 8,
    CreateBranch = 16,
    CreateTag = 32,
    ManageNote = 64,
    PolicyExempt = 128,
    All = 255,
    BranchLevelPermissions = 141,
}
export interface GitTargetVersionDescriptor extends GitVersionDescriptor {
    targetVersion: string;
    targetVersionOptions: GitVersionOptions;
    targetVersionType: GitVersionType;
}
export interface GitTreeEntryRef {
    gitObjectType: GitObjectType;
    mode: string;
    objectId: string;
    relativePath: string;
    size: number;
    url: string;
}
export interface GitTreeRef {
    _links: any;
    objectId: string;
    size: number;
    treeEntries: GitTreeEntryRef[];
    url: string;
}
export interface GitUserDate {
    date: Date;
    email: string;
    name: string;
}
export interface GitVersionDescriptor {
    version: string;
    versionOptions: GitVersionOptions;
    versionType: GitVersionType;
}
export declare enum GitVersionOptions {
    None = 0,
    PreviousChange = 1,
    FirstParent = 2,
}
export declare enum GitVersionType {
    Branch = 0,
    Tag = 1,
    Commit = 2,
    Index = 3,
}
export interface HistoryEntry<T> {
    changeList: ChangeList<T>;
    itemChangeType: VersionControlChangeType;
    serverItem: string;
}
export interface HistoryQueryResults<T> {
    moreResultsAvailable: boolean;
    results: HistoryEntry<T>[];
}
export interface IdentityRefWithVote extends VSSInterfaces.IdentityRef {
    isRequired: boolean;
    reviewerUrl: string;
    vote: number;
    votedFor: IdentityRefWithVote[];
}
export interface IncludedGitCommit {
    commitId: string;
    commitTime: Date;
    parentCommitIds: string[];
    repositoryId: string;
}
export interface ItemContent {
    content: string;
    contentType: ItemContentType;
}
export declare enum ItemContentType {
    RawText = 0,
    Base64Encoded = 1,
}
export interface ItemDetailsOptions {
    includeContentMetadata: boolean;
    recursionLevel: VersionControlRecursionType;
}
export interface ItemModel {
    _links: any;
    contentMetadata: FileContentMetadata;
    isFolder: boolean;
    isSymLink: boolean;
    path: string;
    url: string;
}
export declare enum PullRequestAsyncStatus {
    NotSet = 0,
    Queued = 1,
    Conflicts = 2,
    Succeeded = 3,
    RejectedByPolicy = 4,
    Failure = 5,
}
export declare enum PullRequestStatus {
    NotSet = 0,
    Active = 1,
    Abandoned = 2,
    Completed = 3,
}
export interface TfvcBranch extends TfvcBranchRef {
    children: TfvcBranch[];
    mappings: TfvcBranchMapping[];
    parent: TfvcShallowBranchRef;
    relatedBranches: TfvcShallowBranchRef[];
}
export interface TfvcBranchMapping {
    depth: string;
    serverItem: string;
    type: string;
}
export interface TfvcBranchRef extends TfvcShallowBranchRef {
    _links: any;
    createdDate: Date;
    description: string;
    isDeleted: boolean;
    owner: VSSInterfaces.IdentityRef;
    url: string;
}
export interface TfvcChange extends Change<TfvcItem> {
    mergeSources: TfvcMergeSource[];
    pendingVersion: number;
}
export interface TfvcChangeset extends TfvcChangesetRef {
    accountId: string;
    changes: TfvcChange[];
    checkinNotes: CheckinNote[];
    collectionId: string;
    hasMoreChanges: boolean;
    policyOverride: TfvcPolicyOverrideInfo;
    workItems: AssociatedWorkItem[];
}
export interface TfvcChangesetRef {
    _links: any;
    author: VSSInterfaces.IdentityRef;
    changesetId: number;
    checkedInBy: VSSInterfaces.IdentityRef;
    comment: string;
    commentTruncated: boolean;
    createdDate: Date;
    url: string;
}
export interface TfvcChangesetSearchCriteria {
    author: string;
    followRenames: boolean;
    fromDate: string;
    fromId: number;
    includeLinks: boolean;
    path: string;
    toDate: string;
    toId: number;
}
export interface TfvcChangesetsRequestData {
    changesetIds: number[];
    commentLength: number;
    includeLinks: boolean;
}
export interface TfvcCheckinEventData {
    changeset: TfvcChangeset;
    project: TfsInterfaces.TeamProjectReference;
}
export interface TfvcHistoryEntry extends HistoryEntry<TfvcItem> {
    encoding: number;
    fileId: number;
}
export interface TfvcItem extends ItemModel {
    changeDate: Date;
    deletionId: number;
    isBranch: boolean;
    isPendingChange: boolean;
    version: number;
}
export interface TfvcItemDescriptor {
    path: string;
    recursionLevel: VersionControlRecursionType;
    version: string;
    versionOption: TfvcVersionOption;
    versionType: TfvcVersionType;
}
export interface TfvcItemRequestData {
    includeContentMetadata: boolean;
    includeLinks: boolean;
    itemDescriptors: TfvcItemDescriptor[];
}
export interface TfvcLabel extends TfvcLabelRef {
    items: TfvcItem[];
}
export interface TfvcLabelRef {
    _links: any;
    description: string;
    id: number;
    labelScope: string;
    modifiedDate: Date;
    name: string;
    owner: VSSInterfaces.IdentityRef;
    url: string;
}
export interface TfvcLabelRequestData {
    includeLinks: boolean;
    itemLabelFilter: string;
    labelScope: string;
    maxItemCount: number;
    name: string;
    owner: string;
}
export interface TfvcMergeSource {
    isRename: boolean;
    serverItem: string;
    versionFrom: number;
    versionTo: number;
}
export interface TfvcPolicyFailureInfo {
    message: string;
    policyName: string;
}
export interface TfvcPolicyOverrideInfo {
    comment: string;
    policyFailures: TfvcPolicyFailureInfo[];
}
export interface TfvcShallowBranchRef {
    path: string;
}
export interface TfvcShelveset extends TfvcShelvesetRef {
    changes: TfvcChange[];
    notes: CheckinNote[];
    policyOverride: TfvcPolicyOverrideInfo;
    workItems: AssociatedWorkItem[];
}
export interface TfvcShelvesetRef {
    _links: any;
    comment: string;
    commentTruncated: boolean;
    createdDate: Date;
    id: string;
    name: string;
    owner: VSSInterfaces.IdentityRef;
    url: string;
}
export interface TfvcShelvesetRequestData {
    includeDetails: boolean;
    includeLinks: boolean;
    includeWorkItems: boolean;
    maxChangeCount: number;
    maxCommentLength: number;
    name: string;
    owner: string;
}
export interface TfvcVersionDescriptor {
    version: string;
    versionOption: TfvcVersionOption;
    versionType: TfvcVersionType;
}
export declare enum TfvcVersionOption {
    None = 0,
    Previous = 1,
    UseRename = 2,
}
export declare enum TfvcVersionType {
    None = 0,
    Changeset = 1,
    Shelveset = 2,
    Change = 3,
    Date = 4,
    Latest = 5,
    Tip = 6,
    MergeSource = 7,
}
export interface UpdateRefsRequest {
    refUpdateRequests: GitRefUpdate[];
    updateMode: GitRefUpdateMode;
}
export declare enum VersionControlChangeType {
    None = 0,
    Add = 1,
    Edit = 2,
    Encoding = 4,
    Rename = 8,
    Delete = 16,
    Undelete = 32,
    Branch = 64,
    Merge = 128,
    Lock = 256,
    Rollback = 512,
    SourceRename = 1024,
    TargetRename = 2048,
    Property = 4096,
    All = 8191,
}
export interface VersionControlProjectInfo {
    project: TfsInterfaces.TeamProjectReference;
    supportsGit: boolean;
    supportsTFVC: boolean;
}
export declare enum VersionControlRecursionType {
    None = 0,
    OneLevel = 1,
    Full = 120,
}
export declare var TypeInfo: {
    AssociatedWorkItem: {
        fields: any;
    };
    Change: {
        fields: any;
    };
    ChangeCountDictionary: {
        fields: any;
    };
    ChangeList: {
        fields: any;
    };
    ChangeListSearchCriteria: {
        fields: any;
    };
    CheckinNote: {
        fields: any;
    };
    FileContentMetadata: {
        fields: any;
    };
    GitBaseVersionDescriptor: {
        fields: any;
    };
    GitBlobRef: {
        fields: any;
    };
    GitBranchStats: {
        fields: any;
    };
    GitChange: {
        fields: any;
    };
    GitCommit: {
        fields: any;
    };
    GitCommitChanges: {
        fields: any;
    };
    GitCommitDiffs: {
        fields: any;
    };
    GitCommitRef: {
        fields: any;
    };
    GitCommitToCreate: {
        fields: any;
    };
    GitHistoryQueryResults: {
        fields: any;
    };
    GitItem: {
        fields: any;
    };
    GitItemDescriptor: {
        fields: any;
    };
    GitItemRequestData: {
        fields: any;
    };
    GitMediaObjectRef: {
        fields: any;
    };
    GitObjectType: {
        enumValues: {
            "bad": number;
            "commit": number;
            "tree": number;
            "blob": number;
            "tag": number;
            "ext2": number;
            "ofsDelta": number;
            "refDelta": number;
        };
    };
    GitPathAction: {
        fields: any;
    };
    GitPathActions: {
        enumValues: {
            "none": number;
            "edit": number;
            "delete": number;
            "add": number;
            "rename": number;
        };
    };
    GitPullRequest: {
        fields: any;
    };
    GitPullRequestSearchCriteria: {
        fields: any;
    };
    GitPush: {
        fields: any;
    };
    GitPushEventData: {
        fields: any;
    };
    GitPushRef: {
        fields: any;
    };
    GitPushSearchCriteria: {
        fields: any;
    };
    GitQueryCommitsCriteria: {
        fields: any;
    };
    GitRef: {
        fields: any;
    };
    GitRefUpdate: {
        fields: any;
    };
    GitRefUpdateMode: {
        enumValues: {
            "bestEffort": number;
            "allOrNone": number;
        };
    };
    GitRefUpdateResult: {
        fields: any;
    };
    GitRefUpdateResultSet: {
        fields: any;
    };
    GitRefUpdateStatus: {
        enumValues: {
            "succeeded": number;
            "forcePushRequired": number;
            "staleOldObjectId": number;
            "invalidRefName": number;
            "unprocessed": number;
            "unresolvableToCommit": number;
            "writePermissionRequired": number;
            "manageNotePermissionRequired": number;
            "createBranchPermissionRequired": number;
            "createTagPermissionRequired": number;
            "rejectedByPlugin": number;
            "locked": number;
            "refNameConflict": number;
            "rejectedByPolicy": number;
            "succeededNonExistentRef": number;
            "succeededCorruptRef": number;
        };
    };
    GitRepository: {
        fields: any;
    };
    GitRepositoryPermissions: {
        enumValues: {
            "none": number;
            "administer": number;
            "genericRead": number;
            "genericContribute": number;
            "forcePush": number;
            "createBranch": number;
            "createTag": number;
            "manageNote": number;
            "policyExempt": number;
            "all": number;
            "branchLevelPermissions": number;
        };
    };
    GitTargetVersionDescriptor: {
        fields: any;
    };
    GitTreeEntryRef: {
        fields: any;
    };
    GitTreeRef: {
        fields: any;
    };
    GitUserDate: {
        fields: any;
    };
    GitVersionDescriptor: {
        fields: any;
    };
    GitVersionOptions: {
        enumValues: {
            "none": number;
            "previousChange": number;
            "firstParent": number;
        };
    };
    GitVersionType: {
        enumValues: {
            "branch": number;
            "tag": number;
            "commit": number;
            "index": number;
        };
    };
    HistoryEntry: {
        fields: any;
    };
    HistoryQueryResults: {
        fields: any;
    };
    IdentityRefWithVote: {
        fields: any;
    };
    IncludedGitCommit: {
        fields: any;
    };
    ItemContent: {
        fields: any;
    };
    ItemContentType: {
        enumValues: {
            "rawText": number;
            "base64Encoded": number;
        };
    };
    ItemDetailsOptions: {
        fields: any;
    };
    ItemModel: {
        fields: any;
    };
    PullRequestAsyncStatus: {
        enumValues: {
            "notSet": number;
            "queued": number;
            "conflicts": number;
            "succeeded": number;
            "rejectedByPolicy": number;
            "failure": number;
        };
    };
    PullRequestStatus: {
        enumValues: {
            "notSet": number;
            "active": number;
            "abandoned": number;
            "completed": number;
        };
    };
    TfvcBranch: {
        fields: any;
    };
    TfvcBranchMapping: {
        fields: any;
    };
    TfvcBranchRef: {
        fields: any;
    };
    TfvcChange: {
        fields: any;
    };
    TfvcChangeset: {
        fields: any;
    };
    TfvcChangesetRef: {
        fields: any;
    };
    TfvcChangesetSearchCriteria: {
        fields: any;
    };
    TfvcChangesetsRequestData: {
        fields: any;
    };
    TfvcCheckinEventData: {
        fields: any;
    };
    TfvcHistoryEntry: {
        fields: any;
    };
    TfvcItem: {
        fields: any;
    };
    TfvcItemDescriptor: {
        fields: any;
    };
    TfvcItemRequestData: {
        fields: any;
    };
    TfvcLabel: {
        fields: any;
    };
    TfvcLabelRef: {
        fields: any;
    };
    TfvcLabelRequestData: {
        fields: any;
    };
    TfvcMergeSource: {
        fields: any;
    };
    TfvcPolicyFailureInfo: {
        fields: any;
    };
    TfvcPolicyOverrideInfo: {
        fields: any;
    };
    TfvcShallowBranchRef: {
        fields: any;
    };
    TfvcShelveset: {
        fields: any;
    };
    TfvcShelvesetRef: {
        fields: any;
    };
    TfvcShelvesetRequestData: {
        fields: any;
    };
    TfvcVersionDescriptor: {
        fields: any;
    };
    TfvcVersionOption: {
        enumValues: {
            "none": number;
            "previous": number;
            "useRename": number;
        };
    };
    TfvcVersionType: {
        enumValues: {
            "none": number;
            "changeset": number;
            "shelveset": number;
            "change": number;
            "date": number;
            "latest": number;
            "tip": number;
            "mergeSource": number;
        };
    };
    UpdateRefsRequest: {
        fields: any;
    };
    VersionControlChangeType: {
        enumValues: {
            "none": number;
            "add": number;
            "edit": number;
            "encoding": number;
            "rename": number;
            "delete": number;
            "undelete": number;
            "branch": number;
            "merge": number;
            "lock": number;
            "rollback": number;
            "sourceRename": number;
            "targetRename": number;
            "property": number;
            "all": number;
        };
    };
    VersionControlProjectInfo: {
        fields: any;
    };
    VersionControlRecursionType: {
        enumValues: {
            "none": number;
            "oneLevel": number;
            "full": number;
        };
    };
};
