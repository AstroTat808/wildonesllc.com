param(
  [Parameter(Mandatory=$true)]
  [string]$Source,

  [string]$EventKey,

  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,

  [int]$Quality = 86,

  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-Slug([string]$Value) {
  $slug = $Value.ToLowerInvariant()
  $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
  return $slug.Trim("-")
}

function Get-Converter {
  $magick = Get-Command magick -ErrorAction SilentlyContinue
  if ($magick) { return @{ Name = "magick"; Path = $magick.Source } }

  $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($ffmpeg) { return @{ Name = "ffmpeg"; Path = $ffmpeg.Source } }

  throw "No supported image converter found. Install ImageMagick (recommended) or FFmpeg and make sure magick.exe or ffmpeg.exe is available in PATH."
}

function Convert-ArchiveImage {
  param(
    [string]$ConverterName,
    [string]$ConverterPath,
    [string]$InputPath,
    [string]$OutputPath,
    [int]$Width,
    [int]$WebpQuality
  )

  if ($ConverterName -eq "magick") {
    & $ConverterPath $InputPath -auto-orient -strip -resize ($Width.ToString() + "x>") -quality $WebpQuality -define webp:method=6 $OutputPath
    if ($LASTEXITCODE -ne 0) { throw "ImageMagick failed converting $InputPath" }
    return
  }

  $vf = "scale='min($Width,iw)':-2"
  & $ConverterPath -hide_banner -loglevel error -y -i $InputPath -vf $vf -c:v libwebp -quality $WebpQuality -compression_level 6 $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed converting $InputPath" }
}

$manifestPath = Join-Path $RepoRoot "dist\assets\past-events\gallery-manifest.json"
if (-not (Test-Path $manifestPath)) {
  throw "Past-event gallery manifest not found: $manifestPath"
}

$sourcePath = (Resolve-Path $Source).Path
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$validKeys = @($manifest.events.PSObject.Properties.Name)

$jobs = @()
if ($EventKey) {
  if ($validKeys -notcontains $EventKey) {
    throw "Unknown EventKey '$EventKey'. Valid keys: $($validKeys -join ', ')"
  }
  $jobs += [pscustomobject]@{ Key = $EventKey; Folder = $sourcePath }
} else {
  Write-Step "Auto-detecting event folders"
  foreach ($key in $validKeys) {
    $candidate = Join-Path $sourcePath $key
    if (Test-Path $candidate -PathType Container) {
      $jobs += [pscustomobject]@{ Key = $key; Folder = (Resolve-Path $candidate).Path }
    }
  }

  if ($jobs.Count -eq 0) {
    throw "No event folders found under '$sourcePath'. Either pass -EventKey or create subfolders named: $($validKeys -join ', ')"
  }
}

$converter = Get-Converter
Write-Step "Using $($converter.Name) for WebP conversion"

$supported = @(".jpg",".jpeg",".png",".webp",".heic",".heif",".tif",".tiff",".bmp")
$totalImported = 0

foreach ($job in $jobs) {
  $key = $job.Key
  $folder = $job.Folder
  $event = $manifest.events.$key
  $eventTitle = [string]$event.title
  $outputDir = Join-Path $RepoRoot ("dist\assets\past-events\" + $key)
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

  Write-Step "Processing $eventTitle"
  Write-Host "Source : $folder"
  Write-Host "Output : $outputDir"

  $existingFull = @{}
  foreach ($photo in @($event.photos)) {
    if ($photo.full) { $existingFull[[string]$photo.full] = $true }
  }

  if ($Rebuild) {
    $event.photos = @()
    $existingFull = @{}
  }

  $files = Get-ChildItem -Path $folder -File -Recurse |
    Where-Object { $supported -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object FullName

  if ($files.Count -eq 0) {
    Write-Host "No supported images found." -ForegroundColor Yellow
    continue
  }

  $usedNames = @{}
  foreach ($photo in @($event.photos)) {
    if ($photo.full) {
      $usedNames[[System.IO.Path]::GetFileNameWithoutExtension([string]$photo.full).Replace("-1800","")] = $true
    }
  }

  $newPhotos = New-Object System.Collections.Generic.List[object]
  foreach ($photo in @($event.photos)) { $newPhotos.Add($photo) }

  $counter = 1
  foreach ($file in $files) {
    $base = Get-Slug $file.BaseName
    if (-not $base) { $base = "photo" }

    $candidate = "$key-$base"
    while ($usedNames.ContainsKey($candidate)) {
      $candidate = "$key-$base-" + $counter.ToString("00")
      $counter++
    }
    $usedNames[$candidate] = $true

    $thumbName = "$candidate-900.webp"
    $fullName = "$candidate-1800.webp"
    $thumbDisk = Join-Path $outputDir $thumbName
    $fullDisk = Join-Path $outputDir $fullName
    $thumbWeb = "assets/past-events/$key/$thumbName"
    $fullWeb = "assets/past-events/$key/$fullName"

    if ($existingFull.ContainsKey($fullWeb) -and -not $Rebuild) {
      Write-Host "Skipping existing manifest entry: $fullWeb"
      continue
    }

    Write-Host ("  " + $file.Name + " -> " + $candidate)
    Convert-ArchiveImage $converter.Name $converter.Path $file.FullName $thumbDisk 900 $Quality
    Convert-ArchiveImage $converter.Name $converter.Path $file.FullName $fullDisk 1800 $Quality

    $captionSource = [regex]::Replace($file.BaseName, "[-_]+", " ").Trim()
    if (-not $captionSource) { $captionSource = "Event photo" }

    $photoNumber = $newPhotos.Count + 1
    $layout = @("wide","portrait","standard","half","half","standard")[$photoNumber % 6]

    $entry = [ordered]@{
      thumb = $thumbWeb
      full = $fullWeb
      alt = "$eventTitle archival photo $photoNumber"
      caption = $captionSource
      layout = $layout
      source = $file.Name
    }
    $newPhotos.Add([pscustomobject]$entry)
    $totalImported++
  }

  $event.photos = @($newPhotos)
}

$manifest.version = 1
$json = $manifest | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText($manifestPath, ($json + [Environment]::NewLine), (New-Object System.Text.UTF8Encoding($false)))

Write-Step "Import complete"
Write-Host "Imported : $totalImported photo(s)"
Write-Host "Manifest : $manifestPath"
Write-Host ""
Write-Host "Next:"
Write-Host "  npm run qa:static"
Write-Host "  npm run qa:browser"
Write-Host ""
Write-Host "Review generated captions and alt text before publishing archival material."
