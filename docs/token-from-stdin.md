# Reading Token from stdin

The `--token-from-stdin` parameter allows you to securely pass your Personal Access Token (PAT) to `tfx` via stdin instead of passing it as a command-line argument or storing it in environment variables.

## Usage

### Basic Example

```bash
echo "your-pat-token-here" | tfx extension show --token-from-stdin --publisher your-publisher --extension-id your-extension
```

### From a File

```bash
cat ~/.secrets/azure-devops-token.txt | tfx extension publish --token-from-stdin --manifest-globs manifest.json
```

### From a Password Manager

```bash
# Example with 1Password CLI
op read "op://vault/azure-devops/token" | tfx build tasks list --token-from-stdin
```

### With Environment Variable Fallback

```bash
# Using stdin takes priority over AZURE_DEVOPS_TOKEN
echo "$SECURE_TOKEN" | tfx workitem show --token-from-stdin --id 123
```

## Priority Order

When multiple authentication methods are provided, `tfx` uses the following priority order:

1. **Username + Password** (`--username` and `--password`)
2. **Explicit Token** (`--token` or `-t`)
3. **Token from stdin** (`--token-from-stdin`)
4. **Environment Variable** (`AZURE_DEVOPS_TOKEN`)
5. **Stored Credentials** (from previous `tfx login`)
6. **Interactive Prompt**

## Security Benefits

- **No command-line exposure**: The token doesn't appear in shell history or process listings
- **No environment variables**: Avoids potential leakage through process environment inspection
- **Integration with secret managers**: Works seamlessly with password managers and secret vaults
- **CI/CD friendly**: Can be used in pipelines with secure secret management

## Common Use Cases

### GitHub Actions

```yaml
- name: Publish Extension
  run: |
    echo "${{ secrets.AZURE_DEVOPS_PAT }}" | tfx extension publish \
      --token-from-stdin \
      --manifest-globs manifest.json
```

### Azure Pipelines

```yaml
- script: |
    echo "$(AzureDevOpsPAT)" | tfx extension publish \
      --token-from-stdin \
      --manifest-globs manifest.json
  displayName: 'Publish Extension'
  env:
    AzureDevOpsPAT: $(AzureDevOpsPAT)
```

### GitLab CI

```yaml
publish:
  script:
    - echo "$AZURE_DEVOPS_PAT" | tfx extension publish --token-from-stdin --manifest-globs manifest.json
```

## Notes

- The token is read from stdin when the command starts, before any interactive prompts
- Only the first line from stdin is used; any trailing whitespace is trimmed
- If stdin is empty, the command will fail with an error
- The `--token-from-stdin` flag takes precedence over `AZURE_DEVOPS_TOKEN` but not over `--token`
