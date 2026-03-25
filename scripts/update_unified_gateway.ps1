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
  try { yc config profile create gateway-update 2>$null | Out-Null } catch {}
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

  $prodFrontend = "https://$($yc.frontend_bucket_prod).website.yandexcloud.net"
  $testFrontend = "https://$($yc.frontend_bucket_test).website.yandexcloud.net"

  $specPath = Join-Path $repoRoot ".deploy/unified-gateway.openapi.yaml"
  New-Item -ItemType Directory -Path (Split-Path $specPath -Parent) -Force | Out-Null

  $spec = @"
openapi: 3.0.0
info:
  title: DTM Unified API
  version: 1.2.0

servers:
  - url: https://dtm.solofarm.ru

paths:
  /test/ops/auth/{proxy+}:
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
        tag: __LATEST__
        service_account_id: $($yc.service_account_id)

  /test/ops/bff/{proxy+}:
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
        tag: __LATEST__
        service_account_id: $($yc.service_account_id)

  /ops/auth/{proxy+}:
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
        tag: __LATEST__
        service_account_id: $($yc.service_account_id)

  /ops/bff/{proxy+}:
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
        tag: __LATEST__
        service_account_id: $($yc.service_account_id)

  /test/ops/{proxy+}:
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
        tag: __LATEST__
        service_account_id: $($yc.service_account_id)

  /ops/{proxy+}:
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
        tag: __LATEST__
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

  /test:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/app:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/app/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/m:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/m/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/mobile:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/mobile/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/promo:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/promo/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/promo-draft:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/promo-draft/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/index.html

  /test/{path+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: path
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: http
        url: $testFrontend/{path}

  /:
    get:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/

  /app:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /app/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /m:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /m/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /mobile:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /mobile/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /promo:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /promo/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /promo-draft:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

  /promo-draft/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $prodFrontend/index.html

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
        url: $prodFrontend/{path}
"@

  $spec = $spec.Replace("__LATEST__", '$latest')
  Set-Content -Path $specPath -Value $spec -Encoding UTF8

  if ($DryRun) {
    Write-Host "Gateway spec generated: $specPath"
    exit 0
  }

  yc serverless api-gateway update --name dtm-api-unified --spec $specPath | Out-Host
}
finally {
  if ($tmp -and (Test-Path $tmp)) {
    Remove-Item -Recurse -Force $tmp
  }
}
