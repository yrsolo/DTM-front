# Campaign charter

Campaign ID: `CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE`

## Goal
- Business: стабильный MVP-контур деплоя фронта с постоянным публичным URL.
- Technical: one-command build+deploy `apps/web` в Yandex Object Storage static hosting с корректным cache поведением.

## Scope
- Документация деплоя в `docs/DEPLOY.md`.
- Скрипты деплоя в `scripts/*`.
- Runtime конфиг из `/config/public.yaml`.
- Публикация fallback snapshot `/data/snapshot.example.json` (рекомендуется для MVP).

## Non-goals
- OAuth, админка.
- Деплой API/бэкенда.
- CI/CD, CDN, custom domain (следующая кампания).

## Definition of Done
1. Bucket + static website hosting подготовлены владельцем ключей.
2. Добавлены `docs/DEPLOY.md`, `scripts/deploy_frontend.ps1`, `scripts/deploy_env.example` (+ optional `.sh`).
3. Локальный one-command deploy выполняет build + upload.
4. Website endpoint доступен, UI рендерит обе страницы, runtime config и fallback работают по ожидаемым путям.

## Risks
- `403 AccessDenied` из-за bucket policy/public access.
- Неверный endpoint `aws` (`storage.yandexcloud.net` обязателен для S3 API).
- Неправильный cache-control для `index.html`.
- Рассинхрон пути runtime config.

## References
- `work/now/CAMPAIGN_mvp_deploy_frontend_object_storage.md`
- `docs/API_CONTRACT.md`
- `docs/ARCHITECTURE.md`
