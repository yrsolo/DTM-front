# Campaign: MVP Deploy Contour — DTM Web Frontend (Object Storage Static Hosting)

## Goal (business)
Сделать стабильный MVP-контур деплоя фронта так, чтобы всегда существовал URL "крутится и можно показать".

## Goal (technical)
Автоматизировать сборку `apps/web` и загрузку `dist/` в Yandex Object Storage (static website hosting), с корректными cache headers и конфигом `public.yaml`, без VPS и без Cloud Functions для фронта.

## Non-goals (MVP)
- OAuth / авторизация
- админка
- деплой/поднятие API (делается отдельно бэкенд-командой)

## Definition of Done
1. Создан bucket и включен static website hosting (ручные шаги у владельца ключей).
2. В репо есть `docs/DEPLOY.md`, deploy scripts и `deploy_env.example`.
3. One-command локальный деплой собирает фронт и публикует его в bucket.
4. UI открывается, routes работают, runtime config/fallback загружаются корректно.

## Owner inputs
- `YC_BUCKET_NAME`
- `YC_FOLDER_ID` (optional)
- `YC_ENDPOINT` (обычно `https://storage.yandexcloud.net`)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEFAULT_REGION=ru-central1`

## Notes
- Секреты не коммитить, только `.example`.
- Runtime config цель: `/config/public.yaml`.
- Fallback data цель: `/data/snapshot.example.json`.
