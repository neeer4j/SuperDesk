Param()
$icoPath = Join-Path $PSScriptRoot '..\agent\assets\icon.ico'
$sizes = @(16,32,48,64,128,256,512,1024)
Add-Type -AssemblyName System.Drawing
foreach ($s in $sizes) {
    try {
        $icon = New-Object System.Drawing.Icon($icoPath, $s, $s)
        $bmp = $icon.ToBitmap()
        $out = Join-Path $PSScriptRoot "..\agent\assets\icon-$(${s})x$(${s}).png"
        $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "Saved $out"
    } catch {
        Write-Warning ("Failed {0}: {1}" -f $s, $_)
    }
}
Get-ChildItem -Path (Join-Path $PSScriptRoot '..\agent\assets') -Filter 'icon-*x*.png' | Select-Object Name,Length | Format-Table -AutoSize
