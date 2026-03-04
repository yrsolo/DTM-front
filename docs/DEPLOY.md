# Frontend Deploy (Yandex Object Storage)

This document describes MVP deploy of `apps/web` as a static site in Yandex Object Storage.

## Overview
- Build frontend: `apps/web/dist`
- Upload static build to bucket root
- Upload runtime config to `/config/public.yaml`
- Upload fallback snapshot to `/data/snapshot.example.json` (optional but recommended)
- Keep `index.html` non-cached, hashed assets immutable
- Non-secret deploy settings come from `scripts/deploy.yaml`
- Secrets come from root `.env`

## Prerequisites
- Node.js 18+
- npm
- AWS CLI v2
- Yandex Object Storage bucket with enabled **Static website hosting**

## One-time setup in Yandex Cloud (manual)
1. Create bucket.
2. Enable static website hosting on bucket.
3. Configure public read access for objects required by website hosting.
4. Save website endpoint shown in bucket settings.

## Deploy Config (YAML)
Edit file `scripts/deploy.yaml`:
- `yc_bucket_name`
- `yc_endpoint`
- `aws_default_region`
- `dtm_web_public_config_path`

## Environment Variables (PowerShell)
Set variables for current shell session:

```powershell
$env:AWS_ACCESS_KEY_ID="..."
$env:AWS_SECRET_ACCESS_KEY="..."
# optional (script has defaults):
# $env:YC_ENDPOINT="https://storage.yandexcloud.net"
# $env:AWS_DEFAULT_REGION="ru-central1"
# optional:
$env:DTM_WEB_PUBLIC_CONFIG_PATH="apps/web/config/public.yaml"
```

Use template file: `scripts/deploy_env.example`.
For one-click usage, keep secrets in root `.env`.

Final deploy env split:
- secrets (only `.env`/CI secret storage, never git):
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- non-secrets (in `scripts/deploy.yaml`, can be versioned):
  - `yc_bucket_name` -> `YC_BUCKET_NAME`
  - `yc_endpoint` -> `YC_ENDPOINT`
  - `aws_default_region` -> `AWS_DEFAULT_REGION`
  - `dtm_web_public_config_path` -> `DTM_WEB_PUBLIC_CONFIG_PATH`

## Deploy (PowerShell, recommended)
From repository root:

```powershell
./scripts/deploy_frontend.ps1
```

With explicit release id:

```powershell
./scripts/deploy_frontend.ps1 -ReleaseId "20260304-r1"
```

Dry-run (build + validation only, no upload):

```powershell
./scripts/deploy_frontend.ps1 -DryRun
```

## Deploy (Windows one-click CMD)
Double-click file:

```text
scripts/deploy_frontend.cmd
```

Or from terminal:

```cmd
scripts\deploy_frontend.cmd
```

Dry-run:

```cmd
scripts\deploy_frontend.cmd --dry-run
```

The `.cmd` wrapper calls PowerShell script and auto-loads env vars from root `.env`.
Bucket/endpoint defaults are loaded from `scripts/deploy.yaml`.

What the script does:
1. validates env vars and required commands
2. builds `apps/web`
3. syncs `apps/web/dist` to bucket with immutable cache for assets
4. uploads runtime config to `/config/public.yaml` with `Cache-Control: no-cache`
5. uploads fallback snapshot to `/data/snapshot.example.json` with `Cache-Control: no-cache` (if file exists)
6. uploads `index.html` separately with `Cache-Control: no-cache`

## Deploy (bash, optional)
```bash
chmod +x scripts/deploy_frontend.sh
./scripts/deploy_frontend.sh
```

With explicit release id:

```bash
./scripts/deploy_frontend.sh --release-id 20260304-r1
```

Dry-run:

```bash
./scripts/deploy_frontend.sh --dry-run
```

## Release metadata
Each deploy now generates and uploads metadata:
- `releases/<release-id>/release.json`
- `releases/latest.json`

