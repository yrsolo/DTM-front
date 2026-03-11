param(
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

function Require-YcAuth {
  if (-not $env:YC_SA_JSON_CREDENTIALS) { return $null }
  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("dtm-gw-yc-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tempDir | Out-Null
  $tempKeyPath = Join-Path $tempDir "sa-key.json"
  Set-Content -Path $tempKeyPath -Value $env:YC_SA_JSON_CREDENTIALS -NoNewline
  $env:YC_CONFIG_DIR = Join-Path $tempDir ".config"
  try {
    yc config profile create gateway-update 2>$null | Out-Null
  } catch {}
  yc config set service-account-key $tempKeyPath | Out-Null
  return $tempDir
}

$config = Parse-SimpleYaml (Get-Content "config/deploy.yaml" -Raw)
$yc = $config.yandex_cloud
if (-not $yc) { throw "Missing yandex_cloud section in config/deploy.yaml" }

$tmp = Require-YcAuth
try {
  yc config set folder-id $yc.folder_id | Out-Null

  $testBackendId = (yc serverless function get --name dtm --format json | ConvertFrom-Json).id
  $prodBackendId = (yc serverless function get --name dtm-prod --format json | ConvertFrom-Json).id
  $authTestId = (yc serverless function get --name $yc.auth_function_name_test --format json | ConvertFrom-Json).id
  $authProdId = (yc serverless function get --name $yc.auth_function_name_prod --format json | ConvertFrom-Json).id

  $specPath = Join-Path $repoRoot ".deploy/unified-gateway.openapi.yaml"
  New-Item -ItemType Directory -Path (Split-Path $specPath -Parent) -Force | Out-Null

  $spec = @"
openapi: 3.0.0
info:
  title: DTM Unified API
  version: 1.1.0

servers:
  - url: https://dtm.solofarm.ru

paths:
  /test/auth/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: $authTestId
        tag: '$latest'
        service_account_id: $($yc.service_account_id)

  /test/api/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: $authTestId
        tag: '$latest'
        service_account_id: $($yc.service_account_id)

  /test/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: $testBackendId
        tag: '$latest'
        service_account_id: $($yc.service_account_id)

  /prod/auth/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: $authProdId
        tag: '$latest'
        service_account_id: $($yc.service_account_id)

  /prod/api/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: $authProdId
        tag: '$latest'
        service_account_id: $($yc.service_account_id)

  /prod/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: $prodBackendId
        tag: '$latest'
        service_account_id: $($yc.service_account_id)

  /grafana:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: http://89.169.132.198:3000/grafana
        headers:
          Host: dtm.solofarm.ru
          X-Forwarded-Proto: https
          '*': '*'
        query:
          '*': '*'
        timeouts:
          connect: 1
          read: 30

  /grafana/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: http://89.169.132.198:3000/grafana/
        headers:
          Host: dtm.solofarm.ru
          X-Forwarded-Proto: https
          '*': '*'
        query:
          '*': '*'
        timeouts:
          connect: 1
          read: 30

  /grafana/{path+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: path
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: http
        url: http://89.169.132.198:3000/grafana/{path}
        headers:
          Host: dtm.solofarm.ru
          X-Forwarded-Proto: https
          '*': '*'
        query:
          '*': '*'
        timeouts:
          connect: 1
          read: 30

  /admin:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: https://dtm-front.website.yandexcloud.net/index.html

  /admin/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: https://dtm-front.website.yandexcloud.net/index.html

  /test-front:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: https://dtm-front.website.yandexcloud.net/test-front/index.html

  /test-front/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: https://dtm-front.website.yandexcloud.net/test-front/index.html

  /test-front/admin:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: https://dtm-front.website.yandexcloud.net/test-front/index.html

  /test-front/admin/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: https://dtm-front.website.yandexcloud.net/test-front/index.html

  /:
    get:
      x-yc-apigateway-integration:
        type: http
        url: https://dtm-front.website.yandexcloud.net/

  /{path+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: path
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: http
        url: https://dtm-front.website.yandexcloud.net/{path}
        headers:
          '*': '*'
        query:
          '*': '*'
"@

  Set-Content -Path $specPath -Value $spec -Encoding UTF8

  if ($DryRun) {
    Write-Host "Gateway spec generated: $specPath"
    Write-Host "Auth test function: $authTestId"
    Write-Host "Auth prod function: $authProdId"
    Write-Host "Legacy test backend: $testBackendId"
    Write-Host "Legacy prod backend: $prodBackendId"
    exit 0
  }

  yc serverless api-gateway update --name dtm-api-unified --spec $specPath | Out-Host
}
finally {
  if ($tmp -and (Test-Path $tmp)) {
    Remove-Item -Recurse -Force $tmp
  }
}
