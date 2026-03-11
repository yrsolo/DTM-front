param(
  [string]$EnvFile = "",
  [string]$DeployConfigFile = "",
  [string]$ReleaseId = "",
  [ValidateSet("test", "prod")]
  [string]$Target = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Checked {
  param([ScriptBlock]$Command)
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE"
  }
}

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' not found in PATH."
  }
}

function Require-Env {
  param([string]$Name)
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

function Import-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $idx = $line.IndexOf("=")
    if ($idx -lt 1) {
      return
    }

    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1)

    if (
      $name -ne "YC_SA_JSON_CREDENTIALS" -and
      -not ($value.StartsWith('"') -and $value.EndsWith('"')) -and
      -not ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $hashIdx = $value.IndexOf("#")
      if ($hashIdx -ge 0) {
        $value = $value.Substring(0, $hashIdx)
      }
    }

    $value = $value.Trim()
    if (-not [string]::IsNullOrWhiteSpace($name) -and -not [string]::IsNullOrWhiteSpace($value)) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

function Parse-SimpleYaml {
  param([string]$Path)

  $result = @{}
  $currentSection = $null
  if (-not (Test-Path $Path)) {
    return $result
  }

  Get-Content $Path | ForEach-Object {
    $rawLine = $_
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $match = [regex]::Match($rawLine, '^(\s*)([A-Za-z0-9_]+):\s*(.*)$')
    if (-not $match.Success) {
      return
    }

    $indent = $match.Groups[1].Value.Length
    $key = $match.Groups[2].Value.Trim()
    $value = $match.Groups[3].Value.Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($indent -eq 0 -and [string]::IsNullOrWhiteSpace($value)) {
      $result[$key] = @{}
      $currentSection = $key
      return
    }

    if ($indent -gt 0 -and $null -ne $currentSection) {
      $result[$currentSection][$key] = $value
      return
    }

    if (-not [string]::IsNullOrWhiteSpace($key)) {
      $result[$key] = $value
    }
  }

  return $result
}

function Set-EnvIfMissing {
  param(
    [string]$Name,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return
  }
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name))) {
    [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
  }
}

function Normalize-DeployTarget {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "test"
  }

  $normalized = $Value.Trim().ToLowerInvariant()
  if ($normalized -ne "test" -and $normalized -ne "prod") {
    throw "Unsupported deploy target: $Value"
  }

  return $normalized
}

function Get-ReleaseId {
  param(
    [string]$ProvidedReleaseId,
    [string]$DeployTarget
  )

  if (-not [string]::IsNullOrWhiteSpace($ProvidedReleaseId)) {
    return $ProvidedReleaseId
  }

  $datePart = Get-Date -Format "yyyyMMdd-HHmmss"
  $shaPart = "local"
  try {
    $resolved = (git rev-parse --short HEAD 2>$null).Trim()
    if (-not [string]::IsNullOrWhiteSpace($resolved)) {
      $shaPart = $resolved
    }
  } catch {
    $shaPart = "local"
  }

  return "$DeployTarget-$datePart-$shaPart"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$webDir = Join-Path $repoRoot "apps/web"
$distDir = Join-Path $webDir "dist"
$publicConfigDir = Join-Path $webDir "public/config"
$defaultRuntimeConfigPath = Join-Path $repoRoot "apps/web/config/public.yaml"
$deployInfraConfigPath = Join-Path $repoRoot "config/deploy.yaml"

if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $EnvFile = Join-Path $repoRoot ".env"
} elseif (-not [System.IO.Path]::IsPathRooted($EnvFile)) {
  $EnvFile = Join-Path $repoRoot $EnvFile
}

if ([string]::IsNullOrWhiteSpace($DeployConfigFile)) {
  $DeployConfigFile = Join-Path $repoRoot "scripts/deploy.yaml"
} elseif (-not [System.IO.Path]::IsPathRooted($DeployConfigFile)) {
  $DeployConfigFile = Join-Path $repoRoot $DeployConfigFile
}

Import-DotEnv -Path $EnvFile

$deployYaml = Parse-SimpleYaml -Path $DeployConfigFile
$infraYaml = Parse-SimpleYaml -Path $deployInfraConfigPath
$ycInfra = $infraYaml["yandex_cloud"]
if (-not $ycInfra) {
  throw "Missing yandex_cloud section in config/deploy.yaml"
}

Set-EnvIfMissing -Name "YC_BUCKET_NAME" -Value $deployYaml["yc_bucket_name"]
Set-EnvIfMissing -Name "YC_ENDPOINT" -Value $deployYaml["yc_endpoint"]
Set-EnvIfMissing -Name "AWS_DEFAULT_REGION" -Value $deployYaml["aws_default_region"]
Set-EnvIfMissing -Name "DTM_WEB_PUBLIC_CONFIG_PATH" -Value $deployYaml["dtm_web_public_config_path"]
Set-EnvIfMissing -Name "DTM_WEB_DEPLOY_TARGET" -Value $deployYaml["dtm_web_deploy_target"]

