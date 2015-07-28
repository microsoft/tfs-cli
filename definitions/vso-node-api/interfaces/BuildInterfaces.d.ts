import TfsInterfaces = require("../interfaces/common/TfsInterfaces");
import VSSInterfaces = require("../interfaces/common/VSSInterfaces");
export interface AgentPoolQueue extends ShallowReference {
    _links: any;
    pool: TaskAgentPoolReference;
}
export declare enum AgentStatus {
    Unavailable = 0,
    Available = 1,
    Offline = 2,
}
export interface ArtifactResource {
    data: string;
    downloadUrl: string;
    type: string;
    url: string;
}
export declare enum AuditAction {
    Add = 1,
    Update = 2,
    Delete = 3,
}
export interface Build {
    _links: any;
    buildNumber: string;
    controller: BuildController;
    definition: DefinitionReference;
    deleted: boolean;
    demands: any[];
    finishTime: Date;
    id: number;
    keepForever: boolean;
    lastChangedBy: VSSInterfaces.IdentityRef;
    lastChangedDate: Date;
    logs: BuildLogReference;
    orchestrationPlan: TaskOrchestrationPlanReference;
    parameters: string;
    priority: QueuePriority;
    project: TfsInterfaces.TeamProjectReference;
    properties: any;
    quality: string;
    queue: AgentPoolQueue;
    queueOptions: QueueOptions;
    queuePosition: number;
    queueTime: Date;
    reason: BuildReason;
    repository: BuildRepository;
    requestedBy: VSSInterfaces.IdentityRef;
    requestedFor: VSSInterfaces.IdentityRef;
    result: BuildResult;
    sourceBranch: string;
    sourceVersion: string;
    startTime: Date;
    status: BuildStatus;
    tags: string[];
    uri: string;
    url: string;
    validationResults: BuildRequestValidationResult[];
}
export interface BuildAgent {
    buildDirectory: string;
    controller: ShallowReference;
    createdDate: Date;
    description: string;
    enabled: boolean;
    id: number;
    messageQueueUrl: string;
    name: string;
    reservedForBuild: string;
    server: ShallowReference;
    status: AgentStatus;
    statusMessage: string;
    updatedDate: Date;
    uri: string;
    url: string;
}
export interface BuildArtifact {
    id: number;
    name: string;
    resource: ArtifactResource;
}
export declare enum BuildAuthorizationScope {
    ProjectCollection = 1,
    Project = 2,
}
export interface BuildCompletedEvent extends BuildUpdatedEvent {
}
export interface BuildController extends ShallowReference {
    _links: any;
    createdDate: Date;
    description: string;
    enabled: boolean;
    status: ControllerStatus;
    updatedDate: Date;
    uri: string;
}
export interface BuildDefinition extends BuildDefinitionReference {
    _links: any;
    badgeEnabled: boolean;
    build: BuildDefinitionStep[];
    buildNumberFormat: string;
    comment: string;
    createdDate: Date;
    demands: any[];
    description: string;
    dropLocation: string;
    jobAuthorizationScope: BuildAuthorizationScope;
    jobTimeoutInMinutes: number;
    options: BuildOption[];
    properties: any;
    repository: BuildRepository;
    retentionRules: RetentionPolicy[];
    triggers: BuildTrigger[];
    variables: {
        [key: string]: BuildDefinitionVariable;
    };
}
export interface BuildDefinitionChangedEvent {
    changeType: AuditAction;
    definition: BuildDefinition;
}
export interface BuildDefinitionChangingEvent {
    changeType: AuditAction;
    newDefinition: BuildDefinition;
    originalDefinition: BuildDefinition;
}
export interface BuildDefinitionReference extends DefinitionReference {
    authoredBy: VSSInterfaces.IdentityRef;
    draftOf: DefinitionReference;
    quality: DefinitionQuality;
    queue: AgentPoolQueue;
}
export interface BuildDefinitionRevision {
    changedBy: VSSInterfaces.IdentityRef;
    changedDate: Date;
    changeType: AuditAction;
    comment: string;
    definitionUrl: string;
    name: string;
    revision: number;
}
export interface BuildDefinitionSourceProvider {
    definitionUri: string;
    fields: {
        [key: string]: string;
    };
    id: number;
    lastModified: Date;
    name: string;
    supportedTriggerTypes: DefinitionTriggerType;
}
export interface BuildDefinitionStep {
    alwaysRun: boolean;
    continueOnError: boolean;
    displayName: string;
    enabled: boolean;
    inputs: {
        [key: string]: string;
    };
    task: TaskDefinitionReference;
}
export interface BuildDefinitionTemplate {
    canDelete: boolean;
    category: string;
    description: string;
    iconTaskId: string;
    id: string;
    name: string;
    template: BuildDefinition;
}
export interface BuildDefinitionVariable {
    allowOverride: boolean;
    isSecret: boolean;
    value: string;
}
export interface BuildDeletedEvent extends RealtimeBuildEvent {
    build: Build;
}
export interface BuildDeployment {
    deployment: BuildSummary;
    sourceBuild: ShallowReference;
}
export interface BuildLog extends BuildLogReference {
    createdOn: Date;
    lastChangedOn: Date;
    lineCount: number;
}
export interface BuildLogReference {
    id: number;
    type: string;
    url: string;
}
export interface BuildOption {
    definition: BuildOptionDefinitionReference;
    enabled: boolean;
    inputs: {
        [key: string]: string;
    };
}
export interface BuildOptionDefinition extends BuildOptionDefinitionReference {
    description: string;
    groups: BuildOptionGroupDefinition[];
    inputs: BuildOptionInputDefinition[];
    name: string;
    ordinal: number;
}
export interface BuildOptionDefinitionReference {
    id: string;
}
export interface BuildOptionGroupDefinition {
    displayName: string;
    isExpanded: boolean;
    name: string;
}
export interface BuildOptionInputDefinition {
    defaultValue: string;
    groupName: string;
    help: {
        [key: string]: string;
    };
    label: string;
    name: string;
    options: {
        [key: string]: string;
    };
    required: boolean;
    type: BuildOptionInputType;
    visibleRule: string;
}
export declare enum BuildOptionInputType {
    String = 0,
    Boolean = 1,
    StringList = 2,
    Radio = 3,
    PickList = 4,
    MultiLine = 5,
}
export declare enum BuildPhaseStatus {
    Unknown = 0,
    Failed = 1,
    Succeeded = 2,
}
export interface BuildProcessTemplate {
    description: string;
    fileExists: boolean;
    id: number;
    parameters: string;
    serverPath: string;
    supportedReasons: BuildReason;
    teamProject: string;
    templateType: ProcessTemplateType;
    url: string;
    version: string;
}
export declare enum BuildQueryOrder {
    FinishTimeAscending = 2,
    FinishTimeDescending = 3,
}
export declare enum BuildReason {
    None = 0,
    Manual = 1,
    IndividualCI = 2,
    BatchedCI = 4,
    Schedule = 8,
    UserCreated = 32,
    ValidateShelveset = 64,
    CheckInShelveset = 128,
    Triggered = 175,
    All = 239,
}
export interface BuildRepository {
    checkoutSubmodules: boolean;
    clean: string;
    defaultBranch: string;
    id: string;
    name: string;
    properties: {
        [key: string]: string;
    };
    rootFolder: string;
    type: string;
    url: string;
}
export interface BuildRequestValidationResult {
    message: string;
    result: ValidationResult;
}
export declare enum BuildResult {
    None = 0,
    Succeeded = 2,
    PartiallySucceeded = 4,
    Failed = 8,
    Canceled = 32,
}
export interface BuildServer {
    agents: ShallowReference[];
    controller: ShallowReference;
    id: number;
    isVirtual: boolean;
    messageQueueUrl: string;
    name: string;
    requireClientCertificates: boolean;
    status: ServiceHostStatus;
    statusChangedDate: Date;
    uri: string;
    url: string;
    version: number;
}
export interface BuildSettings {
    defaultRetentionPolicy: RetentionPolicy;
    maximumRetentionPolicy: RetentionPolicy;
}
export interface BuildStartedEvent extends BuildUpdatedEvent {
}
export declare enum BuildStatus {
    None = 0,
    InProgress = 1,
    Completed = 2,
    Cancelling = 4,
    Postponed = 8,
    NotStarted = 32,
    All = 47,
}
export interface BuildSummary {
    build: ShallowReference;
    finishTime: Date;
    keepForever: boolean;
    quality: string;
    reason: BuildReason;
    requestedFor: VSSInterfaces.IdentityRef;
    startTime: Date;
    status: BuildStatus;
}
export interface BuildTrigger {
    triggerType: DefinitionTriggerType;
}
export interface BuildUpdatedEvent extends RealtimeBuildEvent {
    build: Build;
}
export interface BuildWorkspace {
    mappings: MappingDetails[];
}
export interface Change {
    author: VSSInterfaces.IdentityRef;
    displayUri: string;
    id: string;
    location: string;
    message: string;
    messageTruncated: boolean;
    timestamp: Date;
    type: string;
}
export interface ConsoleLogEvent extends RealtimeBuildEvent {
    lines: string[];
    timelineId: string;
    timelineRecordId: string;
}
export interface ContinuousDeploymentDefinition {
    connectedService: TfsInterfaces.WebApiConnectedServiceRef;
    definition: ShallowReference;
    gitBranch: string;
    hostedServiceName: string;
    project: TfsInterfaces.TeamProjectReference;
    repositoryId: string;
    storageAccountName: string;
    subscriptionId: string;
    website: string;
    webspace: string;
}
export interface ContinuousIntegrationTrigger extends BuildTrigger {
    batchChanges: boolean;
    branchFilters: string[];
}
export declare enum ControllerStatus {
    Unavailable = 0,
    Available = 1,
    Offline = 2,
}
export declare enum DefinitionQuality {
    Definition = 1,
    Draft = 2,
}
export declare enum DefinitionQueueStatus {
    Enabled = 0,
    Paused = 1,
    Disabled = 2,
}
export interface DefinitionReference extends ShallowReference {
    project: TfsInterfaces.TeamProjectReference;
    queueStatus: DefinitionQueueStatus;
    revision: number;
    type: DefinitionType;
    uri: string;
}
export declare enum DefinitionTriggerType {
    None = 1,
    ContinuousIntegration = 2,
    BatchedContinuousIntegration = 4,
    Schedule = 8,
    GatedCheckIn = 16,
    BatchedGatedCheckIn = 32,
    All = 63,
}
export declare enum DefinitionType {
    Xaml = 1,
    Build = 2,
}
export declare enum DeleteOptions {
    None = 0,
    DropLocation = 1,
    TestResults = 2,
    Label = 4,
    Details = 8,
    Symbols = 16,
    All = 31,
}
export interface Deployment {
    type: string;
}
export interface DeploymentBuild extends Deployment {
    buildId: number;
}
export interface DeploymentDeploy extends Deployment {
    message: string;
}
export interface DeploymentTest extends Deployment {
    runId: number;
}
export declare enum GetOption {
    LatestOnQueue = 0,
    LatestOnBuild = 1,
    Custom = 2,
}
export interface InformationNode {
    fields: {
        [key: string]: string;
    };
    lastModifiedBy: string;
    lastModifiedDate: Date;
    nodeId: number;
    parentId: number;
    type: string;
}
export interface Issue {
    category: string;
    data: {
        [key: string]: string;
    };
    message: string;
    type: IssueType;
}
export declare enum IssueType {
    Error = 1,
    Warning = 2,
}
export interface MappingDetails {
    mappingType: string;
    serverPath: string;
}
export declare enum ProcessTemplateType {
    Custom = 0,
    Default = 1,
    Upgrade = 2,
}
export interface PropertyValue {
    changedBy: string;
    changedDate: Date;
    propertyName: string;
    value: any;
}
export declare enum QueryDeletedOption {
    ExcludeDeleted = 0,
    IncludeDeleted = 1,
    OnlyDeleted = 2,
}
export declare enum QueueOptions {
    None = 0,
    DoNotRun = 1,
}
export declare enum QueuePriority {
    Low = 5,
    BelowNormal = 4,
    Normal = 3,
    AboveNormal = 2,
    High = 1,
}
export interface RealtimeBuildEvent {
    buildId: number;
}
export interface RequestReference {
    id: number;
    requestedFor: VSSInterfaces.IdentityRef;
    url: string;
}
export interface RetentionPolicy {
    branches: string[];
    daysToKeep: number;
    deleteBuildRecord: boolean;
}
export interface Schedule {
    branchFilters: string[];
    daysToBuild: ScheduleDays;
    scheduleJobId: string;
    startHours: number;
    startMinutes: number;
    timeZoneId: string;
}
export declare enum ScheduleDays {
    None = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 4,
    Thursday = 8,
    Friday = 16,
    Saturday = 32,
    Sunday = 64,
    All = 127,
}
export interface ScheduleTrigger extends BuildTrigger {
    schedules: Schedule[];
}
export declare enum ServiceHostStatus {
    Online = 1,
    Offline = 2,
}
export interface ShallowReference {
    id: number;
    name: string;
    url: string;
}
export interface TaskAgentPoolReference {
    id: number;
    name: string;
}
export interface TaskDefinitionReference {
    id: string;
    versionSpec: string;
}
export interface TaskOrchestrationPlanReference {
    planId: string;
}
export declare enum TaskResult {
    Succeeded = 0,
    SucceededWithIssues = 1,
    Failed = 2,
    Canceled = 3,
    Skipped = 4,
    Abandoned = 5,
}
export interface Timeline extends TimelineReference {
    lastChangedBy: string;
    lastChangedOn: Date;
    records: TimelineRecord[];
}
export interface TimelineRecord {
    _links: any;
    changeId: number;
    currentOperation: string;
    details: TimelineReference;
    errorCount: number;
    finishTime: Date;
    id: string;
    issues: Issue[];
    lastModified: Date;
    log: BuildLogReference;
    name: string;
    order: number;
    parentId: string;
    percentComplete: number;
    result: TaskResult;
    resultCode: string;
    startTime: Date;
    state: TimelineRecordState;
    type: string;
    url: string;
    warningCount: number;
    workerName: string;
}
export declare enum TimelineRecordState {
    Pending = 0,
    InProgress = 1,
    Completed = 2,
}
export interface TimelineRecordsUpdatedEvent extends RealtimeBuildEvent {
    timelineRecords: TimelineRecord[];
}
export interface TimelineReference {
    changeId: number;
    id: string;
    url: string;
}
export declare enum ValidationResult {
    OK = 0,
    Warning = 1,
    Error = 2,
}
export interface WorkspaceMapping {
    definitionUri: string;
    depth: number;
    localItem: string;
    mappingType: WorkspaceMappingType;
    serverItem: string;
    workspaceId: number;
}
export declare enum WorkspaceMappingType {
    Map = 0,
    Cloak = 1,
}
export interface WorkspaceTemplate {
    definitionUri: string;
    lastModifiedBy: string;
    lastModifiedDate: Date;
    mappings: WorkspaceMapping[];
    workspaceId: number;
}
export interface XamlBuildDefinition extends DefinitionReference {
    _links: any;
    batchSize: number;
    buildArgs: string;
    continuousIntegrationQuietPeriod: number;
    controller: BuildController;
    createdOn: Date;
    defaultDropLocation: string;
    description: string;
    lastBuild: ShallowReference;
    repository: BuildRepository;
    supportedReasons: BuildReason;
    triggerType: DefinitionTriggerType;
}
export declare var TypeInfo: {
    AgentPoolQueue: {
        fields: any;
    };
    AgentStatus: {
        enumValues: {
            "unavailable": number;
            "available": number;
            "offline": number;
        };
    };
    ArtifactResource: {
        fields: any;
    };
    AuditAction: {
        enumValues: {
            "add": number;
            "update": number;
            "delete": number;
        };
    };
    Build: {
        fields: any;
    };
    BuildAgent: {
        fields: any;
    };
    BuildArtifact: {
        fields: any;
    };
    BuildAuthorizationScope: {
        enumValues: {
            "projectCollection": number;
            "project": number;
        };
    };
    BuildCompletedEvent: {
        fields: any;
    };
    BuildController: {
        fields: any;
    };
    BuildDefinition: {
        fields: any;
    };
    BuildDefinitionChangedEvent: {
        fields: any;
    };
    BuildDefinitionChangingEvent: {
        fields: any;
    };
    BuildDefinitionReference: {
        fields: any;
    };
    BuildDefinitionRevision: {
        fields: any;
    };
    BuildDefinitionSourceProvider: {
        fields: any;
    };
    BuildDefinitionStep: {
        fields: any;
    };
    BuildDefinitionTemplate: {
        fields: any;
    };
    BuildDefinitionVariable: {
        fields: any;
    };
    BuildDeletedEvent: {
        fields: any;
    };
    BuildDeployment: {
        fields: any;
    };
    BuildLog: {
        fields: any;
    };
    BuildLogReference: {
        fields: any;
    };
    BuildOption: {
        fields: any;
    };
    BuildOptionDefinition: {
        fields: any;
    };
    BuildOptionDefinitionReference: {
        fields: any;
    };
    BuildOptionGroupDefinition: {
        fields: any;
    };
    BuildOptionInputDefinition: {
        fields: any;
    };
    BuildOptionInputType: {
        enumValues: {
            "string": number;
            "boolean": number;
            "stringList": number;
            "radio": number;
            "pickList": number;
            "multiLine": number;
        };
    };
    BuildPhaseStatus: {
        enumValues: {
            "unknown": number;
            "failed": number;
            "succeeded": number;
        };
    };
    BuildProcessTemplate: {
        fields: any;
    };
    BuildQueryOrder: {
        enumValues: {
            "finishTimeAscending": number;
            "finishTimeDescending": number;
        };
    };
    BuildReason: {
        enumValues: {
            "none": number;
            "manual": number;
            "individualCI": number;
            "batchedCI": number;
            "schedule": number;
            "userCreated": number;
            "validateShelveset": number;
            "checkInShelveset": number;
            "triggered": number;
            "all": number;
        };
    };
    BuildRepository: {
        fields: any;
    };
    BuildRequestValidationResult: {
        fields: any;
    };
    BuildResult: {
        enumValues: {
            "none": number;
            "succeeded": number;
            "partiallySucceeded": number;
            "failed": number;
            "canceled": number;
        };
    };
    BuildServer: {
        fields: any;
    };
    BuildSettings: {
        fields: any;
    };
    BuildStartedEvent: {
        fields: any;
    };
    BuildStatus: {
        enumValues: {
            "none": number;
            "inProgress": number;
            "completed": number;
            "cancelling": number;
            "postponed": number;
            "notStarted": number;
            "all": number;
        };
    };
    BuildSummary: {
        fields: any;
    };
    BuildTrigger: {
        fields: any;
    };
    BuildUpdatedEvent: {
        fields: any;
    };
    BuildWorkspace: {
        fields: any;
    };
    Change: {
        fields: any;
    };
    ConsoleLogEvent: {
        fields: any;
    };
    ContinuousDeploymentDefinition: {
        fields: any;
    };
    ContinuousIntegrationTrigger: {
        fields: any;
    };
    ControllerStatus: {
        enumValues: {
            "unavailable": number;
            "available": number;
            "offline": number;
        };
    };
    DefinitionQuality: {
        enumValues: {
            "definition": number;
            "draft": number;
        };
    };
    DefinitionQueueStatus: {
        enumValues: {
            "enabled": number;
            "paused": number;
            "disabled": number;
        };
    };
    DefinitionReference: {
        fields: any;
    };
    DefinitionTriggerType: {
        enumValues: {
            "none": number;
            "continuousIntegration": number;
            "batchedContinuousIntegration": number;
            "schedule": number;
            "gatedCheckIn": number;
            "batchedGatedCheckIn": number;
            "all": number;
        };
    };
    DefinitionType: {
        enumValues: {
            "xaml": number;
            "build": number;
        };
    };
    DeleteOptions: {
        enumValues: {
            "none": number;
            "dropLocation": number;
            "testResults": number;
            "label": number;
            "details": number;
            "symbols": number;
            "all": number;
        };
    };
    Deployment: {
        fields: any;
    };
    DeploymentBuild: {
        fields: any;
    };
    DeploymentDeploy: {
        fields: any;
    };
    DeploymentTest: {
        fields: any;
    };
    GetOption: {
        enumValues: {
            "latestOnQueue": number;
            "latestOnBuild": number;
            "custom": number;
        };
    };
    InformationNode: {
        fields: any;
    };
    Issue: {
        fields: any;
    };
    IssueType: {
        enumValues: {
            "error": number;
            "warning": number;
        };
    };
    MappingDetails: {
        fields: any;
    };
    ProcessTemplateType: {
        enumValues: {
            "custom": number;
            "default": number;
            "upgrade": number;
        };
    };
    PropertyValue: {
        fields: any;
    };
    QueryDeletedOption: {
        enumValues: {
            "excludeDeleted": number;
            "includeDeleted": number;
            "onlyDeleted": number;
        };
    };
    QueueOptions: {
        enumValues: {
            "none": number;
            "doNotRun": number;
        };
    };
    QueuePriority: {
        enumValues: {
            "low": number;
            "belowNormal": number;
            "normal": number;
            "aboveNormal": number;
            "high": number;
        };
    };
    RealtimeBuildEvent: {
        fields: any;
    };
    RequestReference: {
        fields: any;
    };
    RetentionPolicy: {
        fields: any;
    };
    Schedule: {
        fields: any;
    };
    ScheduleDays: {
        enumValues: {
            "none": number;
            "monday": number;
            "tuesday": number;
            "wednesday": number;
            "thursday": number;
            "friday": number;
            "saturday": number;
            "sunday": number;
            "all": number;
        };
    };
    ScheduleTrigger: {
        fields: any;
    };
    ServiceHostStatus: {
        enumValues: {
            "online": number;
            "offline": number;
        };
    };
    ShallowReference: {
        fields: any;
    };
    TaskAgentPoolReference: {
        fields: any;
    };
    TaskDefinitionReference: {
        fields: any;
    };
    TaskOrchestrationPlanReference: {
        fields: any;
    };
    TaskResult: {
        enumValues: {
            "succeeded": number;
            "succeededWithIssues": number;
            "failed": number;
            "canceled": number;
            "skipped": number;
            "abandoned": number;
        };
    };
    Timeline: {
        fields: any;
    };
    TimelineRecord: {
        fields: any;
    };
    TimelineRecordState: {
        enumValues: {
            "pending": number;
            "inProgress": number;
            "completed": number;
        };
    };
    TimelineRecordsUpdatedEvent: {
        fields: any;
    };
    TimelineReference: {
        fields: any;
    };
    ValidationResult: {
        enumValues: {
            "oK": number;
            "warning": number;
            "error": number;
        };
    };
    WorkspaceMapping: {
        fields: any;
    };
    WorkspaceMappingType: {
        enumValues: {
            "map": number;
            "cloak": number;
        };
    };
    WorkspaceTemplate: {
        fields: any;
    };
    XamlBuildDefinition: {
        fields: any;
    };
};
