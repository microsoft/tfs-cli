# TFS CLI Server Integration Tests - Comprehensive Debug & Enhancement Guide

## 🚀 Quick Start Debug Commands

### Enable Debug Output
```powershell
# Enable enhanced CLI output logging
$env:DEBUG_CLI_OUTPUT = "true"

# Run specific test with debug output
npx mocha _tests/tests/build-server-integration-tests.js --grep "should list builds" --timeout 15000

# Run all tests in a file with debug output
npx mocha _tests/tests/server-integration-login.js --timeout 30000

# Run with both debug output and increased timeout for complex tests
$env:DEBUG_CLI_OUTPUT = "true"; npx mocha _tests/tests/extension-server-integration-tests.js --grep "should publish" --timeout 30000
```

## 🔧 Debug Utility Features

Our enhanced debug utility (`tests/test-utils/debug-exec.ts`) provides:

### ✅ Enhanced Formatting
- **Section separators**: Clear `===============` lines
- **Command context**: Shows exact command being executed
- **Result indicators**: SUCCESS/FAILURE with clear visibility
- **Output organization**: Separate STDOUT and STDERR with labels
- **Context descriptions**: Meaningful descriptions for each command

### 📋 Sample Debug Output
```
================================================================================
[DEBUG] build list with basic authentication
================================================================================
Command: node "C:\Repos\tfs-cli\_build\tfx-cli.js" build list --service-url "http://localhost:8087/DefaultCollection" --project "TestProject" --auth-type basic --username testuser --password testpass --no-prompt
--------------------------------------------------------------------------------
[DEBUG] RESULT: SUCCESS
--------------------------------------------------------------------------------
STDOUT:
TFS Cross Platform Command Line Interface v0.21.3
Copyright Microsoft Corporation

id              : 1
definition name : Sample Build Definition
requested by    : Test User
status          : Completed
queue time      : unknown
================================================================================
```

## 🎯 How to Fix Assertions - Step by Step

### Phase 1: Enable Debug & Analyze Output

1. **Run single test with debug**:
   ```powershell
   $env:DEBUG_CLI_OUTPUT = "true"; npx mocha _tests/tests/build-server-integration-tests.js --grep "should queue a build" --timeout 15000
   ```

2. **Analyze the actual CLI output** from debug logs:
   - Look at the `STDOUT:` section
   - Note exact formatting, spacing, and text
   - Identify patterns and specific values

### Phase 2: Update Test with Context & Tight Assertions

3. **Add descriptive context**:
   ```typescript
   // BEFORE - Generic
   execAsyncWithLogging(command)
   
   // AFTER - Descriptive  
   execAsyncWithLogging(command, 'build queue with definition ID')
   ```

4. **Replace generic assertions with specific ones**:
   ```typescript
   // BEFORE - Too generic (could match anything)
   assert(cleanOutput.includes('success'), 'Should succeed');
   assert(cleanOutput.includes('id'), 'Should show ID');
   
   // AFTER - Specific & restrictive (based on actual output)
   assert(cleanOutput.includes('id              : 3'), 'Should show specific build ID format');
   assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name');
   assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester');
   assert(cleanOutput.includes('status          : InProgress'), 'Should show specific status');
   ```

### Phase 3: Handle Different Output Formats

5. **For JSON output**, parse structure:
   ```typescript
   const cleanOutput = stripColors(stdout).trim();
   assert(cleanOutput.startsWith('['), 'Should start with JSON array');
   assert(cleanOutput.endsWith(']'), 'Should end with JSON array');
   assert(cleanOutput.includes('"id": 1'), 'Should contain first build ID as number');
   ```

6. **For tabular output**, check formatting:
   ```typescript
   assert(cleanOutput.includes('id              : 1'), 'Should show build ID with specific format');
   assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name with spacing');
   ```

7. **For error cases**, check specific error messages:
   ```typescript
   const errorOutput = stripColors(error.stderr || error.stdout || '');
   assert(errorOutput.includes('Missing required value'), 'Should show specific error message');
   ```

### Phase 4: Test & Verify

8. **Run updated test**:
   ```powershell
   npm run build:tests && npx mocha _tests/tests/build-server-integration-tests.js --grep "your test name" --timeout 15000
   ```

9. **Verify assertions pass** with actual CLI behavior

## 🔍 Common Patterns & Examples

### Pattern 1: Login Success
**CLI Output**:
```
TFS Cross Platform Command Line Interface v0.21.3
Copyright Microsoft Corporation
Logged in successfully
```
**Tight Assertions**:
```typescript
assert(cleanOutput.includes('TFS Cross Platform Command Line Interface'), 'Should show CLI header');
assert(cleanOutput.includes('Logged in successfully'), 'Should show specific login success message');
```

