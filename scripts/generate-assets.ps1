Add-Type -AssemblyName System.Drawing

$assetsDir = 'C:\Users\Pablo\Downloads\strain-repo\assets'
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

$bgDark    = [System.Drawing.Color]::FromArgb(255, 10, 10, 10)
$bgDarker  = [System.Drawing.Color]::FromArgb(255, 5, 5, 5)
$blue      = [System.Drawing.Color]::FromArgb(255, 59, 130, 246)
$blueLight = [System.Drawing.Color]::FromArgb(255, 96, 165, 250)
$white     = [System.Drawing.Color]::FromArgb(255, 250, 250, 250)
$grey      = [System.Drawing.Color]::FromArgb(255, 163, 163, 163)

function Save-Png {
    param([System.Drawing.Bitmap]$bmp, [string]$path)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Get-BigFont {
    param([float]$size, [System.Drawing.FontStyle]$style = 'Bold')
    $families = @('Segoe UI', 'SF Pro Display', 'Helvetica', 'Arial')
    foreach ($f in $families) {
        try { return New-Object System.Drawing.Font($f, $size, $style) } catch {}
    }
    return New-Object System.Drawing.Font('Arial', $size, $style)
}

function Pt {
    param([int]$x, [int]$y)
    return New-Object System.Drawing.Point($x, $y)
}

# ============================================================
# 1. icon.png  — 1024x1024
# ============================================================
$bmp = New-Object System.Drawing.Bitmap(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$rect = New-Object System.Drawing.Rectangle(0, 0, 1024, 1024)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $bgDark, ([System.Drawing.Color]::FromArgb(255, 30, 58, 138)), 45)
$g.FillRectangle($brush, $rect)

$pen = New-Object System.Drawing.Pen($blue, 70)
$pen.LineJoin = 'Round'
$pen.StartCap = 'Round'
$pen.EndCap = 'Round'

$pts = [System.Drawing.Point[]]@(
    (Pt 600 250), (Pt 380 520), (Pt 560 520), (Pt 420 780)
)
$g.DrawLines($pen, $pts)

$accent = New-Object System.Drawing.Pen($blueLight, 50)
$accent.StartCap = 'Round'
$accent.EndCap = 'Round'
$g.DrawLine($accent, 500, 250, 700, 250)

$tb = New-Object System.Drawing.SolidBrush($grey)
$g.DrawString('S', (Get-BigFont -size 80 'Regular'), $tb, ([System.Drawing.PointF]::new(60, 60)))

$g.Dispose()
Save-Png $bmp (Join-Path $assetsDir 'icon.png')
Write-Host 'icon.png OK'

# ============================================================
# 2. adaptive-icon.png  — 1024x1024  foreground transparente
# ============================================================
$bmp = New-Object System.Drawing.Bitmap(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'

$pen2 = New-Object System.Drawing.Pen($blue, 80)
$pen2.LineJoin = 'Round'
$pen2.StartCap = 'Round'
$pen2.EndCap = 'Round'
$pts2 = [System.Drawing.Point[]]@(
    (Pt 680 280), (Pt 440 540), (Pt 640 540), (Pt 480 780)
)
$g.DrawLines($pen2, $pts2)

$g.Dispose()
Save-Png $bmp (Join-Path $assetsDir 'adaptive-icon.png')
Write-Host 'adaptive-icon.png OK'

# ============================================================
# 3. splash.png  — 1284x2778
# ============================================================
$bmp = New-Object System.Drawing.Bitmap(1284, 2778)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$g.Clear($bgDarker)

$cx = 642
$cy = 1100
$pen3 = New-Object System.Drawing.Pen($blue, 90)
$pen3.LineJoin = 'Round'
$pen3.StartCap = 'Round'
$pen3.EndCap = 'Round'

$g.TranslateTransform($cx - 500, $cy - 350)
$pts3 = [System.Drawing.Point[]]@(
    (Pt 800 100), (Pt 500 350), (Pt 720 350), (Pt 540 600)
)
$g.DrawLines($pen3, $pts3)
$g.ResetTransform()

$titleFont = Get-BigFont -size 140
$titleBrush = New-Object System.Drawing.SolidBrush($white)
$titleSize = $g.MeasureString('Strain', $titleFont)
$g.DrawString('Strain', $titleFont, $titleBrush, ([System.Drawing.PointF]::new(($cx - $titleSize.Width / 2), ($cy + 350))))

$tagFont = Get-BigFont -size 36 'Regular'
$tagBrush = New-Object System.Drawing.SolidBrush($grey)
$tagSize = $g.MeasureString('Entrenamiento, sin fricción', $tagFont)
$g.DrawString('Entrenamiento, sin fricción', $tagFont, $tagBrush, ([System.Drawing.PointF]::new(($cx - $tagSize.Width / 2), ($cy + 550))))

$g.Dispose()
Save-Png $bmp (Join-Path $assetsDir 'splash.png')
Write-Host 'splash.png OK'

# ============================================================
# 4. favicon.png  — 256x256
# ============================================================
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'

$bgBrush = New-Object System.Drawing.SolidBrush($bgDark)
$g.FillRectangle($bgBrush, 0, 0, 256, 256)

$pen4 = New-Object System.Drawing.Pen($blue, 20)
$pen4.LineJoin = 'Round'
$pen4.StartCap = 'Round'
$pen4.EndCap = 'Round'
$pts4 = [System.Drawing.Point[]]@(
    (Pt 170 60), (Pt 100 130), (Pt 150 130), (Pt 110 200)
)
$g.DrawLines($pen4, $pts4)

$g.Dispose()
Save-Png $bmp (Join-Path $assetsDir 'favicon.png')
Write-Host 'favicon.png OK'

Write-Host ''
Write-Host 'Generación local completada.'
Get-ChildItem $assetsDir -File | ForEach-Object {
    Write-Host ("  {0,-20}  {1,8} bytes" -f $_.Name, $_.Length)
}
