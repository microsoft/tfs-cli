import { MockDataStore } from './MockDataStore';

export class MockDataInitializer {
    public static initialize(dataStore: MockDataStore): void {
        this.setupBuildDefinitions(dataStore);
        this.setupTaskDefinitions(dataStore);
        this.setupInitialBuilds(dataStore);
        this.setupInitialWorkItems(dataStore);
        this.setupInitialExtensions(dataStore);
    }

    private static setupBuildDefinitions(dataStore: MockDataStore): void {
        // Add sample build definitions
        dataStore.addBuildDefinition({
            id: 1,
            name: 'Sample Build Definition',
            project: 'TestProject',
            path: '\\',
            type: 'build',
            queueStatus: 'enabled',
            revision: 1,
            createdDate: new Date().toISOString(),
            repository: {
                id: 'test-repo-id',
                name: 'TestRepo',
                type: 'TfsGit'
            },
            process: {
                phases: [{
                    name: 'Phase 1',
                    steps: [{
                        task: {
                            id: 'sample-task-id',
                            name: 'Sample Task'
                        }
                    }]
                }]
            }
        });

        dataStore.addBuildDefinition({
            id: 2,
            name: 'Another Build Definition',
            project: 'TestProject',
            path: '\\',
            type: 'build',
            queueStatus: 'enabled',
            revision: 1,
            createdDate: new Date().toISOString(),
            repository: {
                id: 'test-repo-id-2',
                name: 'TestRepo2',
                type: 'TfsGit'
            }
        });
    }

    private static setupTaskDefinitions(dataStore: MockDataStore): void {
        // Add sample task definitions
        dataStore.addTaskDefinition({
            id: 'sample-task-id',
            name: 'Sample Task',
            friendlyName: 'Sample Task',
            description: 'A sample task for testing',
            category: 'Build',
            author: 'Test Author',
            version: { Major: 1, Minor: 0, Patch: 0 },
            instanceNameFormat: 'Sample Task',
            groups: [],
            inputs: [],
            execution: {
                Node: {
                    target: 'task.js'
                }
            }
        });

        // Add task for deletion test
        dataStore.addTaskDefinition({
            id: 'test-task-id',
            name: 'Test Task',
            friendlyName: 'Test Task for Deletion',
            description: 'A test task that can be deleted in integration tests',
            category: 'Build',
            author: 'Test Author',
            version: { Major: 1, Minor: 0, Patch: 0 },
            instanceNameFormat: 'Test Task',
            groups: [],
            inputs: [],
            execution: {
                Node: {
                    target: 'test.js'
                }
            }
        });
    }

    private static setupInitialBuilds(dataStore: MockDataStore): void {
        // Add some sample builds
        dataStore.addBuild({
            id: 1,
            definition: { id: 1, name: 'Sample Build Definition' },
            buildNumber: 'Build_20240101.1',
            status: 'completed',
            result: 'succeeded',
            project: { id: 'test-project-id', name: 'TestProject' },
            finishTime: new Date().toISOString()
        });

        dataStore.addBuild({
            id: 2,
            definition: { id: 1, name: 'Sample Build Definition' },
            buildNumber: 'Build_20240101.2',
            status: 'completed',
            result: 'failed',
            project: { id: 'test-project-id', name: 'TestProject' },
            finishTime: new Date().toISOString()
        });
    }

    private static setupInitialWorkItems(dataStore: MockDataStore): void {
        // Add sample work items with proper structure for WIQL queries
        dataStore.addWorkItem({
            id: 1,
            fields: {
                'System.Id': 1,
                'System.WorkItemType': 'Task',
                'System.Title': 'Sample Task',
                'System.State': 'New',
                'System.AssignedTo': {
                    displayName: 'Test User',
                    uniqueName: 'testuser@example.com'
                },
                'System.AreaPath': 'TestProject',
                'System.TeamProject': 'TestProject',
                'System.CreatedDate': new Date('2024-01-01T10:00:00.000Z').toISOString(),
                'System.ChangedDate': new Date('2024-01-01T10:00:00.000Z').toISOString(),
                'System.Description': 'This is a sample task for testing'
            },
            url: 'http://localhost:8082/DefaultCollection/_apis/wit/workitems/1'
        });

        dataStore.addWorkItem({
            id: 2,
            fields: {
                'System.Id': 2,
                'System.WorkItemType': 'Task',
                'System.Title': 'Another Task',
                'System.State': 'Active',
                'System.AssignedTo': {
                    displayName: 'Test User',
                    uniqueName: 'testuser@example.com'
                },
                'System.AreaPath': 'TestProject',
                'System.TeamProject': 'TestProject',
                'System.CreatedDate': new Date('2024-01-02T10:00:00.000Z').toISOString(),
                'System.ChangedDate': new Date('2024-01-02T11:00:00.000Z').toISOString(),
                'System.Description': 'This is another sample task for testing'
            },
            url: 'http://localhost:8082/DefaultCollection/_apis/wit/workitems/2'
        });

        dataStore.addWorkItem({
            id: 3,
            fields: {
                'System.Id': 3,
                'System.WorkItemType': 'Bug',
                'System.Title': 'Sample Bug',
                'System.State': 'New',
                'System.AssignedTo': {
                    displayName: 'Test User 2',
                    uniqueName: 'testuser2@example.com'
                },
                'System.AreaPath': 'TestProject',
                'System.TeamProject': 'TestProject',
                'System.CreatedDate': new Date('2024-01-03T10:00:00.000Z').toISOString(),
                'System.ChangedDate': new Date('2024-01-03T10:00:00.000Z').toISOString(),
                'System.Description': 'This is a sample bug for testing'
            },
            url: 'http://localhost:8082/DefaultCollection/_apis/wit/workitems/3'
        });
    }

    private static setupInitialExtensions(dataStore: MockDataStore): void {
        // Add sample extension
        dataStore.addExtension({
            extensionId: 'sample-extension',
            extensionName: 'Sample Extension',
            displayName: 'Sample Extension',
            shortDescription: 'Sample extension for testing',
            publisher: {
                publisherName: 'sample-publisher',
                displayName: 'Sample Publisher'
            },
            flags: 'validated',
            versions: [{
                version: '2.0.0',
                flags: 'validated',
                lastUpdated: '2024-01-01T10:00:00.000Z'
            }],
            publishedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            categories: ['Other'],
            tags: []
        });

        // Add test extension for server integration tests (storage key includes publisher prefix)
        dataStore.addExtension({
            extensionId: 'test-extension',  // Response field - just the extension name
            extensionName: 'Test Extension',
            displayName: 'Test Extension',
            shortDescription: 'Test extension for server integration tests',
            publisher: {
                publisherName: 'test-publisher',
                displayName: 'Test Publisher'
            },
            flags: 'validated',
            versions: [{
                version: '1.0.0',
                flags: 'validated',
                lastUpdated: '2024-01-01T10:00:00.000Z'
            }],
            publishedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            categories: ['Other'],
            tags: []
        });
    }
}
