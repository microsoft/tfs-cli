# Extension Task Validation Tests

This test suite validates the extension creation process with build task contributions, ensuring proper validation and warning mechanisms for various error conditions.

## Test Structure

### Valid Task Extensions (`task-extension/`)
- **SampleTask/**: A simple valid build task with modern Node20_1 runner
- **VersionedTask/V1/**: Version 1 with deprecated Node16 runner (should trigger warnings)
- **VersionedTask/V2/**: Version 2 with modern Node20_1 runner

### Invalid Task Extensions (`invalid-task-extension/`)
- **InvalidTask/**: Contains multiple validation errors:
  - Invalid UUID format
  - Empty task name
  - Friendly name exceeding 40 characters
  - Missing instanceNameFormat
  - References non-existent target file
- **MissingTask/**: Directory exists but no task.json file
- **DeprecatedRunnerTask/**: Uses deprecated "Node" runner

## Test Coverage

### Valid Task Extensions Tests
1. **Extension Creation**: Verifies successful creation of extensions with valid build tasks
2. **Task Validation**: Confirms task.json files are validated during extension creation
3. **Deprecated Runner Warnings**: Checks that deprecated task runners trigger warnings but don't fail the build
4. **Versioned Tasks**: Validates proper handling of multi-version task structures

### Invalid Task Extensions Tests
1. **Invalid Task JSON**: Verifies warnings are shown for invalid task.json files
2. **Missing Task JSON**: Checks behavior when task directories exist without task.json
3. **Missing Target Files**: Validates warnings for non-existent execution target files
4. **Name Format Validation**: Tests validation of task name format requirements
5. **Friendly Name Length**: Validates friendly name length restrictions
6. **Deprecated Runners**: Confirms warnings for deprecated task runners

### Task Contribution Validation
1. **Directory Structure**: Validates that task contributions match actual directory structure
2. **Extensions Without Tasks**: Ensures extensions without task contributions still work

### Task JSON Schema Validation
1. **Required Fields**: Validates presence of all required task.json fields
2. **Input Structure**: Validates proper structure of task input definitions
3. **Execution Targets**: Ensures execution target files actually exist

## Key Behaviors Tested

- **Warning vs Error**: The current behavior shows warnings for invalid tasks but still creates the extension
- **Deprecated Runners**: Node, Node6, Node10, Node16 are deprecated and trigger warnings
- **File Validation**: Missing target files are detected and warned about
- **Schema Validation**: Task.json files are validated against required schema
- **Backwards Compatibility**: Multi-version tasks are properly handled

## Future Considerations

The test suite is designed to handle the current behavior where validation issues result in warnings rather than hard failures. The code comments indicate that "In the future, this warning will be treated as an error," so tests may need to be updated when that change occurs.
