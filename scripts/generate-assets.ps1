Add-Type -AssemblyName System.Drawing

$assetsDir = 'C:\Users\Pablo\Downloads\strain-repo\assets'
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

# ============================================================
# Paleta Strain
# ============================================================
$bgTop    = [System.Drawing.Color]::FromArgb(255, 10, 10, 12)
$bgBottom = [System.Drawing.Color]::FromArgb(255, 24, 24, 28)
$bgCard   = [System.Drawing.Color]::FromArgb(255, 38, 38, 42)
$blue     = [System.Drawing.Color]::FromArgb(255, 59, 130, 246)
$blueLite = [System.Drawing.Color]::FromArgb(255, 96, 165, 250)
$white    = [System.Drawing.Color]::FromArgb(255, 250, 250, 250)
$grey     = [System.Drawing.Color]::FromArgb(255, 163, 163, 163)

function Save-Png {
    param([System.Drawing.Bitmap]$bmp, [string]$path)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Get-BigFont {
    param([float]$size, [System.Drawing.FontStyle]$style = 'Bold')
    $families = @('Segoe UI', 'SF Pro Display', 'Helvetica Neue', 'Arial')
    foreach ($f in $families) {
        try { return New-Object System.Drawing.Font($f, $size, $style) } catch {}
    }
    return New-Object System.Drawing.Font('Arial', $size, $style)
}

# StringFormat que centra horizontal y verticalmente
$centered = New-Object System.Drawing.StringFormat
$centered.Alignment = [System.Drawing.StringAlignment]::Center
$centered.LineAlignment = [System.Drawing.StringAlignment]::Center

# ============================================================
# Dibuja el símbolo "S" estilizada como un path geométrico
# limpio y centrado en el área dada. Devuelve el bitmap.
# ============================================================
function Draw-Strain-Symbol {
    param(
        [System.Drawing.Graphics]$g,
        [int]$size,
        [System.Drawing.Color]$color,
        [int]$thickness
    )
    $pen = New-Object System.Drawing.Pen($color, $thickness)
    $pen.StartCap = 'Round'
    $pen.EndCap = 'Round'
    $pen.LineJoin = 'Round'

    # Diseño: dos arcos + dos líneas rectas que forman una S
    # basadas en una cuadrícula 4x4 dentro de [0,size].
    #
    #  ┌───────────┐
    #  │  ▄▄▄▄     │   (arco superior)
    #  │ ▀▀▀▀      │
    #  │  ████     │   (línea media)
    #  │      ████ │
    #  │      ▀▀▀▀ │   (arco inferior)
    #  │  ▄▄▄▄     │
    #  └───────────┘

    $u = $size / 4                    # unidad base
    $t = $thickness
    $m = [int]($u * 0.20)             # margen interno

    # Puntos clave (relativos a 0,0 arriba-izquierda)
    $topRightX     = [int](3 * $u)
    $topLeftX      = [int](1 * $u)
    $midRightX     = [int](3 * $u)
    $midLeftX      = [int](1 * $u)
    $bottomRightX  = [int](3 * $u)
    $bottomLeftX   = [int](1 * $u)

    $topY    = [int](1 * $u)
    $midY    = [int](2 * $u)
    $bottomY = [int](3 * $u)

    # Trazo 1: arco superior (de izquierda a derecha pasando por arriba)
    $arcRectTop = New-Object System.Drawing.Rectangle([int](0.5*$u), [int](0.5*$u), [int](3*$u), [int](1.2*$u))
    $g.DrawArc($pen, $arcRectTop, 180, 180)

    # Trazo 2: bajamos del final del arco a la línea media
    $g.DrawLine($pen, [int](2.7*$u), [int](1.7*$u), [int](1.3*$u), [int](2.0*$u))

    # Trazo 3: arco inferior (de izquierda a derecha pasando por abajo)
    $arcRectBottom = New-Object System.Drawing.Rectangle([int](0.5*$u), [int](2.3*$u), [int](3*$u), [int](1.2*$u))
    $g.DrawArc($pen, $arcRectBottom, 0, 180)

    return $pen
}

function Fill-Rounded {
    param(
        [System.Drawing.Graphics]$g,
        [int]$width,
        [int]$height,
        [int]$radius,
        [System.Drawing.Brush]$brush
    )
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($width - $d, 0, $d, $d, 270, 90)
    $path.AddArc($width - $d, $height - $d, $d, $d, 0, 90)
    $path.AddArc(0, $height - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
    return $path
}

# ============================================================
# 1. icon.png  — 1024x1024
# ============================================================
$iconSize = 1024
$bmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$g.PixelOffsetMode = 'HighQuality'
$g.InterpolationMode = 'HighQualityBicubic'

# Fondo con esquinas redondeadas (iOS-style) + gradiente sutil
$radius = [int]($iconSize * 0.225)  # ~230px
$rect = New-Object System.Drawing.Rectangle(0, 0, $iconSize, $iconSize)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect, $bgTop, $bgBottom, ([System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
)
$null = Fill-Rounded $g $iconSize $iconSize $radius $bgBrush
$bgBrush.Dispose()

# Acento decorativo en la esquina (círculo sutil azul)
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 59, 130, 246))
$g.FillEllipse($accentBrush, [int]($iconSize*0.55), [int](-$iconSize*0.25), [int]($iconSize*0.7), [int]($iconSize*0.7))
$accentBrush.Dispose()

# Símbolo "S" centrado y bien dimensionado
$g.TranslateTransform([int]($iconSize * 0.18), [int]($iconSize * 0.18))
$sSize = [int]($iconSize * 0.64)
$null = Draw-Strain-Symbol $g $sSize $blue ([int]($iconSize * 0.07))
$g.ResetTransform()

# Pequeña marca de rayo en la parte inferior derecha (opcional, sutil)
$boltPen = New-Object System.Drawing.Pen($blueLite, [int]($iconSize * 0.025))
$boltPen.StartCap = 'Round'
$boltPen.EndCap = 'Round'
$boltPen.LineJoin = 'Round'
$pts = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point([int]($iconSize*0.78), [int]($iconSize*0.78))),
    (New-Object System.Drawing.Point([int]($iconSize*0.72), [int]($iconSize*0.85))),
    (New-Object System.Drawing.Point([int]($iconSize*0.78), [int]($iconSize*0.85))),
    (New-Object System.Drawing.Point([int]($iconSize*0.74), [int]($iconSize*0.92)))
)
$g.DrawLines($boltPen, $pts)
$boltPen.Dispose()

