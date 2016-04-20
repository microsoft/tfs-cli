[CmdletBinding()]
param()

# For more information on the VSTS Task SDK:
# https://github.com/Microsoft/vsts-task-lib
Trace-VstsEnteringInvocation $MyInvocation
try {
    # Set the working directory.
    $cwd = Get-VstsInput -Name cwd -Require
    Assert-VstsPath -LiteralPath $cwd -PathType Directory
    Write-Verbose "Setting working directory to '$cwd'."
    Set-Location $cwd

    # Output the message input to the log.
    Write-Host (Get-VstsInput -Name msg)
} finally {
    Trace-VstsLeavingInvocation $MyInvocation
}
