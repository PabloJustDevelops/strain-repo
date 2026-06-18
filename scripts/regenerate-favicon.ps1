Add-Type -AssemblyName System.Drawing

$assetsDir = 'C:\Users\Pablo\Downloads\strain-repo\assets'

# Paleta Strain (misma que el pack principal)
$bgTop    = [System.Drawing.Color]::FromArgb(255, 10, 10, 12)
$bgBottom = [System.Drawing.Color]::FromArgb(255, 24, 24, 28)
$blue     = [System.Drawing.Color]::FromArgb(255, 59, 130, 246)
$blueLite = [System.Drawing.Color]::FromArgb(255, 96, 165, 250)

# Símbolo "S" — misma forma geométrica que el resto del pack
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

    $u = $size / 4
    # Arco superior (de izquierda a derecha pasando por arriba)
    $arcRectTop = New-Object System.Drawing.Rectangle([int](0.5*$u), [int](0.5*$u), [int](3*$u), [int](1.2*$u))
    $g.DrawArc($pen, $arcRectTop, 180, 180)
    # Bajada diagonal al centro
    $g.DrawLine($pen, [int](2.7*$u), [int](1.7*$u), [int](1.3*$u), [int](2.0*$u))
    # Arco inferior (de izquierda a derecha pasando por abajo)
    $arcRectBottom = New-Object System.Drawing.Rectangle([int](0.5*$u), [int](2.3*$u), [int](3*$u), [int](1.2*$u))
    $g.DrawArc($pen, $arcRectBottom, 0, 180)
    $pen.Dispose()
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
    $path.Dispose()
}

# ============================================================
# favicon.png  — 512x512 (alta resolución, el navegador lo reescala)
# Mismo lenguaje visual que icon.png: gradiente + esquinas redondeadas
# ============================================================
$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.PixelOffsetMode = 'HighQuality'
$g.InterpolationMode = 'HighQualityBicubic'

# Fondo con gradiente vertical + esquinas redondeadas (igual que icon.png)
$radius = [int]($size * 0.225)   # ~115px
$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect, $bgTop, $bgBottom, ([System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
)
$null = Fill-Rounded $g $size $size $radius $bgBrush
$bgBrush.Dispose()

# Acento decorativo azul (mismo que icon.png, escalado)
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 59, 130, 246))
$g.FillEllipse($accentBrush, [int]($size*0.55), [int](-$size*0.25), [int]($size*0.7), [int]($size*0.7))
$accentBrush.Dispose()

# Símbolo "S" centrado con padding generoso
$pad = [int]($size * 0.18)
$g.TranslateTransform($pad, $pad)
$inner = $size - 2 * $pad
Draw-Strain-Symbol $g $inner $blue ([int]($inner * 0.07))
$g.ResetTransform()

# Rayo decorativo (mismo detalle que icon.png)
$boltPen = New-Object System.Drawing.Pen($blueLite, [int]($size * 0.025))
$boltPen.StartCap = 'Round'
$boltPen.EndCap = 'Round'
$boltPen.LineJoin = 'Round'
$pts = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point([int]($size*0.78), [int]($size*0.78))),
    (New-Object System.Drawing.Point([int]($size*0.72), [int]($size*0.85))),
    (New-Object System.Drawing.Point([int]($size*0.78), [int]($size*0.85))),
    (New-Object System.Drawing.Point([int]($size*0.74), [int]($size*0.92)))
)
$g.DrawLines($boltPen, $pts)
$boltPen.Dispose()

$g.Dispose()
$outPath = Join-Path $assetsDir 'favicon.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

# Verificar magic bytes
$bytes = [System.IO.File]::ReadAllBytes($outPath)[0..7]
$magic = ($bytes | ForEach-Object { $_.ToString('X2') }) -join ' '
$len = (Get-Item $outPath).Length
Write-Host "favicon.png regenerado: $size x $size, ${len} bytes, magic=$magic"