If `release-id` is not provided, scripts generate one automatically:
- format: `YYYYMMDD-HHMMSS-<git-short-sha|local>`

Rollback baseline:
1. Pick previous `release-id`.
2. Re-run deploy script with that release id and matching source revision.
3. Verify `releases/latest.json` points to restored release id.

## Deploy (GitHub Actions CI)
Workflow file:
- `.github/workflows/deploy_frontend.yml`

Triggers:
- push to `dev` (selected paths) -> dry-run validation
- push to `main` (selected paths) -> automatic real release deploy
- manual run (`workflow_dispatch`) with `dry_run=true|false` and optional `release_id`

Required repository settings:
- Secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- Variables:
  - `YC_BUCKET_NAME`
  - `YC_ENDPOINT` (recommended: `https://storage.yandexcloud.net`)
  - `AWS_DEFAULT_REGION` (recommended: `ru-central1`)
  - `DTM_WEB_PUBLIC_CONFIG_PATH` (recommended: `apps/web/config/public.yaml`)

Runbook:
1. Open GitHub -> Actions -> `Deploy Frontend`.
2. Click `Run workflow`.
3. Optionally set `release_id` (if empty, workflow generates one).
4. First run with `dry_run=true` and verify logs.
5. Run with `dry_run=false` for real upload.

Notes:
- Workflow reuses `scripts/deploy_frontend.sh` to keep parity with local deploy.
- Keep local scripts as fallback if CI variables/secrets are temporarily unavailable.
- Mainline release behavior:
  - merge `dev` -> `main` (push to `main`) triggers automatic release deploy
  - push to `dev` runs only dry-run to check pipeline and metadata paths

## Cache Policy
- `index.html`: `no-cache`
  - ensures clients pick up latest asset references
- hashed static assets (`dist/assets/*`): `public, max-age=31536000, immutable`
  - safe long-term caching due content hashing
- runtime config + fallback JSON: `no-cache`
  - allows updates without full frontend rebuild

## CDN + Custom Domain (next phase)
This section is for the next rollout stage after static hosting is already working.

Required owner inputs:
- custom domain (example: `dtm.example.com`)
- DNS provider/zone access
- certificate mode (managed or imported)
- selected CDN service/account

Recommended topology:
1. Keep Object Storage website hosting as origin.
2. Create CDN resource with origin = current website endpoint.
3. Bind custom domain to CDN.
4. Provision TLS certificate for custom domain.
5. Update DNS record (`CNAME`/`ALIAS`) to CDN endpoint.

Verification checklist:
```bash
# CDN endpoint should return frontend index
curl -I https://<cdn-endpoint>/

# Custom domain should return frontend index over HTTPS
curl -I https://<custom-domain>/

# Runtime config and fallback should remain accessible
curl -I https://<custom-domain>/config/public.yaml
curl -I https://<custom-domain>/data/snapshot.example.json
```

Rollback strategy:
- keep direct website endpoint as fallback URL
- switch DNS back to previous target if CDN/custom-domain setup fails

## Validation Steps
1. Open bucket website endpoint from Yandex Cloud Console:
   - Object Storage -> bucket -> Website hosting -> Endpoint
2. Open:
   - `/config/public.yaml`
   - `/data/snapshot.example.json`
3. Open site root and verify routes/UI render.
4. In browser Network tab:
   - verify config request path is `/config/public.yaml`
   - verify API URL is formed from config values
5. Hard refresh (`Ctrl+F5`) and normal refresh both return latest UI.

## Troubleshooting
- `403 AccessDenied`
  - bucket/object policy does not allow public read.
- Wrong endpoint
  - for CLI uploads use `https://storage.yandexcloud.net`.
- CORS/API request issues
  - check API CORS and `api_base_url` in `/config/public.yaml`.
- `index.html` not updated
  - ensure separate upload of `index.html` with `no-cache` happened.
- Config not found at runtime
  - open `/config/public.yaml` directly in browser and verify object exists.
