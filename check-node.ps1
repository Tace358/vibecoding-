$ErrorActionPreference = "SilentlyContinue"
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    Write-Output "Node found at: $($nodeCmd.Source)"
    & node --version
} else {
    Write-Output "Node not found in PATH"
    $env:PATH -split ';' | ForEach-Object { Write-Output $_ }
}