if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("YC_ENDPOINT"))) {
  Set-EnvIfMissing -Name "YC_ENDPOINT" -Value "https://storage.yandexcloud.net"
}
if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("AWS_DEFAULT_REGION"))) {
  Set-EnvIfMissing -Name "AWS_DEFAULT_REGION" -Value "ru-central1"
}

$runtimeConfigPath = [Environment]::GetEnvironmentVariable("DTM_WEB_PUBLIC_CONFIG_PATH")
if ([string]::IsNullOrWhiteSpace($runtimeConfigPath)) {
  $runtimeConfigPath = $defaultRuntimeConfigPath
} elseif (-not [System.IO.Path]::IsPathRooted($runtimeConfigPath)) {
  $runtimeConfigPath = Join-Path $repoRoot $runtimeConfigPath
}

$deployTargetSource = if (-not [string]::IsNullOrWhiteSpace($Target)) {
  $Target
} else {
  [Environment]::GetEnvironmentVariable("DTM_WEB_DEPLOY_TARGET")
}
$deployTarget = Normalize-DeployTarget -Value $deployTargetSource

$bucket = if ($deployTarget -eq "test") { $ycInfra["frontend_bucket_test"] } else { $ycInfra["frontend_bucket_prod"] }
if ([string]::IsNullOrWhiteSpace($bucket)) {
  throw "Missing frontend bucket for target=$deployTarget in config/deploy.yaml"
}
[Environment]::SetEnvironmentVariable("YC_BUCKET_NAME", $bucket, "Process")

$sitePrefix = ""
$sitePrefixLabel = if ($deployTarget -eq "test") { "/test/" } else { "/" }
$configPrefix = "config"
$dataPrefix = "data"
$siteBucketUri = "s3://$bucket"
$releaseRootUri = "s3://$bucket/releases/$deployTarget"

Write-Host "Validating required commands..."
Require-Command "node"
Require-Command "npm"
if (-not $DryRun) {
  Require-Command "aws"
}

Write-Host "Validating required environment variables..."
$endpoint = Require-Env "YC_ENDPOINT"
[void](Require-Env "AWS_DEFAULT_REGION")
if (-not $DryRun) {
  [void](Require-Env "AWS_ACCESS_KEY_ID")
  [void](Require-Env "AWS_SECRET_ACCESS_KEY")
}

if (-not (Test-Path $runtimeConfigPath)) {
  throw "Runtime config file not found: $runtimeConfigPath"
}
if (-not (Test-Path $publicConfigDir)) {
  throw "Public config directory not found: $publicConfigDir"
}

if (-not (Test-Path (Join-Path $repoRoot "data/snapshot.example.json"))) {
  Write-Host "Warning: data/snapshot.example.json not found, fallback snapshot upload will be skipped."
}

if (-not $DryRun) {
  Write-Host "Checking AWS CLI..."
  Invoke-Checked { aws --version | Out-Null }
}

Write-Host "Installing frontend dependencies and building..."
Push-Location $webDir
try {
  if (Test-Path (Join-Path $webDir "package-lock.json")) {
    Invoke-Checked { npm ci }
  } else {
    Invoke-Checked { npm install }
  }
  Invoke-Checked { npm run build }
} finally {
  Pop-Location
}

if (-not (Test-Path $distDir)) {
  throw "Build output not found: $distDir"
}

$snapshotPath = Join-Path $repoRoot "data/snapshot.example.json"
$resolvedReleaseId = Get-ReleaseId -ProvidedReleaseId $ReleaseId -DeployTarget $deployTarget
$releasePrefix = "$releaseRootUri/$resolvedReleaseId"
$latestReleasePath = "$releaseRootUri/latest.json"
$releaseMetadataPath = Join-Path $repoRoot ".tmp.release.json"
$releaseMetadata = @{
  release_id = $resolvedReleaseId
  deploy_target = $deployTarget
  generated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
  git_ref = $env:GITHUB_REF
  git_sha = $env:GITHUB_SHA
  frontend_bucket = $bucket
}
$releaseMetadata | ConvertTo-Json -Depth 4 | Set-Content -Path $releaseMetadataPath -Encoding UTF8

