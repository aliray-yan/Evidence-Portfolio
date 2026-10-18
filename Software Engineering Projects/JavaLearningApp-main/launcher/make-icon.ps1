Add-Type -AssemblyName System.Drawing

$launcherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pngPath = Join-Path $launcherDir 'JavaMastery.png'
$icoPath = Join-Path $launcherDir 'JavaMastery.ico'

$size = 256
$bitmap = New-Object System.Drawing.Bitmap $size, $size
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(250, 237, 211))

$brown = [System.Drawing.Color]::FromArgb(74, 48, 34)
$brown2 = [System.Drawing.Color]::FromArgb(94, 61, 42)
$cream = [System.Drawing.Color]::FromArgb(255, 246, 229)
$white = [System.Drawing.Color]::FromArgb(255, 255, 248)

$circleBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle 18, 18, 220, 220),
    $brown2,
    $brown,
    45
)
$graphics.FillEllipse($circleBrush, 18, 18, 220, 220)
$graphics.DrawEllipse((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(116, 84, 62), 4)), 18, 18, 220, 220)

$dashPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(176, 138, 103), 1.6)
$dashPen.DashPattern = @(3, 4)
$graphics.DrawEllipse($dashPen, 28, 28, 200, 200)

$steamPen = New-Object System.Drawing.Pen $white, 8
$steamPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$steamPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$path1 = New-Object System.Drawing.Drawing2D.GraphicsPath
$path1.AddBezier(132, 36, 154, 62, 103, 68, 130, 96)
$graphics.DrawPath($steamPen, $path1)

$path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
$path2.AddBezier(145, 61, 164, 82, 117, 88, 140, 113)
$graphics.DrawPath($steamPen, $path2)

$cupPen = New-Object System.Drawing.Pen $white, 6
$cupPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$cupPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$cupBrush = New-Object System.Drawing.SolidBrush $cream

$cup = New-Object System.Drawing.Drawing2D.GraphicsPath
$cup.AddBezier(77, 103, 82, 154, 96, 171, 143, 169)
$cup.AddBezier(143, 169, 160, 158, 166, 126, 165, 103)
$cup.CloseFigure()
$graphics.FillPath($cupBrush, $cup)
$graphics.DrawPath($cupPen, $cup)
$graphics.DrawEllipse($cupPen, 73, 95, 96, 20)
$graphics.DrawArc($cupPen, 157, 111, 48, 42, -75, 230)
$graphics.DrawArc($cupPen, 169, 121, 24, 22, -70, 220)
$graphics.DrawArc($cupPen, 66, 159, 108, 24, 10, 160)

$javaFont = New-Object System.Drawing.Font 'Arial', 48, ([System.Drawing.FontStyle]::Bold)
$textFormat = New-Object System.Drawing.StringFormat
$textFormat.Alignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString('Java', $javaFont, (New-Object System.Drawing.SolidBrush $white), (New-Object System.Drawing.RectangleF 0, 171, 256, 62), $textFormat)

$graphics.Dispose()
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$stream = [System.IO.File]::Create($icoPath)
$writer = New-Object System.IO.BinaryWriter $stream
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$pngBytes.Length)
$writer.Write([UInt32]22)
$writer.Write($pngBytes)
$writer.Dispose()
$stream.Dispose()

Write-Host "Created $icoPath"
