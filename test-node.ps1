$nodePath = "C:\Program Files\nodejs\node.exe"
if (Test-Path $nodePath) {
    Write-Output "Node found at: $nodePath"
    & $nodePath --version
} else {
    Write-Output "Node not found at $nodePath"
}
