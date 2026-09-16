$wshShell = New-Object -ComObject WScript.Shell
$desktopDirs = @(
    "C:\Users\Administrador\OneDrive\Desktop",
    "C:\Users\Administrador\Desktop"
)

foreach ($d in $desktopDirs) {
    if (Test-Path $d) {
        $files = @("Siscoop.lnk", "SICOOP PLATFORM.lnk")
        foreach ($name in $files) {
            $p = Join-Path $d $name
            if (Test-Path $p) {
                $sc = $wshShell.CreateShortcut($p)
                Write-Host "Arquivo: $p"
                Write-Host "Target: $($sc.TargetPath)"
                Write-Host "Arguments: $($sc.Arguments)"
                Write-Host "Icon: $($sc.IconLocation)"
                Write-Host "---"
            }
        }
    }
}
