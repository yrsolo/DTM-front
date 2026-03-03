# CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE

## Goal
- Business: сделать стабильный MVP-контур деплоя фронта с постоянным публичным URL "крутится и можно показать".
- Technical: автоматизировать сборку `apps/web` и загрузку `dist/` в Yandex Object Storage Static Website Hosting с корректным cache policy и runtime-конфигом `public.yaml`.

## Scope
- Документация деплоя (`docs/DEPLOY.md`).
- Скрипты деплоя (`scripts/deploy_frontend.ps1`, optional `.sh`, `scripts/deploy_env.example`).
- Выверка runtime-путей (`/config/public.yaml`, `/data/snapshot.example.json`) и минимальные правки фронта при необходимости.

## Non-goals
- OAuth / авторизация.
- Админка.
- Деплой и эксплуатация API (это отдельная backend-кампания).

## Definition of Done
1. Bucket создан владельцем ключей и включен static website hosting.
2. В репозитории добавлены deploy-доки и скрипты без секретов.
3. One-command локальный деплой: build + upload + доступность сайта по website endpoint.
4. После деплоя UI открывается, грузит конфиг/фолбэк корректно.

## Risks
- `403 AccessDenied` из-за политики бакета/публичного чтения.
- Неверный endpoint для `aws cli` (должен быть S3 endpoint).
- Кеширование `index.html` сломает "последнюю версию".
- Расхождение runtime пути конфига.

## Links / evidence
- Charter: `work/roadmap/campaigns/CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE/charter.md`
- Plan: `work/roadmap/campaigns/CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE/plan.md`
- Evidence: `work/roadmap/campaigns/CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE/evidence.md`
- Source draft: `work/now/CAMPAIGN_mvp_deploy_frontend_object_storage.md`