Write-Host "Syncing dist assets (excluding index.html) ..."
$syncExcludeArgs = @("--exclude", "index.html", "--exclude", "config/*", "--exclude", "data/*", "--exclude", "releases/*")
if ($DryRun) {
  Write-Host "[DRY-RUN] aws s3 sync `"$distDir`" `"$siteBucketUri`" --delete $($syncExcludeArgs -join ' ') --endpoint-url `"$endpoint`" --cache-control `"public, max-age=31536000, immutable`""
} else {
  $syncArgs = @("s3", "sync", $distDir, $siteBucketUri, "--delete") + $syncExcludeArgs + @(
    "--endpoint-url",
    $endpoint,
    "--cache-control",
    "public, max-age=31536000, immutable"
  )
  Invoke-Checked {
    & aws @syncArgs
  }
}

Write-Host "Syncing public config directory to $sitePrefixLabel config/ ..."
if ($DryRun) {
  Write-Host "[DRY-RUN] aws s3 sync `"$publicConfigDir`" `"s3://$bucket/$configPrefix`" --delete --endpoint-url `"$endpoint`" --cache-control `"no-cache`""
} else {
  $configSyncArgs = @(
    "s3", "sync", $publicConfigDir, "s3://$bucket/$configPrefix",
    "--delete",
    "--endpoint-url", $endpoint,
    "--cache-control", "no-cache"
  )
  Invoke-Checked {
    & aws @configSyncArgs
  }
}

Write-Host "Uploading runtime config aliases to $sitePrefixLabel config/public.yaml ..."
if ($DryRun) {
  Write-Host "[DRY-RUN] aws s3 cp `"$runtimeConfigPath`" `"s3://$bucket/$configPrefix/public.yaml`" --endpoint-url `"$endpoint`" --content-type text/yaml --cache-control no-cache"
  Write-Host "[DRY-RUN] aws s3 cp `"$runtimeConfigPath`" `"s3://$bucket/$configPrefix/public.yam`" --endpoint-url `"$endpoint`" --content-type text/yaml --cache-control no-cache"
} else {
  Invoke-Checked { aws s3 cp $runtimeConfigPath "s3://$bucket/$configPrefix/public.yaml" --endpoint-url $endpoint --content-type "text/yaml" --cache-control "no-cache" }
  Invoke-Checked { aws s3 cp $runtimeConfigPath "s3://$bucket/$configPrefix/public.yam" --endpoint-url $endpoint --content-type "text/yaml" --cache-control "no-cache" }
}

if (Test-Path $snapshotPath) {
  Write-Host "Uploading fallback snapshot to $sitePrefixLabel data/snapshot.example.json ..."
  if ($DryRun) {
    Write-Host "[DRY-RUN] aws s3 cp `"$snapshotPath`" `"s3://$bucket/$dataPrefix/snapshot.example.json`" --endpoint-url `"$endpoint`" --content-type application/json --cache-control no-cache"
  } else {
    Invoke-Checked { aws s3 cp $snapshotPath "s3://$bucket/$dataPrefix/snapshot.example.json" --endpoint-url $endpoint --content-type "application/json" --cache-control "no-cache" }
  }
}

$indexTarget = "s3://$bucket/index.html"
Write-Host "Uploading index.html with no-cache to $sitePrefixLabel ..."
if ($DryRun) {
  Write-Host "[DRY-RUN] aws s3 cp `"$distDir/index.html`" `"$indexTarget`" --endpoint-url `"$endpoint`" --content-type `"text/html; charset=utf-8`" --cache-control no-cache"
} else {
  Invoke-Checked { aws s3 cp (Join-Path $distDir "index.html") $indexTarget --endpoint-url $endpoint --content-type "text/html; charset=utf-8" --cache-control "no-cache" }
}

Write-Host "Uploading release metadata ..."
if ($DryRun) {
  Write-Host "[DRY-RUN] aws s3 cp `"$releaseMetadataPath`" `"$releasePrefix/release.json`" --endpoint-url `"$endpoint`" --content-type application/json --cache-control no-cache"
  Write-Host "[DRY-RUN] aws s3 cp `"$releaseMetadataPath`" `"$latestReleasePath`" --endpoint-url `"$endpoint`" --content-type application/json --cache-control no-cache"
} else {
  Invoke-Checked { aws s3 cp $releaseMetadataPath "$releasePrefix/release.json" --endpoint-url $endpoint --content-type "application/json" --cache-control "no-cache" }
  Invoke-Checked { aws s3 cp $releaseMetadataPath $latestReleasePath --endpoint-url $endpoint --content-type "application/json" --cache-control "no-cache" }
}

Write-Host ""
if ($DryRun) {
  Write-Host "Dry-run complete (no upload executed)."
} else {
  Write-Host "Deploy complete."
}
Write-Host "Bucket: $bucket"
Write-Host "Target: $deployTarget"
Write-Host "Site path: $sitePrefixLabel"
Write-Host "ReleaseId: $resolvedReleaseId"
