# PowerShell script: auto_push.ps1
# วางไฟล์นี้ไว้ใน e:\App\food-cost\ แล้วรันเพื่อ auto push ขึ้น GitHub ทุกครั้งที่มีการแก้ไขไฟล์

$repoPath = "e:\App\food-cost"
$gitExe = "git"   # ถ้า git อยู่ที่อื่น ให้แก้เป็น full path เช่น "C:\Program Files\Git\cmd\git.exe"
$branch = "master"
$remote = "origin"
$debounceSeconds = 5   # รอ X วินาทีหลังแก้ไขก่อน push

Set-Location $repoPath

Write-Host "🚀 Starting auto-push watcher for $repoPath" -ForegroundColor Cyan
Write-Host "   Branch: $branch | Remote: $remote" -ForegroundColor Gray
Write-Host "   กด Ctrl+C เพื่อหยุด`n" -ForegroundColor Gray

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoPath
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$lastPush = [DateTime]::MinValue
$timer = $null

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

            Write-Host "[$now] 📂 ตรวจพบการเปลี่ยนแปลง — กำลัง push..." -ForegroundColor Yellow

            & $gitExe add -A 2>&1
            $statusLn = & $gitExe status --short 2>&1
            
            if ($statusLn) {
                $msg = "auto: update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                & $gitExe commit -m $msg 2>&1
                & $gitExe push $remote $branch 2>&1
                Write-Host "[$now] ✅ Push สำเร็จ: $msg" -ForegroundColor Green
            }
            else {
                Write-Host "[$now] ℹ️  ไม่มีการเปลี่ยนแปลง — ข้าม" -ForegroundColor DarkGray
            }
        }
    }
}
