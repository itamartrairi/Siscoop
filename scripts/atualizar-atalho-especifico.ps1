$icoPath = "c:\Users\Administrador\Downloads\Siscoop\cooperativismo.ico"
$targetExe = "C:\Program Files\Google\Chrome\Application\chrome_proxy.exe"
$targetArgs = "--profile-directory=Default --app-id=dgcbdljllddaofgfidgfnkdbnicdecck"
$workDir = "c:\Users\Administrador\Downloads\Siscoop"
$desc = "SICOOP PLATFORM - Sistema Integrado de Gestão de Cooperativas"

$wshShell = New-Object -ComObject WScript.Shell

$desktopDirs = @(
    "C:\Users\Administrador\OneDrive\Desktop",
    "C:\Users\Administrador\Desktop"
)

# 1. Atualizar ou criar Siscoop.lnk em todos os desktops
foreach ($d in $desktopDirs) {
    if (Test-Path $d) {
        $shortcutPath = Join-Path $d "Siscoop.lnk"
        $shortcut = $wshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $targetExe
        $shortcut.Arguments = $targetArgs
        $shortcut.IconLocation = "$icoPath,0"
        $shortcut.WorkingDirectory = $workDir
        $shortcut.Description = $desc
        $shortcut.Save()
        Write-Host "Atalho atualizado com sucesso: $shortcutPath"
    }
}

# 2. Procurar se existe outro atalho com esse app-id (ex: criado pelo próprio Chrome ao instalar o PWA) e trocar o ícone dele também
foreach ($d in $desktopDirs) {
    if (Test-Path $d) {
        $lnkFiles = Get-ChildItem -Path $d -Filter "*.lnk" -ErrorAction SilentlyContinue
        foreach ($f in $lnkFiles) {
            try {
                $sc = $wshShell.CreateShortcut($f.FullName)
                if ($sc.Arguments -like "*dgcbdljllddaofgfidgfnkdbnicdecck*" -or $sc.Arguments -like "*app-id=*") {
                    Write-Host "Encontrado atalho correspondente do Chrome: $($f.FullName)"
                    $sc.IconLocation = "$icoPath,0"
                    $sc.Save()
                    Write-Host "Ícone atualizado para o símbolo do cooperativismo em: $($f.FullName)"
                }
            } catch {
                # ignora erros de atalhos protegidos
            }
        }
    }
}
