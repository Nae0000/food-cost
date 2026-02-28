# PowerShell script: auto_push.ps1
# Place this file in e:\App\food-cost\ and run it to auto push to GitHub on every file change.

$repoPath = "e:\App\food-cost"
$gitExe = "git"   # If git is elsewhere, use full path e.g. "C:\Program Files\Git\cmd\git.exe"
$branch = "master"
$remote = "origin"
$debounceSeconds = 5   # Wait X seconds after a change before pushing

Set-Location $repoPath

Write-Host "Starting auto-push watcher for $repoPath" -ForegroundColor Cyan
Write-Host "   Branch: $branch | Remote: $remote" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoPath
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$lastPush = [DateTime]::MinValue


$action = {
    $global:pendingPush = $true
}

Register-ObjectEvent $watcher Changed -Action $action | Out-Null
Register-ObjectEvent $watcher Created -Action $action | Out-Null
Register-ObjectEvent $watcher Deleted -Action $action | Out-Null

while ($true) {
    Start-Sleep -Seconds 1
    if ($global:pendingPush) {
        $now = [DateTime]::Now
        if (($now - $lastPush).TotalSeconds -ge $debounceSeconds) {
            $global:pendingPush = $false
            $lastPush = $now

            Write-Host "[$now] Detected changes - pushing..." -ForegroundColor Yellow

            & $gitExe add -A 2>&1
            $statusLn = & $gitExe status --short 2>&1

            if ($statusLn) {
                $msg = "auto: update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                & $gitExe commit -m $msg 2>&1
                & $gitExe push $remote $branch 2>&1
                Write-Host "[$now] Push OK: $msg" -ForegroundColor Green
            }
            else {
                Write-Host "[$now] No changes - skip" -ForegroundColor DarkGray
            }
        }
    }
}
