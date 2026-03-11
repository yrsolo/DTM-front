param(
  [ValidateSet("test", "prod")]
  [string]$Target = "test",
  [switch]$DryRun,
  [string]$ReleaseId = "",
  [switch]$SkipFrontend,
  [switch]$SkipAuth
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "=== $Name ==="
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

$envFile = Join-Path $repoRoot ".env"
$frontendDeployConfig = Join-Path $repoRoot "scripts/deploy.yaml"
if ($Target -eq "prod") {
  $prodEnv = Join-Path $repoRoot ".env.prod"
  if (Test-Path $prodEnv) {
    $envFile = $prodEnv
  }
  $frontendDeployConfig = Join-Path $repoRoot "scripts/deploy.prod.yaml"
}

Write-Host "Combined deploy target: $Target"
Write-Host "Env file: $envFile"
Write-Host "Frontend deploy config: $frontendDeployConfig"
Write-Host "Dry-run: $DryRun"
Write-Host "Skip frontend: $SkipFrontend"
Write-Host "Skip auth: $SkipAuth"

if (-not $SkipFrontend) {
  $frontendArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $scriptDir "deploy_frontend.ps1"),
    "-EnvFile", $envFile,
    "-DeployConfigFile", $frontendDeployConfig,
    "-Target", $Target
  )
  if ($DryRun) {
    $frontendArgs += "-DryRun"
  }
  if (-not [string]::IsNullOrWhiteSpace($ReleaseId)) {
    $frontendArgs += @("-ReleaseId", $ReleaseId)
  }

  Invoke-Step -Name "Frontend deploy" -Action {
    & powershell @frontendArgs
  }
}

if (-not $SkipAuth) {
  $authArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $scriptDir "deploy_auth_function.ps1"),
    "-Target", $Target
  )
  if ($DryRun) {
    $authArgs += "-DryRun"
  }

  Invoke-Step -Name "Auth deploy" -Action {
    & powershell @authArgs
  }
}

Write-Host ""
Write-Host "Combined deploy finished successfully."
