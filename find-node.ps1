# Check for Node.js in common locations
$locations = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\node\node.exe",
    "$env:APPDATA\npm\node.exe"
)

foreach ($loc in $locations) {
    if (Test-Path $loc) {
        Write-Output "Found: $loc"
        & $loc --version
        exit
    }
}

# If not found, try refresh environment and search again
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Output "Searching in PATH..."
Get-Command node -ErrorAction SilentlyContinue | ForEach-Object { 
    Write-Output "Found: $($_.Source)"
    & $_.Source --version
}
