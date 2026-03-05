# CAM-API-V2-LOADING-SWR-CACHE (stale-while-revalidate)

## Why
Сейчас запрос к API занимает ~10 секунд, и пользователь смотрит на пустой экран/Loading. Для демо это выглядит плохо и воспринимается как “сайт медленный”.

## Goal
Сделать UX по принципу **stale-while-revalidate**:
- Мгновенно показывать **последний успешный снапшот** (из локального кеша) при открытии сайта.
- Запускать обновление **в фоне** (async), без блокировки UI.
- При успехе — мягко обновлять данные (“Updated just now”).
- При ошибке — оставлять старые данные и показывать баннер “данные устарели, обновление не удалось”.

Дополнительно:
- Таймауты/AbortController.
- Мини-ретраи на сетевые ошибки.
- (опционально) ETag/If-None-Match, если API поддержит.

## Scope
- apps/web/src/data/useSnapshot.ts
- apps/web/src/data/api.ts
- apps/web/src/data/normalize.ts (если нужно)
- UI: LoadingState/ErrorBanner/FiltersBar (надписи, индикатор refresh)
- Runtime config fields (public.yaml): timeout, refresh interval, cache mode.

## Non-goals
- Service Worker PWA (можно позже).
- Реалтайм/websocket.
- Авторизация.

## Definition of Done
1) При первом открытии после 1 успешной загрузки в прошлом:
   - UI показывает данные **сразу** (≤ 200 мс) без “пустого экрана”.
   - Параллельно идёт фоновый fetch.
2) Кнопка Refresh:
   - не блокирует UI
   - показывает “Updating…” вместо “Loading…”
3) При ошибке fetch:
   - остаются прошлые данные
   - появляется баннер “Stale / failed to refresh”
4) При успехе:
   - данные обновляются
   - отображается timestamp “Updated at …”
