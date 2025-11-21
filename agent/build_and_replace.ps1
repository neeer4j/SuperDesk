# build_and_replace.ps1
# Builds the Electron agent using electron-builder and moves the produced installer
# to the current user's Downloads folder, replacing any previous installer with the same name.

param(
    [string]$OutName = "SuperDesk Agent Setup 1.0.0.exe",
    [switch]$KeepBackup,
    [int]$KeepCount = 5,
    [switch]$SkipBuild
)

Write-Host "Starting build_and_replace.ps1..."

# Ensure script runs from agent directory
Push-Location -Path "$PSScriptRoot"

# Run electron-builder via npm script 'dist'
if (-not $SkipBuild) {
    Write-Host "Running 'npm run dist'... (this can take a few minutes)"
    $distResult = npm run dist
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Initial build failed (npm run dist returned exit code $LASTEXITCODE). Attempting fallback build to a temporary output directory."

        # Fallback: attempt build to a temporary directory to avoid locked dist
        $tempOutDir = "dist-temp-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $tempConfig = "electron-builder-temp-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
        Write-Host "Attempting fallback build to $tempOutDir with temp config $tempConfig"
        $json = @{ directories = @{ output = $tempOutDir } } | ConvertTo-Json -Depth 10
        Set-Content -Path $tempConfig -Value $json -Encoding UTF8
        $distResult = npx electron-builder --config $tempConfig --publish=never
        Remove-Item -Path $tempConfig -Force -ErrorAction SilentlyContinue
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Fallback build failed (npm run dist returned exit code $LASTEXITCODE). Aborting."
            Pop-Location
            exit $LASTEXITCODE
        }

        # If fallback succeeded, locate the exe inside tempOutDir and set exePath
        $exe = Get-ChildItem -Path $tempOutDir -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $exe) {
            Write-Error "No installer (.exe) found in '$tempOutDir' after fallback build. Aborting."
            Pop-Location
            exit 3
        }
        Write-Host "Found installer in fallback output: $($exe.FullName)"

        # Use the fallback-built exe for copy; mark that we used tempOutDir
        $usedTempOutDir = $tempOutDir
    } else {
        Write-Host "Build succeeded into dist (default output)."
    }
} else {
    Write-Host "Skipping build step (SkipBuild flag provided)."
}

# Find the most recent exe in the dist folder
$exe = Get-ChildItem -Path "dist" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $exe -and $usedTempOutDir) {
    # If no exe found in dist but we have a temp output folder, use that exe
    $exe = Get-ChildItem -Path "$usedTempOutDir" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
if (-not $exe) {
    Write-Error "No installer (.exe) found in 'dist' after build. Aborting."
    Pop-Location
    exit 2
}

$dest = Join-Path -Path $env:USERPROFILE -ChildPath "Downloads\$OutName"

# Create a timestamped installer filename so we can keep unique copies
$timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($OutName)
$ext = [System.IO.Path]::GetExtension($OutName)
$timestampedName = "${baseName}-$timestamp$ext"
$timestampedDest = Join-Path -Path $env:USERPROFILE -ChildPath "Downloads\$timestampedName"

if (Test-Path $dest) {
    if ($KeepBackup) {
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
Write-Host "Also copying a timestamped copy: $($exe.FullName) -> $timestampedDest"
Copy-Item -Path $exe.FullName -Destination $timestampedDest -Force

# Prune older timestamped installers (keep only $KeepCount latest)
try {
    Write-Host "Pruning old installers in Downloads (keeping $KeepCount latest)..."
    $pattern = "${baseName}-*${ext}"
    $all = Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Filter $pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($null -ne $all -and $all.Count -gt $KeepCount) {
        $toRemove = $all | Select-Object -Skip $KeepCount
        foreach ($f in $toRemove) {
            try {
                Remove-Item -Path $f.FullName -Force -ErrorAction Stop
                Write-Host "Removed old installer: $($f.Name)"
            } catch {
                Write-Warning "Failed to remove $($f.Name): $_"
            }
        }
    } else {
        Write-Host "No old installers to prune (found $($all.Count))."
    }
} catch {
    Write-Warning "Prune step failed: $_"
}

Write-Host "Installer copied to Downloads: $dest"
if ($usedTempOutDir) {
    try {
        Remove-Item -Path $usedTempOutDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed temporary build output folder: $usedTempOutDir"
    } catch {
        Write-Warning ("Failed to remove temporary folder: {0} - {1}" -f $usedTempOutDir, $_)
    }
}

Pop-Location
Write-Host "Done."
