declare module "vso-node-api" {
    import VsoBaseInterfaces = require('interfaces/common/VsoBaseInterfaces');
    import buildm = require('BuildApi');
    import corem = require('CoreApi');
    import filecontainerm = require('FileContainerApi');
    import gitm = require('GitApi');
    import taskagentm = require('TaskAgentApi');
    import taskm = require('TaskApi');
    import testm = require('TestApi');
    import tfvcm = require('TfvcApi');
    import workitemtrackingm = require('WorkItemTrackingApi');
    import apivm = require('handlers/apiversion');
    import basicm = require('handlers/basiccreds');
    import bearm = require('handlers/bearertoken');
    export class WebApi {
        serverUrl: string;
        authHandler: VsoBaseInterfaces.IRequestHandler;
        constructor(serverUrl: string, authHandler: VsoBaseInterfaces.IRequestHandler);
        getVersionHandler(apiVersion: string): apivm.ApiVersionHandler;
        getBasicHandler(username: string, password: string): basicm.BasicCredentialHandler;
        getBearerHandler(token: any): bearm.BearerCredentialHandler;
        getBuildApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): buildm.IBuildApi;
        getQBuildApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): buildm.IQBuildApi;
        getCoreApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): corem.ICoreApi;
        getQCoreApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): corem.IQCoreApi;
        getFileContainerApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): filecontainerm.IFileContainerApi;
        getQFileContainerApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): filecontainerm.IQFileContainerApi;
        getGitApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): gitm.IGitApi;
        getQGitApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): gitm.IQGitApi;
        getTaskApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): taskm.ITaskApi;
        getQTaskApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): taskm.IQTaskApi;
        getTaskAgentApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): taskagentm.ITaskAgentApi;
        getQTaskAgentApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): taskagentm.IQTaskAgentApi;
        getTestApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): testm.ITestApi;
        getQTestApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): testm.IQTestApi;
        getTfvcApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): tfvcm.ITfvcApi;
        getQTfvcApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): tfvcm.IQTfvcApi;
        getWorkItemTrackingApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): workitemtrackingm.IWorkItemTrackingApi;
        getQWorkItemTrackingApi(serverUrl?: string, handlers?: VsoBaseInterfaces.IRequestHandler[]): workitemtrackingm.IQWorkItemTrackingApi;
    }
}