### Pattern 2: Build List Format
**CLI Output**:
```
id              : 1
definition name : Sample Build Definition
requested by    : Test User
status          : Completed
queue time      : unknown
```
**Tight Assertions**:
```typescript
assert(cleanOutput.includes('id              : 1'), 'Should show build ID with specific format');
assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name format');
assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester format');
assert(cleanOutput.includes('status          : Completed'), 'Should show status format');
```

### Pattern 3: JSON Arrays
**CLI Output**:
```json
[
    {
        "id": 1,
        "definition": {
            "name": "Sample Build Definition"
        }
    }
]
```
**Tight Assertions**:
```typescript
const cleanOutput = stripColors(stdout).trim();
assert(cleanOutput.startsWith('['), 'Should start with JSON array');
assert(cleanOutput.endsWith(']'), 'Should end with JSON array');
assert(cleanOutput.includes('"id": 1'), 'Should contain build ID as number');
assert(cleanOutput.includes('"name": "Sample Build Definition"'), 'Should contain definition name');
```

## 🏗️ Mock Server Verbose Logging

The mock servers automatically provide verbose logging showing:
- HTTP method and path requests
- Authorization headers (masked)
- Request/response routing
- Resource area discovery
- API endpoint matching

This helps understand the CLI's server interaction patterns.

## 📊 Batch Processing Workflow

### Recommended Approach
1. **Work in batches of 2-3 tests** to avoid overwhelming changes
2. **Build and test frequently** to catch errors early
3. **Use specific grep patterns** to run individual tests
4. **Document progress** as you go

### Example Batch Workflow
```powershell
# 1. Pick 3 tests from the same category
$env:DEBUG_CLI_OUTPUT = "true"

# 2. Run them individually to see output
npx mocha _tests/tests/build-server-integration-tests.js --grep "should queue a build" --timeout 15000
npx mocha _tests/tests/build-server-integration-tests.js --grep "should queue build by definition" --timeout 15000
npx mocha _tests/tests/build-server-integration-tests.js --grep "should require definition" --timeout 15000

# 3. Update all 3 with descriptive contexts and tight assertions

# 4. Build and test the batch
npm run build:tests
npx mocha _tests/tests/build-server-integration-tests.js --grep "Build Queue Command" --timeout 15000

# 5. Move to next batch
```

---

# 📋 COMPLETE TEST TRACKER - ALL SERVER INTEGRATION TESTS

## 🏗️ Build Server Integration Tests (24 tests)
**File**: `tests/build-server-integration-tests.ts`
**Status**: ✅ Logging Added, ⏳ Assertions in Progress (5/24 enhanced)

### Build List Command (5 tests)
- ✅ should list builds from server with basic auth *(enhanced)*
- ✅ should list builds from server with PAT *(enhanced)*  
- ✅ should handle definition name filter *(enhanced)*
- ✅ should support JSON output *(enhanced)*
- ⏳ should support top parameter *(logging only)*

### Build Show Command (2 tests)
- ✅ should show build details *(enhanced)*
- ✅ should require build ID *(enhanced)*

### Build Queue Command (3 tests)
- ❌ should queue a build *(logging only)*
- ❌ should queue build by definition name *(logging only)*
- ❌ should require definition ID or name *(logging only)*

### Build Task List Command (2 tests)
- ❌ should list build tasks from server *(logging only)*
- ❌ should require authentication for server operations *(logging only)*

### Build Task Upload Command (4 tests)
- ❌ should validate task.json requirement *(logging only)*
- ❌ should process valid task.json *(logging only)*
- ❌ should validate task.json format *(logging only)*
- ❌ should require task path *(logging only)*

### Build Task Delete Command (3 tests)
- ❌ should delete build task *(logging only)*
- ❌ should require task ID for deletion *(logging only)*
- ❌ should validate task ID format *(logging only)*

### Build Task Creation with Server (1 test)
- ❌ should handle task creation with template *(logging only)*

### Connection and Authentication (4 tests)
- ❌ should handle missing service URL *(logging only)*
- ❌ should handle missing project *(logging only)*
- ❌ should validate auth type *(logging only)*
- ❌ should handle server connection errors gracefully *(logging only)*

---

## 🔐 Login Integration Tests (14 tests)
**File**: `tests/server-integration-login.ts`
**Status**: ✅ Logging Added, ❌ Assertions Not Started (0/14 enhanced)

### Login Command (7 tests)
- ❌ should successfully login with basic authentication *(logging only)*
- ❌ should successfully login with PAT token *(logging only)*
- ❌ should require service URL parameter *(logging only)*
- ❌ should handle unreachable service URL gracefully *(logging only)*
- ❌ should reject invalid authentication type *(logging only)*
- ❌ should require username and password for basic auth *(logging only)*
- ❌ should require token for PAT authentication *(logging only)*

### Logout Command (1 test)
- ❌ should successfully logout *(logging only)*

### Reset Command (1 test) 
- ❌ should successfully reset cached settings *(logging only)*