$g.Dispose()
Save-Png $bmp (Join-Path $assetsDir 'icon.png')
Write-Host "icon.png OK ($iconSize x $iconSize)"

# ============================================================
# 2. adaptive-icon.png  — 1024x1024  foreground transparente
# ============================================================
# Solo el símbolo, centrado, con padding generoso (~25%)
$bmp = New-Object System.Drawing.Bitmap(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$g.PixelOffsetMode = 'HighQuality'

# Padding del 25% como pide Android Adaptive Icon
$padding = [int](1024 * 0.25)
$offset = $padding
$inner = 1024 - 2 * $padding

$g.TranslateTransform($offset, $offset)
$null = Draw-Strain-Symbol $g $inner $blue ([int]($inner * 0.09))
$g.ResetTransform()

$g.Dispose()
Save-Png $bmp (Join-Path $assetsDir 'adaptive-icon.png')
Write-Host "adaptive-icon.png OK (1024x1024, transparente)"

# ============================================================
# 3. splash.png  — 1284x2778  (iPhone 14 Pro Max)
# ============================================================
$splashW = 1284
$splashH = 2778
$bmp = New-Object System.Drawing.Bitmap($splashW, $splashH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$g.PixelOffsetMode = 'HighQuality'

# Fondo con gradiente vertical
$rect = New-Object System.Drawing.Rectangle(0, 0, $splashW, $splashH)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect, $bgTop, $bgBottom, ([System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
)
$g.FillRectangle($bgBrush, $rect)
$bgBrush.Dispose()

# Acento decorativo arriba (círculo azul muy desvanecido)
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 59, 130, 246))
$g.FillEllipse($accentBrush, -200, -600, 1400, 1400)
$accentBrush.Dispose()
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 96, 165, 250))
$g.FillEllipse($accentBrush, 600, 1900, 1200, 1200)
$accentBrush.Dispose()

# Calcular layout vertical centrado
$centerX = [int]($splashW / 2)
$logoSize = [int]($splashW * 0.45)         # 577
$logoY = [int]($splashH * 0.35)             # 972 — tercio superior
$titleY = $logoY + $logoSize + 120          # debajo del logo
$tagY = $titleY + 220                       # debajo del título

# Logo "S" centrado horizontalmente, posición Y controlada
$g.TranslateTransform([int]($centerX - $logoSize/2), $logoY)
$null = Draw-Strain-Symbol $g $logoSize $blue ([int]($logoSize * 0.07))
$g.ResetTransform()

# Wordmark "Strain" — usar StringFormat.Center
$titleFont = Get-BigFont -size 200
$titleBrush = New-Object System.Drawing.SolidBrush($white)
$titleRect = New-Object System.Drawing.RectangleF(
    0,
    [float]$titleY,
    [float]$splashW,
    240
)
$g.DrawString('Strain', $titleFont, $titleBrush, $titleRect, $centered)
$titleFont.Dispose()
$titleBrush.Dispose()

# Tagline
$tagFont = Get-BigFont -size 56 'Regular'
$tagBrush = New-Object System.Drawing.SolidBrush($grey)
$tagRect = New-Object System.Drawing.RectangleF(
    0,
    [float]$tagY,
    [float]$splashW,
    100
)
$g.DrawString('Entrenamiento, sin fricción', $tagFont, $tagBrush, $tagRect, $centered)
$tagFont.Dispose()
$tagBrush.Dispose()

$g.Dispose()
Save-Png $bmp (Join-Path $assetsDir 'splash.png')
Write-Host "splash.png OK ($splashW x $splashH)"

# ============================================================
# 4. favicon.png  — 256x256
# ============================================================
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$g.PixelOffsetMode = 'HighQuality'

# Fondo sólido oscuro con esquinas redondeadas
$favRadius = 48
$bgBrush = New-Object System.Drawing.SolidBrush($bgTop)
$null = Fill-Rounded $g 256 256 $favRadius $bgBrush
$bgBrush.Dispose()

# Símbolo "S" centrado
$g.TranslateTransform(40, 40)
$null = Draw-Strain-Symbol $g 176 $blue 18
$g.ResetTransform()

$g.Dispose()
Save-Png $bmp (Join-Path $assetsDir 'favicon.png')
Write-Host "favicon.png OK (256x256)"

# ============================================================
# Resumen
# ============================================================
Write-Host ''
Write-Host 'Generación completada.'
Get-ChildItem $assetsDir -File | ForEach-Object {
    $first4 = [System.IO.File]::ReadAllBytes($_.FullName)[0..3]
    $magic = ($first4 | ForEach-Object { $_.ToString('X2') }) -join '-'
    Write-Host ("  {0,-22}  {1,9} bytes  magic={2}" -f $_.Name, $_.Length, $magic)
}
