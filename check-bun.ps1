$bunPath = "C:\Users\22874\.bun\bin\bun.exe"
if (Test-Path $bunPath) {
    Write-Output "Bun found!"
    & $bunPath --version
} else {
    Write-Output "Bun not found at $bunPath"
}
