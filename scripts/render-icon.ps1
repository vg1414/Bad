param(
  [Parameter(Mandatory=$true)][int]$Size,
  [Parameter(Mandatory=$true)][string]$OutPath,
  [switch]$RoundedBg
)

Add-Type -AssemblyName System.Drawing

function New-SunIcon {
  param([int]$size, [string]$path, [bool]$roundedBg)

  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $cx = $size / 2.0
  $cy = $size / 2.0

  # Bakgrund: rundad kvadrat med mjuk teal-till-koral diagonal gradient
  $bgRect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $colorTop = [System.Drawing.Color]::FromArgb(255, 0, 168, 150)   # --tide
  $colorBot = [System.Drawing.Color]::FromArgb(255, 244, 99, 58)   # --coral
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $colorTop, $colorBot, 45.0)

  if ($roundedBg) {
    $radius = $size * 0.22
    $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path2.AddArc(0, 0, $d, $d, 180, 90)
    $path2.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path2.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $path2.AddArc(0, $size - $d, $d, $d, 90, 90)
    $path2.CloseFigure()
    $g.FillPath($bgBrush, $path2)
  } else {
    $g.FillRectangle($bgBrush, $bgRect)
  }

  # Solstrålar: vita/varma streck runt kärnan
  $rayColor = [System.Drawing.Color]::FromArgb(235, 255, 255, 255)
  $rayPen = New-Object System.Drawing.Pen($rayColor, [Math]::Max(1.0, $size * 0.028))
  $rayPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $rayPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $rayInner = $size * 0.30
  $rayOuter = $size * 0.40
  $rayCount = 12
  for ($i = 0; $i -lt $rayCount; $i++) {
    $angle = ($i / [double]$rayCount) * 2 * [Math]::PI
    $x1 = $cx + [Math]::Cos($angle) * $rayInner
    $y1 = $cy + [Math]::Sin($angle) * $rayInner
    $x2 = $cx + [Math]::Cos($angle) * $rayOuter
    $y2 = $cy + [Math]::Sin($angle) * $rayOuter
    $g.DrawLine($rayPen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
  }

  # Sol-kärna: varm gul-till-vit radial gradient med mjuk glow
  $coreRadius = $size * 0.235
  $glowRadius = $coreRadius * 1.35
  $glowRect = New-Object System.Drawing.RectangleF(($cx - $glowRadius), ($cy - $glowRadius), ($glowRadius * 2), ($glowRadius * 2))
  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddEllipse($glowRect)
  $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
  $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(120, 255, 255, 255)
  $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 255, 255))
  $g.FillPath($glowBrush, $glowPath)

  $coreRect = New-Object System.Drawing.RectangleF(($cx - $coreRadius), ($cy - $coreRadius), ($coreRadius * 2), ($coreRadius * 2))
  $corePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $corePath.AddEllipse($coreRect)
  $coreBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($corePath)
  $coreBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 255, 249, 219)
  $coreBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 255, 201, 74))
  $g.FillPath($coreBrush, $corePath)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

New-SunIcon -size $Size -path $OutPath -roundedBg:$RoundedBg.IsPresent
Write-Output "Wrote $OutPath ($Size x $Size)"
