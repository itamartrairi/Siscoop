Add-Type -AssemblyName System.Drawing

$projectDir = "c:\Users\Administrador\Downloads\Siscoop"
$publicDir = Join-Path $projectDir "public"
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir | Out-Null
}

$pngPath = Join-Path $publicDir "cooperativismo.png"
$icoPath = Join-Path $projectDir "cooperativismo.ico"
$icoPublicPath = Join-Path $publicDir "favicon.ico"

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# Símbolo oficial do Cooperativismo:
# Círculo amarelo/dourado com borda e dois pinheiros verdes estilizados
$center = 128
$radius = 118
$rect = New-Object System.Drawing.RectangleF(($center - $radius), ($center - $radius), ($radius * 2), ($radius * 2))

# Fundo circular dourado/amarelo radiante
$goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 185, 15))
$g.FillEllipse($goldBrush, $rect)

# Borda verde elegante do círculo
$greenPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0, 115, 60), 7)
$g.DrawEllipse($greenPen, $rect)

# Pincel para os pinheiros verdes oficiais do cooperativismo
$treeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 115, 60))

# Função para desenhar um pinheiro do cooperativismo
# Cada pinheiro é composto por 3 triângulos e um tronco
function Draw-PineTree($centerX, $topY, $scale) {
    # 1. Top triangle
    $p1 = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF($centerX, $topY)),
        (New-Object System.Drawing.PointF(($centerX - 24 * $scale), ($topY + 36 * $scale))),
        (New-Object System.Drawing.PointF(($centerX + 24 * $scale), ($topY + 36 * $scale)))
    )
    $g.FillPolygon($treeBrush, $p1)

    # 2. Middle triangle
    $midTopY = $topY + 24 * $scale
    $p2 = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF($centerX, $midTopY)),
        (New-Object System.Drawing.PointF(($centerX - 34 * $scale), ($midTopY + 44 * $scale))),
        (New-Object System.Drawing.PointF(($centerX + 34 * $scale), ($midTopY + 44 * $scale)))
    )
    $g.FillPolygon($treeBrush, $p2)

    # 3. Bottom triangle
    $botTopY = $topY + 52 * $scale
    $p3 = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF($centerX, $botTopY)),
        (New-Object System.Drawing.PointF(($centerX - 46 * $scale), ($botTopY + 54 * $scale))),
        (New-Object System.Drawing.PointF(($centerX + 46 * $scale), ($botTopY + 54 * $scale)))
    )
    $g.FillPolygon($treeBrush, $p3)

    # 4. Trunk
    $trunkTopY = $botTopY + 50 * $scale
    $trunkWidth = 14 * $scale
    $trunkHeight = 28 * $scale
    $trunkRect = New-Object System.Drawing.RectangleF(($centerX - $trunkWidth / 2), $trunkTopY, $trunkWidth, $trunkHeight)
    $g.FillRectangle($treeBrush, $trunkRect)
}

# Dois pinheiros lado a lado, unidos pela base (o símbolo universal do cooperativismo)
# Pinheiro da esquerda
Draw-PineTree 92 48 0.95
# Pinheiro da direita
Draw-PineTree 164 48 0.95

# Salva PNG de alta qualidade
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Constrói o arquivo .ICO padrão do Windows contendo o stream PNG de 256x256
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$pngLength = $pngBytes.Length

$icoStream = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($icoStream)

# ICONDIR Header
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type (1 = ICO)
$bw.Write([uint16]1) # Count (1 image)

# ICONDIRENTRY (256x256 PNG icon)
$bw.Write([byte]0)   # Width: 0 means 256
$bw.Write([byte]0)   # Height: 0 means 256
$bw.Write([byte]0)   # ColorCount: 0 means > 256
$bw.Write([byte]0)   # Reserved
$bw.Write([uint16]1) # Color planes
$bw.Write([uint16]32)# Bits per pixel
$bw.Write([uint32]$pngLength) # Image size
$bw.Write([uint32]22) # Offset of image data (6 header + 16 entry = 22)

# Write PNG payload
$bw.Write($pngBytes)
$bw.Flush()

[System.IO.File]::WriteAllBytes($icoPath, $icoStream.ToArray())
[System.IO.File]::WriteAllBytes($icoPublicPath, $icoStream.ToArray())

$g.Dispose()
$bmp.Dispose()
$ms.Dispose()
$icoStream.Dispose()

Write-Host "Ícones gerados com sucesso:"
Write-Host " - PNG: $pngPath"
Write-Host " - ICO: $icoPath"
Write-Host " - Favicon: $icoPublicPath"

# Criação do atalho na Área de Trabalho
$desktopPaths = @(
    "C:\Users\Administrador\OneDrive\Desktop",
    "C:\Users\Administrador\Desktop"
)

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}

$wshShell = New-Object -ComObject WScript.Shell

foreach ($dPath in $desktopPaths) {
    if (Test-Path $dPath) {
        $shortcutPath = Join-Path $dPath "Siscoop.lnk"
        $shortcut = $wshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $chromePath
        $shortcut.Arguments = "--app=http://localhost:3000 --window-size=1366,768"
        $shortcut.Description = "SICOOP PLATFORM - Sistema Integrado de Gestão de Cooperativas"
        $shortcut.WorkingDirectory = $projectDir
        $shortcut.IconLocation = "$icoPath,0"
        $shortcut.Save()
        Write-Host "Atalho criado na Área de Trabalho: $shortcutPath"
    }
}