### Credential Caching (2 tests)
- ❌ should save credentials successfully when using --save flag *(logging only)*
- ❌ should verify credentials are saved with --save flag *(logging only)*

### SSL Certificate Validation (1 test)
- ❌ should login successfully with skip certificate validation flag *(logging only)*

### Connection Testing (2 tests)
- ❌ should successfully connect and login to server *(logging only)*
- ❌ should fail gracefully with connection timeout *(logging only)*

---

## 📝 Work Item Integration Tests (15 tests)
**File**: `tests/server-integration-workitem.ts` 
**Status**: ✅ Logging Added, ❌ Assertions Not Started (0/15 enhanced)

### Work Item Show Command (2 tests)
- ❌ should show work item details successfully *(logging only)*
- ❌ should require work item ID parameter *(logging only)*

### Work Item Create Command (4 tests)
- ❌ should create a task work item successfully *(logging only)*
- ❌ should create work item with custom fields successfully *(logging only)*
- ❌ should require work item type parameter *(logging only)*
- ❌ should require at least one field value *(logging only)*

### Work Item Query Command (3 tests)
- ❌ should execute WIQL query successfully *(logging only)*
- ❌ should execute saved query successfully *(logging only)*
- ❌ should require query parameter (WIQL or query name) *(logging only)*

### Work Item Update Command (3 tests)
- ❌ should update work item successfully *(logging only)*
- ❌ should update multiple fields successfully *(logging only)*
- ❌ should require work item ID parameter *(logging only)*

### Authentication and Connection (2 tests)
- ❌ should handle PAT authentication successfully *(logging only)*
- ❌ should handle connection to unreachable server gracefully *(logging only)*

### Output Formats (1 test)
- ❌ should produce valid JSON output format *(logging only)*

---

## 🔌 Extension Integration Tests (19 tests)
**File**: `tests/extension-server-integration-tests.ts`
**Status**: ✅ Logging Added, ❌ Assertions Not Started (0/19 enhanced)

### Extension Show Command (2 tests)
- ❌ should show extension details *(logging only)*
- ❌ should require publisher and extension ID *(logging only)*

### Extension Publish Command (4 tests)
- ❌ should validate VSIX file requirement *(logging only)*
- ❌ should handle manifest file processing *(logging only)*
- ❌ should validate token requirement *(logging only)*
- ❌ should handle publish with share-with parameter *(logging only)*

### Extension Share Command (2 tests)
- ❌ should share extension with accounts *(logging only)*
- ❌ should require publisher, extension ID, and share target *(logging only)*

### Extension Unpublish Command (2 tests)
- ❌ should unpublish extension *(logging only)*
- ❌ should require publisher, extension ID, and token *(logging only)*

### Extension Install Command (2 tests)
- ❌ should install extension to account *(logging only)*
- ❌ should require publisher and extension ID *(logging only)*

### Extension IsValid Command (2 tests)
- ❌ should validate extension manifest *(logging only)*
- ❌ should validate published extension (ignores local manifest) *(logging only)*

### Authentication and Connection (3 tests)
- ❌ should handle marketplace URL *(logging only)*
- ❌ should use default marketplace URL when not specified *(logging only)*

### Connection and Authentication (2 tests)
- ❌ should handle missing service URL *(logging only)*
- ❌ should validate auth type *(logging only)*
- ❌ should handle server connection errors gracefully *(logging only)*

---

# 📈 SUMMARY STATISTICS

## Overall Progress
- **Total Tests**: 72 tests across 4 files
- **Enhanced Logging**: ✅ 72/72 tests (100%) 
- **Enhanced Assertions**: ⏳ 5/72 tests (7%)

## File Status
- **Build Tests**: 24 tests, 5/24 enhanced (21%)
- **Login Tests**: 14 tests, 0/14 enhanced (0%)
- **Work Item Tests**: 15 tests, 0/15 enhanced (0%)
- **Extension Tests**: 19 tests, 0/19 enhanced (0%)

## Next Session Continuation Points
1. **Continue Build Tests**: Start with "should show build details" test
2. **Begin Login Tests**: Start with "should successfully login with basic authentication"
3. **Begin Work Item Tests**: Start with "should show work item details successfully"  
4. **Begin Extension Tests**: Start with "should show extension details"

## Key Commands for Next Session
```powershell
# Resume where we left off - Build tests
$env:DEBUG_CLI_OUTPUT = "true"; npx mocha _tests/tests/build-server-integration-tests.js --grep "should show build details" --timeout 15000

# Check what's been done
npx mocha _tests/tests/build-server-integration-tests.js --grep "Build List Command" --timeout 15000

# Continue with login tests when ready
$env:DEBUG_CLI_OUTPUT = "true"; npx mocha _tests/tests/server-integration-login.js --grep "should successfully login with basic authentication" --timeout 15000
```
