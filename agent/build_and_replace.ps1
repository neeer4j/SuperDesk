# build_and_replace.ps1
# Builds the Electron agent using electron-builder and moves the produced installer
# to the current user's Downloads folder, replacing any previous installer with the same name.

param(
    [string]$OutName = "SuperDesk Agent Setup 1.0.0.exe",
    [switch]$KeepBackup
)

Write-Host "Starting build_and_replace.ps1..."

# Ensure script runs from agent directory
Push-Location -Path "$PSScriptRoot"

# Run electron-builder via npm script 'dist'
Write-Host "Running 'npm run dist'... (this can take a few minutes)"
$distResult = npm run dist

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed (npm run dist returned exit code $LASTEXITCODE). Aborting."
    Pop-Location
    exit $LASTEXITCODE
}

# Find the most recent exe in the dist folder
$exe = Get-ChildItem -Path "dist" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $exe) {
    Write-Error "No installer (.exe) found in 'dist' after build. Aborting."
    Pop-Location
    exit 2
}

$dest = Join-Path -Path $env:USERPROFILE -ChildPath "Downloads\$OutName"

if (Test-Path $dest) {
    if ($KeepBackup) {
        $timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
        $backup = "$dest.$timestamp.bak"
        Write-Host "Backing up existing installer to $backup"
        Copy-Item -Path $dest -Destination $backup -Force
    } else {
        Write-Host "Removing existing installer $dest"
        Remove-Item -Path $dest -Force
    }
}

Write-Host "Copying $($exe.FullName) -> $dest"
Copy-Item -Path $exe.FullName -Destination $dest -Force

Write-Host "Installer copied to Downloads: $dest"

Pop-Location
Write-Host "Done."
