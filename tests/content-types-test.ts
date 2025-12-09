import assert = require('assert');
import path = require('path');
import fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdmZip = require('adm-zip');
import { execAsyncWithLogging } from './test-utils/debug-exec';

// Basic test framework functions
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function after(fn: Function): void;

const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');
const samplesPath = path.resolve(__dirname, '../extension-samples');

describe('Content_Types.xml Generation', function() {
    this.timeout(30000);

    after(function() {
        // cleanup - remove generated .vsix files
        const testExtensionPath = path.join(samplesPath, 'extensionless-exec-test');
        const testVsixPath = path.join(testExtensionPath, 'test.vsix');
        try {
            if (fs.existsSync(testVsixPath)) {
                fs.unlinkSync(testVsixPath);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    it('should include extensionless executable in Content_Types.xml Override section', function(done) {
        const testExtensionPath = path.join(samplesPath, 'extensionless-exec-test');
        const outputPath = path.join(testExtensionPath, 'test.vsix');
        
        // Verify the test extension exists
        if (!fs.existsSync(testExtensionPath)) {
            done(new Error('Test extension directory not found: ' + testExtensionPath));
            return;
        }
        
        execAsyncWithLogging(`node "${tfxPath}" extension create --root "${testExtensionPath}" --output-path "${outputPath}"`, 'extension create with extensionless executable')
            .then(({ stdout }) => {
                // Verify .vsix was created
                assert(fs.existsSync(outputPath), 'Should create .vsix file');
                
                // Extract and check Content_Types.xml
                const zip = new AdmZip(outputPath);
                const zipEntries = zip.getEntries();
                
                // Find Content_Types.xml
                let contentTypesEntry = null;
                for (const entry of zipEntries) {
                    if (entry.entryName === '[Content_Types].xml') {
                        contentTypesEntry = entry;
                        break;
                    }
                }
                
                assert(contentTypesEntry, 'Should contain [Content_Types].xml');
                
                // Read and parse Content_Types.xml
                const contentTypesXml = contentTypesEntry.getData().toString('utf8');
                
                // Check that linux-executable is included as an Override element
                // The file should be listed with its full path
                assert(
                    contentTypesXml.includes('linux-executable') || contentTypesXml.includes('Override'),
                    'Content_Types.xml should contain Override elements for extensionless files'
                );
                
                // More specific check: look for the Override element with linux-executable
                const hasOverrideForExecutable = 
                    contentTypesXml.includes('PartName="/linux-executable"') ||
                    contentTypesXml.includes('PartName="/linux-executable') ||
                    contentTypesXml.includes('linux-executable"');
                
                assert(
                    hasOverrideForExecutable,
                    'Content_Types.xml should have Override element for linux-executable. Content: ' + contentTypesXml
                );
                
                done();
            })
            .catch(done);
    });
});
