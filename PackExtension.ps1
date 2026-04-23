# PackExtension.ps1

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceExtensionDir = Join-Path $scriptRoot "src\extension"
$manifestsDir = Join-Path $scriptRoot "src\manifests"
$outputDir = Join-Path $scriptRoot "output"

# --- Target selection ---
Write-Host "Select which extension should be created:" -ForegroundColor Cyan
Write-Host "1) Firefox"
Write-Host "2) Chrome"

$selection = Read-Host "Enter number (1 or 2)"

switch ($selection) {
    "1" {
        $target = "firefox"
        $manifestSource = Join-Path $manifestsDir "manifest.firefox.json"
        $outputName = "sownloader-firefox"
    }
    "2" {
        $target = "chrome"
        $manifestSource = Join-Path $manifestsDir "manifest.chrome.json"
        $outputName = "sownloader-chrome"
    }
    default {
        Write-Error "Invalid selection. Please enter 1 or 2."
        exit 1
    }
}

# --- Output type selection ---
Write-Host ""
Write-Host "Select output type:" -ForegroundColor Cyan
Write-Host "1) ZIP package"
Write-Host "2) Folder only"

$outputSelection = Read-Host "Enter number (1 or 2)"

switch ($outputSelection) {
    "1" { $createZip = $true }
    "2" { $createZip = $false }
    default {
        Write-Error "Invalid selection. Please enter 1 or 2."
        exit 1
    }
}

# --- Validation ---
if (-not (Test-Path $sourceExtensionDir)) {
    Write-Error "Extension source folder not found: $sourceExtensionDir"
    exit 1
}

if (-not (Test-Path $manifestSource)) {
    Write-Error "Manifest file not found: $manifestSource"
    exit 1
}

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# --- Prepare temp dir ---
$tempDir = Join-Path $env:TEMP ("sownloader-build-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    Write-Host "Copying extension files..." -ForegroundColor Yellow
    Copy-Item -Path (Join-Path $sourceExtensionDir "*") -Destination $tempDir -Recurse -Force

    Write-Host "Using manifest for $target..." -ForegroundColor Yellow
    Copy-Item -Path $manifestSource -Destination (Join-Path $tempDir "manifest.json") -Force

    $finalOutputPath = Join-Path $outputDir $outputName

    if (Test-Path $finalOutputPath) {
        Remove-Item $finalOutputPath -Recurse -Force
    }

    if ($createZip) {
        $zipPath = "$finalOutputPath.zip"

        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }

        Write-Host "Creating ZIP package..." -ForegroundColor Yellow
        Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -Force

        Write-Host "ZIP created: $zipPath" -ForegroundColor Green
    }
    else {
        Write-Host "Creating folder output..." -ForegroundColor Yellow
        Copy-Item -Path $tempDir -Destination $finalOutputPath -Recurse -Force

        Write-Host "Folder created: $finalOutputPath" -ForegroundColor Green
    }
}
finally {
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
}