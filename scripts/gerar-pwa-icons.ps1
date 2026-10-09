Add-Type -AssemblyName System.Drawing

$projectDir = "c:\Users\Administrador\Downloads\Siscoop"
$publicDir = Join-Path $projectDir "public"

function Generate-CoopPng($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $center = $size / 2
    $radius = $size * 0.46
    $rect = New-Object System.Drawing.RectangleF(($center - $radius), ($center - $radius), ($radius * 2), ($radius * 2))

    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 185, 15))
    $g.FillEllipse($goldBrush, $rect)

    $borderWidth = [Math]::Max(2, ($size * 0.027))
    $greenPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0, 115, 60), $borderWidth)
    $g.DrawEllipse($greenPen, $rect)

    $treeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 115, 60))

    $scale = ($size / 256) * 0.95
    $leftX = $center - ($size * 0.14)
    $rightX = $center + ($size * 0.14)
    $topY = $size * 0.187

    function Draw-Tree($cX, $tY, $s) {
        $p1 = [System.Drawing.PointF[]]@(
            (New-Object System.Drawing.PointF($cX, $tY)),
            (New-Object System.Drawing.PointF(($cX - 24 * $s), ($tY + 36 * $s))),
            (New-Object System.Drawing.PointF(($cX + 24 * $s), ($tY + 36 * $s)))
        )
        $g.FillPolygon($treeBrush, $p1)

        $mY = $tY + 24 * $s
        $p2 = [System.Drawing.PointF[]]@(
            (New-Object System.Drawing.PointF($cX, $mY)),
            (New-Object System.Drawing.PointF(($cX - 34 * $s), ($mY + 44 * $s))),
            (New-Object System.Drawing.PointF(($cX + 34 * $s), ($mY + 44 * $s)))
        )
        $g.FillPolygon($treeBrush, $p2)

        $bY = $tY + 52 * $s
        $p3 = [System.Drawing.PointF[]]@(
            (New-Object System.Drawing.PointF($cX, $bY)),
            (New-Object System.Drawing.PointF(($cX - 46 * $s), ($bY + 54 * $s))),
            (New-Object System.Drawing.PointF(($cX + 46 * $s), ($bY + 54 * $s)))
        )
        $g.FillPolygon($treeBrush, $p3)

        $trunkY = $bY + 50 * $s
        $trunkW = 14 * $s
        $trunkH = 28 * $s
        $trunkRect = New-Object System.Drawing.RectangleF(($cX - $trunkW / 2), $trunkY, $trunkW, $trunkH)
        $g.FillRectangle($treeBrush, $trunkRect)
    }

    Draw-Tree $leftX $topY $scale
    Draw-Tree $rightX $topY $scale

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Gerado: $outputPath"
}

Generate-CoopPng 192 (Join-Path $publicDir "icon-192.png")
Generate-CoopPng 512 (Join-Path $publicDir "icon-512.png")
Generate-CoopPng 192 (Join-Path $publicDir "icon-192-maskable.png")
Generate-CoopPng 512 (Join-Path $publicDir "icon-512-maskable.png")
