import { RequestContext, RouteHandler } from '../types';
import { BaseRouteHandler } from './BaseRouteHandler';
import { ResponseUtils } from '../utils/ResponseUtils';

export class ExtensionHandler extends BaseRouteHandler {
    public getRoutes(): RouteHandler[] {
        return [
            // OPTIONS routes for API area discovery
            {
                pattern: /^\/(.*\/)?_apis\/gallery\/?$/i,
                method: 'OPTIONS',
                handler: (context) => this.handleGalleryAreaDiscovery(context)
            },
            {
                pattern: /^\/(.*\/)?_apis\/extensionmanagement\/?$/i,
                method: 'OPTIONS',
                handler: (context) => this.handleExtensionManagementAreaDiscovery(context)
            },
            {
                pattern: /^\/(.*\/)?_apis\/ExtensionManagement\/?$/i,
                method: 'OPTIONS',
                handler: (context) => this.handleExtensionManagementCapitalAreaDiscovery(context)
            },
            {
                pattern: /^\/(_apis\/)?extensionmanagement\/installedextensions$/i,
                method: 'GET',
                handler: (context) => this.handleInstalledExtensions(context)
            },
            {
                pattern: /^\/(_apis\/)?extensionmanagement\/installedextensions\/([^\/]+)\/([^\/]+)$/i,
                method: 'GET',
                handler: (context) => this.handleInstalledExtensionById(context)
            },
            {
                pattern: /^\/(_apis\/)?extensionmanagement\/installedextensions$/i,
                method: 'POST',
                handler: (context) => this.handleInstallExtension(context)
            },
            {
                pattern: /^\/(_apis\/)?gallery\/extensions$/i,
                method: 'GET',
                handler: (context) => this.handleGalleryExtensions(context)
            },
            {
                pattern: /^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)$/i,
                method: 'GET',
                handler: (context) => this.handleGalleryExtensionById(context)
            },
            {
                pattern: /^\/(_apis\/)?gallery\/extensions$/i,
                method: 'POST',
                handler: (context) => this.handlePublishExtension(context)
            },
            {
                pattern: /^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)$/i,
                method: 'DELETE',
                handler: (context) => this.handleDeleteExtension(context)
            },
            {
                pattern: /^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)$/i,
                method: 'PUT',
                handler: (context) => this.handleUpdateExtension(context)
            },
            {
                pattern: /^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)\/share$/i,
                method: 'POST',
                handler: (context) => this.handleShareExtension(context)
            },
            {
                pattern: /^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)\/unshare$/i,
                method: 'POST',
                handler: (context) => this.handleUnshareExtension(context)
            },
            {
                pattern: /^\/(_apis\/)?gallery\/extensionvalidator$/i,
                method: 'POST',
                handler: (context) => this.handleExtensionValidation(context)
            }
        ];
    }

    private handleInstalledExtensions(context: RequestContext): void {
        const extensions = this.dataStore.getExtensions();
        const includeDisabledExtensions = context.query.includeDisabledExtensions === 'true';
        
        let filteredExtensions = extensions;
        if (!includeDisabledExtensions) {
            filteredExtensions = extensions.filter(e => e.flags !== 'disabled');
        }
        
        ResponseUtils.sendSuccess(context.res, {
            count: filteredExtensions.length,
            value: filteredExtensions
        });
    }

    private handleInstalledExtensionById(context: RequestContext): void {
        const match = context.pathname.match(/^\/(_apis\/)?extensionmanagement\/installedextensions\/([^\/]+)\/([^\/]+)$/i);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid extension identifier');
            return;
        }

        const publisherName = match[2];
        const extensionName = match[3];
        
        const extension = this.dataStore.getExtensionByPublisherAndName(publisherName, extensionName);
        
        if (extension) {
            ResponseUtils.sendSuccess(context.res, extension);
        } else {
            ResponseUtils.sendNotFound(context.res, 'Extension');
        }
    }

    private handleInstallExtension(context: RequestContext): void {
        if (!context.body) {
            ResponseUtils.sendBadRequest(context.res, 'Extension data is required');
            return;
        }

        const extensionData = context.body;
        const extensionId = `${extensionData.publisherName}.${extensionData.extensionName}`;
        
        // Check if extension already exists
        const existingExtension = this.dataStore.getExtensionById(extensionId);
        if (existingExtension) {
            ResponseUtils.sendSuccess(context.res, existingExtension);
            return;
        }

        // Create new extension installation
        const newExtension = {
            extensionId: extensionId,
            extensionName: extensionData.extensionName,
            displayName: extensionData.displayName || extensionData.extensionName,
            shortDescription: extensionData.shortDescription || '',
            publisher: {
                publisherName: extensionData.publisherName,
                displayName: extensionData.publisherDisplayName || extensionData.publisherName
            },
            versions: [{
                version: extensionData.version || '1.0.0',
                flags: 'validated',
                lastUpdated: new Date().toISOString()
            }],
            publishedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            categories: extensionData.categories || ['Other'],
            tags: extensionData.tags || [],
            flags: 'validated'
        };
        
        this.dataStore.addExtension(newExtension);
        ResponseUtils.sendCreated(context.res, newExtension);
    }

    private handleGalleryExtensions(context: RequestContext): void {
        const extensions = this.dataStore.getExtensions();
        const searchText = context.query.searchText;
        const category = context.query.category;
        const take = parseInt(context.query.take as string) || 50;
        const skip = parseInt(context.query.skip as string) || 0;
        
        let filteredExtensions = extensions;
        
        if (searchText) {
            const searchLower = searchText.toString().toLowerCase();
            filteredExtensions = filteredExtensions.filter(e => 
                e.extensionName.toLowerCase().includes(searchLower) ||
                e.displayName?.toLowerCase().includes(searchLower) ||
                e.shortDescription?.toLowerCase().includes(searchLower)
            );
        }
        
        if (category) {
            filteredExtensions = filteredExtensions.filter(e => 
                e.categories.includes(category.toString())
            );
        }
        
        const pagedExtensions = filteredExtensions.slice(skip, skip + take);
        
        ResponseUtils.sendSuccess(context.res, {
            results: [{
                extensions: pagedExtensions,
                resultMetadata: [{
                    metadataType: 'ResultCount',
                    metadataItems: [{
                        name: 'TotalCount',
                        count: filteredExtensions.length
                    }]
                }]
            }]
        });
    }

    private handleGalleryExtensionById(context: RequestContext): void {
        const match = context.pathname.match(/^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)$/i);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid extension identifier');
            return;
        }

        const publisherName = match[2];
        const extensionName = match[3];
        
        const extension = this.dataStore.getExtensionByPublisherAndName(publisherName, extensionName);
        
        if (extension) {
            ResponseUtils.sendSuccess(context.res, extension);
        } else {
            ResponseUtils.sendNotFound(context.res, 'Extension');
        }
    }

    private handlePublishExtension(context: RequestContext): void {
        if (!context.body) {
            ResponseUtils.sendBadRequest(context.res, 'Extension package is required');
            return;
        }

        // Simulate extension publishing
        const extensionData = {
            extensionId: `test-publisher.published-extension-${Date.now()}`,
            extensionName: `published-extension-${Date.now()}`,
            displayName: 'Published Extension',
            shortDescription: 'A published extension for testing',
            publisher: {
                publisherName: 'test-publisher',
                displayName: 'Test Publisher'
            },
            versions: [{
                version: '1.0.0',
                flags: 'validated',
                lastUpdated: new Date().toISOString()
            }],
            publishedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            categories: ['Other'],
            tags: [],
            flags: 'validated'
        };
        
        this.dataStore.addExtension(extensionData);
        ResponseUtils.sendCreated(context.res, extensionData);
    }

    private handleGalleryAreaDiscovery(context: RequestContext): void {
        console.log('[Mock Server] API area discovery for: gallery');
        
        const resourceLocations = [
            {
                id: "a41192c8-9525-4b58-bc86-179fa549d80d",
                area: "gallery",
                resourceName: "Extensions",
                routeTemplate: "_apis/gallery/extensions/{publisherName}/{extensionName}",
                resourceVersion: 1,
                minVersion: "1.0",
                maxVersion: "7.2",
                releasedVersion: "1.0"
            },
            {
                id: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
                area: "gallery",
                resourceName: "Extensions",
                routeTemplate: "_apis/gallery/extensions/{publisherName}/{extensionName}",
                resourceVersion: 1,
                minVersion: "1.0",
                maxVersion: "7.2",
                releasedVersion: "1.0"
            },
            {
                id: "a1e66d8f-f5de-4d16-8309-91a4e015ee46",
                area: "gallery",
                resourceName: "ExtensionSharing",
                routeTemplate: "_apis/gallery/extensions/{publisherName}/{extensionName}/share",
                resourceVersion: 1,
                minVersion: "1.0",
                maxVersion: "7.2",
                releasedVersion: "1.0"
            },
            {
                id: "fa557ce8-c857-4b98-b1a2-0194d4666768", 
                area: "gallery",
                resourceName: "ExtensionValidator",
                routeTemplate: "_apis/gallery/extensionvalidator",
                resourceVersion: 1,
                minVersion: "1.0",
                maxVersion: "7.2",
                releasedVersion: "1.0"
            }
        ];
        
        console.log('[Mock Server] Returning gallery area resource locations:', JSON.stringify(resourceLocations, null, 2));
        ResponseUtils.sendSuccess(context.res, { value: resourceLocations });
    }

    private handleExtensionManagementAreaDiscovery(context: RequestContext): void {
        console.log('[Mock Server] API area discovery for: extensionmanagement');
        
        const resourceLocations = [
            {
                id: "fb0da285-f23e-4b56-8b53-3ef5f9f6de66",
                area: "ExtensionManagement",
                resourceName: "InstalledExtensions",
                routeTemplate: "_apis/extensionmanagement/installedextensions",
                resourceVersion: 1,
                minVersion: "1.0",
                maxVersion: "7.2",
                releasedVersion: "1.0"
            }
        ];
        
        console.log('[Mock Server] Returning extensionmanagement area resource locations:', JSON.stringify(resourceLocations, null, 2));
        ResponseUtils.sendSuccess(context.res, { value: resourceLocations });
    }

    private handleExtensionManagementCapitalAreaDiscovery(context: RequestContext): void {
        console.log('[Mock Server] API area discovery for: ExtensionManagement');
        
        const resourceLocations = [
            {
                id: "fb0da285-f23e-4b56-8b53-3ef5f9f6de66",
                area: "ExtensionManagement",
                resourceName: "InstalledExtensions",
                routeTemplate: "_apis/extensionmanagement/installedextensions",
                resourceVersion: 1,
                minVersion: "1.0",
                maxVersion: "7.2",
                releasedVersion: "1.0"
            }
        ];
        
        console.log('[Mock Server] Returning ExtensionManagement area resource locations:', JSON.stringify(resourceLocations, null, 2));
        ResponseUtils.sendSuccess(context.res, { value: resourceLocations });
    }

    private handleDeleteExtension(context: RequestContext): void {
        const match = context.pathname.match(/^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)$/i);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid extension path');
            return;
        }

        const publisher = match[2];
        const extensionName = match[3];
        
        const extensions = this.dataStore.getExtensions();
        const extensionIndex = extensions.findIndex(e => 
            e.publisher.publisherName === publisher && e.extensionId === extensionName
        );
        
        if (extensionIndex !== -1) {
            const deletedExtension = extensions.splice(extensionIndex, 1)[0];
            
            // If this is the test extension used by validation tests, restore it after deletion
            if (publisher === 'test-publisher' && extensionName === 'test-extension') {
                setTimeout(() => {
                    this.dataStore.addExtension({
                        extensionId: 'test-extension',
                        extensionName: 'Test Extension',
                        displayName: 'Test Extension',
                        shortDescription: 'Test extension for server integration tests',
                        publisher: {
                            publisherName: 'test-publisher',
                            displayName: 'Test Publisher'
                        },
                        versions: [{
                            version: '1.0.0',
                            targetPlatform: null,
                            files: [],
                            properties: [],
                            assetUri: '',
                            fallbackAssetUri: '',
                            flags: 'validated',
                            lastUpdated: new Date().toISOString()
                        }],
                        publishedDate: new Date().toISOString(),
                        lastUpdated: new Date().toISOString(),
                        categories: ['Other'],
                        tags: [],
                        flags: 'validated'
                    });
                }, 100);
            }
            
            ResponseUtils.sendSuccess(context.res, deletedExtension);
        } else {
            ResponseUtils.sendNotFound(context.res, 'Extension');
        }
    }

    private handleUpdateExtension(context: RequestContext): void {
        const match = context.pathname.match(/^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)$/i);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid extension path');
            return;
        }

        const publisher = match[2];
        const extensionName = match[3];
        
        const extensions = this.dataStore.getExtensions();
        let extension = extensions.find(e => 
            e.publisher.publisherName === publisher && e.extensionId === extensionName
        );
        
        if (extension) {
            // Update existing extension
            const newVersion = context.body.version || '1.0.0';
            extension.extensionName = context.body.extensionName || extension.extensionName;
            extension.flags = 'validated';
            extension.lastUpdated = new Date().toISOString();
            
            // Update or add version
            const versionExists = extension.versions.find(v => v.version === newVersion);
            if (!versionExists) {
                extension.versions.unshift({
                    version: newVersion,
                    flags: 'validated',
                    lastUpdated: new Date().toISOString()
                });
            }
            ResponseUtils.sendSuccess(context.res, extension);
        } else {
            // Create new extension
            const newExtension = {
                extensionId: extensionName,
                extensionName: context.body.extensionName || extensionName,
                displayName: context.body.displayName || context.body.extensionName || extensionName,
                shortDescription: context.body.description || 'Test extension',
                publisher: {
                    publisherName: publisher,
                    displayName: context.body.publisherDisplayName || publisher
                },
                flags: 'validated',
                versions: [{
                    version: context.body.version || '1.0.0',
                    flags: 'validated',
                    lastUpdated: new Date().toISOString()
                }],
                publishedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                categories: context.body.categories || ['Other'],
                tags: context.body.tags || []
            };
            this.dataStore.addExtension(newExtension);
            ResponseUtils.sendCreated(context.res, newExtension);
        }
    }

    private handleShareExtension(context: RequestContext): void {
        const match = context.pathname.match(/^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)\/share$/i);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid extension path');
            return;
        }

        const publisher = match[2];
        const extensionName = match[3];
        
        ResponseUtils.sendSuccess(context.res, { 
            success: true, 
            message: `Extension ${publisher}.${extensionName} shared successfully` 
        });
    }

    private handleUnshareExtension(context: RequestContext): void {
        const match = context.pathname.match(/^\/(_apis\/)?gallery\/extensions\/([^\/]+)\/([^\/]+)\/unshare$/i);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid extension path');
            return;
        }

        const publisher = match[2];
        const extensionName = match[3];
        
        ResponseUtils.sendSuccess(context.res, { 
            success: true, 
            message: `Extension ${publisher}.${extensionName} unshared successfully` 
        });
    }

    private handleExtensionValidation(context: RequestContext): void {
        ResponseUtils.sendSuccess(context.res, { 
            validationResult: 'Valid', 
            errors: [],
            warnings: []
        });
    }
}
