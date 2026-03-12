param(
  [ValidateSet("test", "prod")]
  [string]$Target = "test",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Parse-SimpleYaml([string]$raw) {
  $root = @{}
  $current = $null
  foreach ($line in ($raw -split "`r?`n")) {
    if (-not $line.Trim() -or $line.TrimStart().StartsWith("#")) { continue }
    $match = [regex]::Match($line, '^(\s*)([A-Za-z0-9_]+):\s*(.*)$')
    if (-not $match.Success) { continue }
    $indent = $match.Groups[1].Value.Length
    $key = $match.Groups[2].Value
    $value = $match.Groups[3].Value.Trim()
    if ($indent -eq 0) {
      $root[$key] = @{}
      $current = $key
    } elseif ($null -ne $current) {
      $root[$current][$key] = $value
    }
  }
  return $root
}

$config = Parse-SimpleYaml (Get-Content "config/deploy.yaml" -Raw)
$yc = $config.yandex_cloud

if (-not $yc) { throw "Missing yandex_cloud section in config/deploy.yaml" }

$functionName = if ($Target -eq "test") { $yc.auth_function_name_test } else { $yc.auth_function_name_prod }
$ydbDatabase = if ($Target -eq "test") { $yc.ydb_database_test } else { $yc.ydb_database_prod }
$maskingSecretKey = if ($Target -eq "test") { "MASKING_SALT_TEST" } else { "MASKING_SALT_PROD" }
$oauthClientIdEnvName = if ($Target -eq "test") { "YANDEX_CLIENT_ID_TEST" } else { "YANDEX_CLIENT_ID_PROD" }
$oauthClientSecretEnvName = if ($Target -eq "test") { "YANDEX_CLIENT_SECRET_TEST" } else { "YANDEX_CLIENT_SECRET_PROD" }
$oauthClientIdValue = [Environment]::GetEnvironmentVariable($oauthClientIdEnvName)
$oauthClientSecretValue = [Environment]::GetEnvironmentVariable($oauthClientSecretEnvName)
$authBasePath = if ($Target -eq "test") { "/test/ops/auth" } else { "/ops/auth" }
$apiProxyBasePath = if ($Target -eq "test") { "/test/ops/api" } else { "/ops/api" }
$apiUpstreamOrigin = if ($Target -eq "test") { $yc.api_origin_test } else { $yc.api_origin_prod }

if (-not $functionName) { throw "Missing auth function name for target=$Target" }
if (-not $ydbDatabase) { throw "Missing ydb database path for target=$Target" }
if (-not $apiUpstreamOrigin) { throw "Missing api origin for target=$Target" }

npm run build --workspace @dtm/auth | Out-Host

$summary = [ordered]@{
  target = $Target
  function = $functionName
  contour = $Target
  authBasePath = $authBasePath
  apiProxyBasePath = $apiProxyBasePath
  apiUpstreamOrigin = $apiUpstreamOrigin
  ydbEndpoint = $yc.ydb_endpoint
  ydbDatabase = $ydbDatabase
  lockboxId = $yc.lockbox_id
  runtime = $yc.function_runtime
  entrypoint = $yc.function_entrypoint
  oauthClientIdEnv = $oauthClientIdEnvName
  oauthClientSecretEnv = $oauthClientSecretEnvName
  presetBucket = "dtm-presets"
  presetPublicBaseUrl = "http://dtm-presets.solofarm.ru"
}

if ($DryRun) {
  $summary.GetEnumerator() | ForEach-Object { Write-Host "$($_.Key): $($_.Value)" }
  exit 0
}

$tempDir = $null
$tempKeyPath = $null
if ($env:YC_SA_JSON_CREDENTIALS) {
  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("dtm-auth-yc-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tempDir | Out-Null
  $tempKeyPath = Join-Path $tempDir "sa-key.json"
  Set-Content -Path $tempKeyPath -Value $env:YC_SA_JSON_CREDENTIALS -NoNewline
  $env:YC_CONFIG_DIR = Join-Path $tempDir ".config"
  try {
    yc config profile create auth-deploy 2>$null | Out-Null
  } catch {
    # profile may already exist in a reused temp config
  }
  yc config set service-account-key $tempKeyPath | Out-Null
  yc config set folder-id $yc.folder_id | Out-Null
}

try {
  $null = yc serverless function get --name $functionName --format json 2>$null
} catch {
  yc serverless function create --name $functionName --folder-id $yc.folder_id | Out-Host
}

$secretArgs = @(
  "--secret", "id=$($yc.lockbox_id),key=SESSION_SIGNING_SECRET,environment-variable=SESSION_SIGNING_SECRET",
  "--secret", "id=$($yc.lockbox_id),key=COOKIE_NAME,environment-variable=COOKIE_NAME",
  "--secret", "id=$($yc.lockbox_id),key=COOKIE_PATH,environment-variable=COOKIE_PATH",
  "--secret", "id=$($yc.lockbox_id),key=COOKIE_SAMESITE,environment-variable=COOKIE_SAMESITE",
  "--secret", "id=$($yc.lockbox_id),key=COOKIE_SECURE,environment-variable=COOKIE_SECURE",
  "--secret", "id=$($yc.lockbox_id),key=SESSION_TTL_SECONDS,environment-variable=SESSION_TTL_SECONDS",
  "--secret", "id=$($yc.lockbox_id),key=$maskingSecretKey,environment-variable=MASKING_SALT"
)

$oauthArgs = @()
if ($oauthClientIdValue -and $oauthClientSecretValue) {
  $oauthArgs += @("--environment", "$oauthClientIdEnvName=$oauthClientIdValue")
  $oauthArgs += @("--environment", "$oauthClientSecretEnvName=$oauthClientSecretValue")
} else {
  $oauthArgs += @("--secret", "id=$($yc.lockbox_id),key=$oauthClientIdEnvName,environment-variable=$oauthClientIdEnvName")
  $oauthArgs += @("--secret", "id=$($yc.lockbox_id),key=$oauthClientSecretEnvName,environment-variable=$oauthClientSecretEnvName")
}

$envArgs = @(
  "--environment", "CONTOUR=$Target",
  "--environment", "BASE_URL=https://dtm.solofarm.ru",
  "--environment", "AUTH_BASE_PATH=$authBasePath",
  "--environment", "API_PROXY_BASE_PATH=$apiProxyBasePath",
  "--environment", "API_UPSTREAM_ORIGIN=$apiUpstreamOrigin",
  "--environment", "YDB_ENDPOINT=$($yc.ydb_endpoint)",
  "--environment", "YDB_DATABASE=$ydbDatabase",
  "--environment", "YDB_METADATA_CREDENTIALS=1",
  "--environment", "PRESET_BUCKET=dtm-presets",
  "--environment", "PRESET_PUBLIC_BASE_URL=http://dtm-presets.solofarm.ru",
  "--environment", "PRESET_STORAGE_ENDPOINT=https://storage.yandexcloud.net",
  "--environment", "PRESET_STORAGE_REGION=ru-central1"
)

if ($env:AWS_ACCESS_KEY_ID -and $env:AWS_SECRET_ACCESS_KEY) {
  $envArgs += @("--environment", "AWS_ACCESS_KEY_ID=$($env:AWS_ACCESS_KEY_ID)")
  $envArgs += @("--environment", "AWS_SECRET_ACCESS_KEY=$($env:AWS_SECRET_ACCESS_KEY)")
}

$args = @(
  "serverless", "function", "version", "create",
  "--function-name", $functionName,
  "--runtime", $yc.function_runtime,
  "--entrypoint", $yc.function_entrypoint,
  "--memory", $yc.function_memory,
  "--execution-timeout", $yc.function_timeout,
  "--service-account-id", $yc.service_account_id,
  "--source-path", "apps/auth/dist"
) + $envArgs + $secretArgs + $oauthArgs

yc @args | Out-Host

if ($tempDir -and (Test-Path $tempDir)) {
  Remove-Item -Recurse -Force $tempDir
}
