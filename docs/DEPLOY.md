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

## Deploy (PowerShell, recommended)
From repository root:

```powershell
./scripts/deploy_frontend.ps1
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

## Cache Policy
- `index.html`: `no-cache`
  - ensures clients pick up latest asset references
- hashed static assets (`dist/assets/*`): `public, max-age=31536000, immutable`
  - safe long-term caching due content hashing
- runtime config + fallback JSON: `no-cache`
  - allows updates without full frontend rebuild

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
