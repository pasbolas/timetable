Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Akshat Pasbola\.gemini\antigravity-ide\brain\048e8d4e-6d9f-4e17-9105-40b99eed2ec3\.user_uploaded\media_1788426964592.png"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

# Source bounds: X=92, Y=24, W=838, H=738
$srcRect = New-Object System.Drawing.Rectangle(90, 22, 842, 742)

function Create-Icon {
    param(
        [int]$size,
        [string]$outputPath,
        [System.Drawing.Color]$bgColor,
        [float]$scaleRatio = 0.85
    )

    $target = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($target)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne [System.Drawing.Color]::Transparent) {
        $brush = New-Object System.Drawing.SolidBrush($bgColor)
        $g.FillRectangle($brush, 0, 0, $size, $size)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    # Calculate target dimensions
    $maxW = $size * $scaleRatio
    $maxH = $size * $scaleRatio

    $aspect = $srcRect.Width / $srcRect.Height
    if ($maxW / $maxH -gt $aspect) {
        $destH = [int]$maxH
        $destW = [int]($destH * $aspect)
    } else {
        $destW = [int]$maxW
        $destH = [int]($destW / $aspect)
    }

    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $destRect = New-Object System.Drawing.Rectangle($destX, $destY, $destW, $destH)
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $g.Dispose()
    $target.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $target.Dispose()
    Write-Host "Generated: $outputPath ($size x $size)"
}

$publicDir = "c:\Users\Akshat Pasbola\Desktop\myTimetable\public"

# 1. Standard transparent icons (purpose: any)
Create-Icon 512 "$publicDir\icon-512.png" ([System.Drawing.Color]::Transparent) 0.90
Create-Icon 192 "$publicDir\icon-192.png" ([System.Drawing.Color]::Transparent) 0.90

# 2. Maskable icon for Android PWA (safe zone 80%, on deep slate background #0f172a matching timetable theme)
$themeNavy = [System.Drawing.ColorTranslator]::FromHtml("#0f172a")
Create-Icon 512 "$publicDir\icon-maskable-512.png" $themeNavy 0.75

# 3. Apple Touch Icon (180x180) for iOS PWA Home Screen
# iOS requires non-transparent background; theme navy makes the white calendar and blue header stand out
Create-Icon 180 "$publicDir\apple-touch-icon.png" $themeNavy 0.78

# 4. Favicon 32x32 and 48x48
Create-Icon 32 "$publicDir\favicon-32x32.png" ([System.Drawing.Color]::Transparent) 0.92
Create-Icon 48 "$publicDir\favicon-48x48.png" ([System.Drawing.Color]::Transparent) 0.92

$src.Dispose()
Write-Host "All icons generated successfully!"
