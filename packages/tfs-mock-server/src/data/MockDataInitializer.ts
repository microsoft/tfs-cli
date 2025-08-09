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
        // Add sample work items
        dataStore.addWorkItem({
            fields: {
                'System.WorkItemType': 'Task',
                'System.Title': 'Sample Task',
                'System.State': 'New',
                'System.AssignedTo': 'Test User <testuser@example.com>'
            }
        });

        dataStore.addWorkItem({
            fields: {
                'System.WorkItemType': 'Bug',
                'System.Title': 'Sample Bug',
                'System.State': 'Active',
                'System.AssignedTo': 'Test User <testuser@example.com>'
            }
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

        // Add test extension for compatibility tests (storage key includes publisher prefix)
        dataStore.addExtension({
            extensionId: 'test-extension',  // Response field - just the extension name
            extensionName: 'Test Extension',
            displayName: 'Test Extension',
            shortDescription: 'Test extension for compatibility testing',
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
