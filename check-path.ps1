$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
Write-Output "Machine PATH:"
Write-Output $machinePath
Write-Output ""
Write-Output "User PATH:"
Write-Output $userPath
