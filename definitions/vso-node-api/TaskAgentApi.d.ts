/// <reference path="../node/node.d.ts" />
/// <reference path="../q/Q.d.ts" />
import Q = require('q');
import basem = require('./ClientApiBases');
import VsoBaseInterfaces = require('./interfaces/common/VsoBaseInterfaces');
import TaskAgentInterfaces = require("./interfaces/TaskAgentInterfaces");
import VSSInterfaces = require("./interfaces/common/VSSInterfaces");
export interface ITaskAgentApi extends basem.ClientApiBase {
    createAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, onResult: (err: any, statusCode: number, agent: TaskAgentInterfaces.TaskAgent) => void): void;
    deleteAgent(poolId: number, agentId: number, onResult: (err: any, statusCode: number) => void): void;
    getAgent(poolId: number, agentId: number, includeCapabilities: boolean, propertyFilters: string, onResult: (err: any, statusCode: number, agent: TaskAgentInterfaces.TaskAgent) => void): void;
    getAgents(poolId: number, agentName: string, includeCapabilities: boolean, propertyFilters: string, demands: string, onResult: (err: any, statusCode: number, agents: TaskAgentInterfaces.TaskAgent[]) => void): void;
    replaceAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, agentId: number, onResult: (err: any, statusCode: number, agent: TaskAgentInterfaces.TaskAgent) => void): void;
    updateAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, agentId: number, onResult: (err: any, statusCode: number, agent: TaskAgentInterfaces.TaskAgent) => void): void;
    queryEndpoint(endpoint: TaskAgentInterfaces.TaskDefinitionEndpoint, onResult: (err: any, statusCode: number, endpoint: string[]) => void): void;
    deleteRequest(poolId: number, requestId: number, lockToken: string, onResult: (err: any, statusCode: number) => void): void;
    getRequest(poolId: number, requestId: number, onResult: (err: any, statusCode: number, jobrequest: TaskAgentInterfaces.TaskAgentJobRequest) => void): void;
    queueRequest(request: TaskAgentInterfaces.TaskAgentJobRequest, poolId: number, onResult: (err: any, statusCode: number, jobrequest: TaskAgentInterfaces.TaskAgentJobRequest) => void): void;
    updateRequest(request: TaskAgentInterfaces.TaskAgentJobRequest, poolId: number, requestId: number, lockToken: string, onResult: (err: any, statusCode: number, jobrequest: TaskAgentInterfaces.TaskAgentJobRequest) => void): void;
    deleteMessage(poolId: number, messageId: number, sessionId: string, onResult: (err: any, statusCode: number) => void): void;
    getMessage(poolId: number, sessionId: string, lastMessageId: number, onResult: (err: any, statusCode: number, message: TaskAgentInterfaces.TaskAgentMessage) => void): void;
    refreshAgent(poolId: number, agentId: number, onResult: (err: any, statusCode: number) => void): void;
    refreshAgents(poolId: number, onResult: (err: any, statusCode: number) => void): void;
    sendMessage(message: TaskAgentInterfaces.TaskAgentMessage, poolId: number, requestId: number, onResult: (err: any, statusCode: number) => void): void;
    createPool(pool: TaskAgentInterfaces.TaskAgentPool, onResult: (err: any, statusCode: number, pool: TaskAgentInterfaces.TaskAgentPool) => void): void;
    deletePool(poolId: number, onResult: (err: any, statusCode: number) => void): void;
    getPool(poolId: number, properties: string, onResult: (err: any, statusCode: number, pool: TaskAgentInterfaces.TaskAgentPool) => void): void;
    getPools(poolName: string, properties: string, onResult: (err: any, statusCode: number, pools: TaskAgentInterfaces.TaskAgentPool[]) => void): void;
    updatePool(pool: TaskAgentInterfaces.TaskAgentPool, poolId: number, onResult: (err: any, statusCode: number, pool: TaskAgentInterfaces.TaskAgentPool) => void): void;
    getAgentPoolRoles(poolId: number, onResult: (err: any, statusCode: number, roles: VSSInterfaces.IdentityRef[]) => void): void;
    createServiceEndpoint(endpoint: TaskAgentInterfaces.ServiceEndpoint, scopeIdentifier: string, endpointId: string, onResult: (err: any, statusCode: number, serviceendpoint: TaskAgentInterfaces.ServiceEndpoint) => void): void;
    deleteServiceEndpoint(scopeIdentifier: string, endpointId: string, onResult: (err: any, statusCode: number) => void): void;
    getServiceEndpointDetails(scopeIdentifier: string, endpointId: string, onResult: (err: any, statusCode: number, serviceendpoint: TaskAgentInterfaces.ServiceEndpoint) => void): void;
    getServiceEndpoints(scopeIdentifier: string, type: string, onResult: (err: any, statusCode: number, serviceendpoints: TaskAgentInterfaces.ServiceEndpoint[]) => void): void;
    createSession(session: TaskAgentInterfaces.TaskAgentSession, poolId: number, onResult: (err: any, statusCode: number, session: TaskAgentInterfaces.TaskAgentSession) => void): void;
    deleteSession(poolId: number, sessionId: string, onResult: (err: any, statusCode: number) => void): void;
    deleteTaskDefinition(taskId: string, onResult: (err: any, statusCode: number) => void): void;
    getTaskContent(taskId: string, versionString: string, onResult: (err: any, statusCode: number, tasks: TaskAgentInterfaces.TaskDefinition[]) => void): void;
    getTaskContentZip(taskId: string, versionString: string, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    getTaskDefinitions(visibility: string[], onResult: (err: any, statusCode: number, tasks: TaskAgentInterfaces.TaskDefinition[]) => void): void;
    uploadTaskDefinition(taskId: string, overwrite: boolean, onResult: (err: any, statusCode: number) => void): void;
    updateUserCapabilities(userCapabilities: {
        [key: string]: string;
    }, poolId: number, agentId: number, onResult: (err: any, statusCode: number, usercapabilitie: TaskAgentInterfaces.TaskAgent) => void): void;
}
export interface IQTaskAgentApi extends basem.QClientApiBase {
    createAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number): Q.Promise<TaskAgentInterfaces.TaskAgent>;
    getAgent(poolId: number, agentId: number, includeCapabilities?: boolean, propertyFilters?: string): Q.Promise<TaskAgentInterfaces.TaskAgent>;
    getAgents(poolId: number, agentName?: string, includeCapabilities?: boolean, propertyFilters?: string, demands?: string): Q.Promise<TaskAgentInterfaces.TaskAgent[]>;
    replaceAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, agentId: number): Q.Promise<TaskAgentInterfaces.TaskAgent>;
    updateAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, agentId: number): Q.Promise<TaskAgentInterfaces.TaskAgent>;
    queryEndpoint(endpoint: TaskAgentInterfaces.TaskDefinitionEndpoint): Q.Promise<string[]>;
    getRequest(poolId: number, requestId: number): Q.Promise<TaskAgentInterfaces.TaskAgentJobRequest>;
    queueRequest(request: TaskAgentInterfaces.TaskAgentJobRequest, poolId: number): Q.Promise<TaskAgentInterfaces.TaskAgentJobRequest>;
    updateRequest(request: TaskAgentInterfaces.TaskAgentJobRequest, poolId: number, requestId: number, lockToken: string): Q.Promise<TaskAgentInterfaces.TaskAgentJobRequest>;
    getMessage(poolId: number, sessionId: string, lastMessageId?: number): Q.Promise<TaskAgentInterfaces.TaskAgentMessage>;
    createPool(pool: TaskAgentInterfaces.TaskAgentPool): Q.Promise<TaskAgentInterfaces.TaskAgentPool>;
    getPool(poolId: number, properties?: string): Q.Promise<TaskAgentInterfaces.TaskAgentPool>;
    getPools(poolName?: string, properties?: string): Q.Promise<TaskAgentInterfaces.TaskAgentPool[]>;
    updatePool(pool: TaskAgentInterfaces.TaskAgentPool, poolId: number): Q.Promise<TaskAgentInterfaces.TaskAgentPool>;
    getAgentPoolRoles(poolId?: number): Q.Promise<VSSInterfaces.IdentityRef[]>;
    createServiceEndpoint(endpoint: TaskAgentInterfaces.ServiceEndpoint, scopeIdentifier: string, endpointId: string): Q.Promise<TaskAgentInterfaces.ServiceEndpoint>;
    getServiceEndpointDetails(scopeIdentifier: string, endpointId: string): Q.Promise<TaskAgentInterfaces.ServiceEndpoint>;
    getServiceEndpoints(scopeIdentifier: string, type?: string): Q.Promise<TaskAgentInterfaces.ServiceEndpoint[]>;
    createSession(session: TaskAgentInterfaces.TaskAgentSession, poolId: number): Q.Promise<TaskAgentInterfaces.TaskAgentSession>;
    getTaskContent(taskId: string, versionString?: string): Q.Promise<TaskAgentInterfaces.TaskDefinition[]>;
    getTaskDefinitions(visibility: string[]): Q.Promise<TaskAgentInterfaces.TaskDefinition[]>;
    updateUserCapabilities(userCapabilities: {
        [key: string]: string;
    }, poolId: number, agentId: number): Q.Promise<TaskAgentInterfaces.TaskAgent>;
}
export declare class TaskAgentApi extends basem.ClientApiBase implements ITaskAgentApi {
    constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[]);
    createAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, onResult: (err: any, statusCode: number, agent: TaskAgentInterfaces.TaskAgent) => void): void;
    deleteAgent(poolId: number, agentId: number, onResult: (err: any, statusCode: number) => void): void;
    getAgent(poolId: number, agentId: number, includeCapabilities: boolean, propertyFilters: string, onResult: (err: any, statusCode: number, agent: TaskAgentInterfaces.TaskAgent) => void): void;
    getAgents(poolId: number, agentName: string, includeCapabilities: boolean, propertyFilters: string, demands: string, onResult: (err: any, statusCode: number, agents: TaskAgentInterfaces.TaskAgent[]) => void): void;
    replaceAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, agentId: number, onResult: (err: any, statusCode: number, agent: TaskAgentInterfaces.TaskAgent) => void): void;
    updateAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, agentId: number, onResult: (err: any, statusCode: number, agent: TaskAgentInterfaces.TaskAgent) => void): void;
    queryEndpoint(endpoint: TaskAgentInterfaces.TaskDefinitionEndpoint, onResult: (err: any, statusCode: number, endpoint: string[]) => void): void;
    deleteRequest(poolId: number, requestId: number, lockToken: string, onResult: (err: any, statusCode: number) => void): void;
    getRequest(poolId: number, requestId: number, onResult: (err: any, statusCode: number, jobrequest: TaskAgentInterfaces.TaskAgentJobRequest) => void): void;
    queueRequest(request: TaskAgentInterfaces.TaskAgentJobRequest, poolId: number, onResult: (err: any, statusCode: number, jobrequest: TaskAgentInterfaces.TaskAgentJobRequest) => void): void;
    updateRequest(request: TaskAgentInterfaces.TaskAgentJobRequest, poolId: number, requestId: number, lockToken: string, onResult: (err: any, statusCode: number, jobrequest: TaskAgentInterfaces.TaskAgentJobRequest) => void): void;
    deleteMessage(poolId: number, messageId: number, sessionId: string, onResult: (err: any, statusCode: number) => void): void;
    getMessage(poolId: number, sessionId: string, lastMessageId: number, onResult: (err: any, statusCode: number, message: TaskAgentInterfaces.TaskAgentMessage) => void): void;
    refreshAgent(poolId: number, agentId: number, onResult: (err: any, statusCode: number) => void): void;
    refreshAgents(poolId: number, onResult: (err: any, statusCode: number) => void): void;
    sendMessage(message: TaskAgentInterfaces.TaskAgentMessage, poolId: number, requestId: number, onResult: (err: any, statusCode: number) => void): void;
    createPool(pool: TaskAgentInterfaces.TaskAgentPool, onResult: (err: any, statusCode: number, pool: TaskAgentInterfaces.TaskAgentPool) => void): void;
    deletePool(poolId: number, onResult: (err: any, statusCode: number) => void): void;
    getPool(poolId: number, properties: string, onResult: (err: any, statusCode: number, pool: TaskAgentInterfaces.TaskAgentPool) => void): void;
    getPools(poolName: string, properties: string, onResult: (err: any, statusCode: number, pools: TaskAgentInterfaces.TaskAgentPool[]) => void): void;
    updatePool(pool: TaskAgentInterfaces.TaskAgentPool, poolId: number, onResult: (err: any, statusCode: number, pool: TaskAgentInterfaces.TaskAgentPool) => void): void;
    getAgentPoolRoles(poolId: number, onResult: (err: any, statusCode: number, roles: VSSInterfaces.IdentityRef[]) => void): void;
    createServiceEndpoint(endpoint: TaskAgentInterfaces.ServiceEndpoint, scopeIdentifier: string, endpointId: string, onResult: (err: any, statusCode: number, serviceendpoint: TaskAgentInterfaces.ServiceEndpoint) => void): void;
    deleteServiceEndpoint(scopeIdentifier: string, endpointId: string, onResult: (err: any, statusCode: number) => void): void;
    getServiceEndpointDetails(scopeIdentifier: string, endpointId: string, onResult: (err: any, statusCode: number, serviceendpoint: TaskAgentInterfaces.ServiceEndpoint) => void): void;
    getServiceEndpoints(scopeIdentifier: string, type: string, onResult: (err: any, statusCode: number, serviceendpoints: TaskAgentInterfaces.ServiceEndpoint[]) => void): void;
    createSession(session: TaskAgentInterfaces.TaskAgentSession, poolId: number, onResult: (err: any, statusCode: number, session: TaskAgentInterfaces.TaskAgentSession) => void): void;
    deleteSession(poolId: number, sessionId: string, onResult: (err: any, statusCode: number) => void): void;
    deleteTaskDefinition(taskId: string, onResult: (err: any, statusCode: number) => void): void;
    getTaskContent(taskId: string, versionString: string, onResult: (err: any, statusCode: number, tasks: TaskAgentInterfaces.TaskDefinition[]) => void): void;
    getTaskContentZip(taskId: string, versionString: string, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    getTaskDefinitions(visibility: string[], onResult: (err: any, statusCode: number, tasks: TaskAgentInterfaces.TaskDefinition[]) => void): void;
    uploadTaskDefinition(taskId: string, overwrite: boolean, onResult: (err: any, statusCode: number) => void): void;
    updateUserCapabilities(userCapabilities: {
        [key: string]: string;
    }, poolId: number, agentId: number, onResult: (err: any, statusCode: number, usercapabilitie: TaskAgentInterfaces.TaskAgent) => void): void;
}
export declare class QTaskAgentApi extends basem.QClientApiBase implements IQTaskAgentApi {
    api: TaskAgentApi;
    constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[]);
    createAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number): Q.Promise<TaskAgentInterfaces.TaskAgent>;
    getAgent(poolId: number, agentId: number, includeCapabilities?: boolean, propertyFilters?: string): Q.Promise<TaskAgentInterfaces.TaskAgent>;
    getAgents(poolId: number, agentName?: string, includeCapabilities?: boolean, propertyFilters?: string, demands?: string): Q.Promise<TaskAgentInterfaces.TaskAgent[]>;
    replaceAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, agentId: number): Q.Promise<TaskAgentInterfaces.TaskAgent>;
    updateAgent(agent: TaskAgentInterfaces.TaskAgent, poolId: number, agentId: number): Q.Promise<TaskAgentInterfaces.TaskAgent>;
    queryEndpoint(endpoint: TaskAgentInterfaces.TaskDefinitionEndpoint): Q.Promise<string[]>;
    getRequest(poolId: number, requestId: number): Q.Promise<TaskAgentInterfaces.TaskAgentJobRequest>;
    queueRequest(request: TaskAgentInterfaces.TaskAgentJobRequest, poolId: number): Q.Promise<TaskAgentInterfaces.TaskAgentJobRequest>;
    updateRequest(request: TaskAgentInterfaces.TaskAgentJobRequest, poolId: number, requestId: number, lockToken: string): Q.Promise<TaskAgentInterfaces.TaskAgentJobRequest>;
    getMessage(poolId: number, sessionId: string, lastMessageId?: number): Q.Promise<TaskAgentInterfaces.TaskAgentMessage>;
    createPool(pool: TaskAgentInterfaces.TaskAgentPool): Q.Promise<TaskAgentInterfaces.TaskAgentPool>;
    getPool(poolId: number, properties?: string): Q.Promise<TaskAgentInterfaces.TaskAgentPool>;
    getPools(poolName?: string, properties?: string): Q.Promise<TaskAgentInterfaces.TaskAgentPool[]>;
    updatePool(pool: TaskAgentInterfaces.TaskAgentPool, poolId: number): Q.Promise<TaskAgentInterfaces.TaskAgentPool>;
    getAgentPoolRoles(poolId?: number): Q.Promise<VSSInterfaces.IdentityRef[]>;
    createServiceEndpoint(endpoint: TaskAgentInterfaces.ServiceEndpoint, scopeIdentifier: string, endpointId: string): Q.Promise<TaskAgentInterfaces.ServiceEndpoint>;
    getServiceEndpointDetails(scopeIdentifier: string, endpointId: string): Q.Promise<TaskAgentInterfaces.ServiceEndpoint>;
    getServiceEndpoints(scopeIdentifier: string, type?: string): Q.Promise<TaskAgentInterfaces.ServiceEndpoint[]>;
    createSession(session: TaskAgentInterfaces.TaskAgentSession, poolId: number): Q.Promise<TaskAgentInterfaces.TaskAgentSession>;
    getTaskContent(taskId: string, versionString?: string): Q.Promise<TaskAgentInterfaces.TaskDefinition[]>;
    getTaskDefinitions(visibility: string[]): Q.Promise<TaskAgentInterfaces.TaskDefinition[]>;
    updateUserCapabilities(userCapabilities: {
        [key: string]: string;
    }, poolId: number, agentId: number): Q.Promise<TaskAgentInterfaces.TaskAgent>;
}
