import { MockBuild, MockWorkItem, MockExtension } from '../types';

export class MockDataStore {
    private builds: MockBuild[] = [];
    private workItems: MockWorkItem[] = [];
    private extensions: MockExtension[] = [];
    private buildDefinitions: any[] = [];
    private taskDefinitions: any[] = [];

    // Build-related operations
    public getBuilds(): MockBuild[] {
        return [...this.builds];
    }

    public getBuildById(id: number): MockBuild | undefined {
        return this.builds.find(b => b.id === id);
    }

    public getBuildsByProject(projectName: string): MockBuild[] {
        return this.builds.filter(b => b.project.name === projectName);
    }

    public getBuildsByDefinition(definitionId: number): MockBuild[] {
        return this.builds.filter(b => b.definition.id === definitionId);
    }

    public addBuild(build: Partial<MockBuild>): MockBuild {
        const newBuild: MockBuild = {
            id: this.builds.length + 1,
            definition: { id: 1, name: 'Test Definition' },
            buildNumber: `Build_${Date.now()}`,
            status: 'completed',
            result: 'succeeded',
            requestedBy: {
                displayName: 'Test User',
                uniqueName: 'testuser@example.com'
            },
            startTime: new Date().toISOString(),
            project: {
                id: 'test-project-id',
                name: 'TestProject'
            },
            ...build
        };
        this.builds.push(newBuild);
        return newBuild;
    }

    // Work Item operations
    public getWorkItems(): MockWorkItem[] {
        return [...this.workItems];
    }

    public getWorkItemById(id: number): MockWorkItem | undefined {
        return this.workItems.find(w => w.id === id);
    }

    public addWorkItem(workItem: Partial<MockWorkItem>): MockWorkItem {
        const newWorkItem: MockWorkItem = {
            id: this.workItems.length + 1,
            fields: {
                'System.WorkItemType': 'Task',
                'System.State': 'New',
                'System.CreatedBy': 'Test User <testuser@example.com>',
                'System.CreatedDate': new Date().toISOString(),
                ...workItem.fields
            },
            url: `http://localhost:8080/TestProject/_apis/wit/workitems/${this.workItems.length + 1}`,
            ...workItem
        };
        this.workItems.push(newWorkItem);
        return newWorkItem;
    }

    // Extension operations
    public getExtensions(): MockExtension[] {
        return [...this.extensions];
    }

    public getExtensionById(extensionId: string): MockExtension | undefined {
        return this.extensions.find(e => e.extensionId === extensionId);
    }

    public getExtensionByPublisherAndName(publisherName: string, extensionName: string): MockExtension | undefined {
        return this.extensions.find(e => 
            e.publisher.publisherName === publisherName && 
            e.extensionId === extensionName
        );
    }

    public addExtension(extension: MockExtension): void {
        this.extensions.push(extension);
    }

    // Build Definition operations
    public getBuildDefinitions(): any[] {
        return [...this.buildDefinitions];
    }

    public getBuildDefinitionById(id: number): any | undefined {
        return this.buildDefinitions.find(d => d.id === id);
    }

    public getBuildDefinitionsByProject(projectName: string): any[] {
        return this.buildDefinitions.filter(d => d.project === projectName);
    }

    public getBuildDefinitionsByName(name: string): any[] {
        return this.buildDefinitions.filter(d => 
            d.name.toLowerCase().includes(name.toLowerCase())
        );
    }

    public addBuildDefinition(definition: any): void {
        this.buildDefinitions.push(definition);
    }

    // Task Definition operations
    public getTaskDefinitions(): any[] {
        return [...this.taskDefinitions];
    }

    public getTaskDefinitionById(id: string): any | undefined {
        return this.taskDefinitions.find(t => t.id === id);
    }

    public addTaskDefinition(task: any): void {
        this.taskDefinitions.push(task);
    }

    // Clear all data
    public clearAll(): void {
        this.builds = [];
        this.workItems = [];
        this.extensions = [];
        this.buildDefinitions = [];
        this.taskDefinitions = [];
    }
}
