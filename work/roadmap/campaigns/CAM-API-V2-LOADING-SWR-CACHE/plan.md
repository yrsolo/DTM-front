# Plan: CAM-API-V2-LOADING-SWR-CACHE

## Design decision: cache layers
Используем 3 уровня кеша (по приоритету):
1) Memory cache (в рамках вкладки)
2) Persistent cache (localStorage или IndexedDB)
3) Network (API)

### Recommendation
- Начать с **localStorage**, потому что снапшот JSON обычно не огромный и проще внедрить.
- Если размер окажется большой (лимит ~5–10MB), мигрировать в IndexedDB.

## Step 1 — Persisted cache format
Создать ключи:
- `dtm.snapshot.v1` (normalized SnapshotV1)
- `dtm.snapshot.meta` (generatedAt, savedAt, sourceUrl, etag/hash if any)

Сохранять **уже нормализованный** SnapshotV1, чтобы старт был быстрым.

## Step 2 — useSnapshot rework (SWR)
Переписать `useSnapshot()` примерно на такие состояния:
- `snapshot` (может быть из localStorage сразу)
- `status`:
  - `cold_loading` (нет кеша вообще)
  - `ready` (есть данные)
  - `refreshing` (есть данные + идёт обновление)
  - `stale_error` (есть данные + последний refresh упал)
- `lastUpdatedAt`
- `lastError`

Поведение:
- On mount:
  1) try load from memory
  2) else try load from localStorage -> set snapshot -> status=ready
  3) start background refresh -> status=refreshing (но UI остаётся)
- Refresh button:
  - запускает background refresh, не сбрасывает snapshot.

## Step 3 — api fetch improvements
В `fetchSnapshot()`:
- добавить AbortController:
  - timeout из `public.yaml`, например 12_000ms
- retry:
  - 1 повтор через 300–800ms на сетевые ошибки/timeout
- (optional) ETag:
  - если сервер возвращает ETag, сохранять и слать `If-None-Match`
  - 304 -> не менять snapshot, только обновить `lastCheckedAt`

## Step 4 — UI text improvements
- В FiltersBar кнопку:
  - `Refresh` -> `Updating…` во время refresh
- На странице:
  - если `cold_loading` -> показывать LoadingState
  - если `ready/refreshing` -> показывать контент
  - если `stale_error` -> показывать контент + ErrorBanner “не удалось обновить”
- Показать “GeneratedAt” (из snapshot.meta) и “Last refresh attempt” (локально)

## Step 5 — Fallback strategy
Если API недоступна и кеш пуст:
- fallback на `/data/snapshot.example.json` (если включено)
или
- показать ошибку и подсказку “проверь API”.

## Step 6 — Verification plan
Сценарии:
1) Первый запуск без кеша:
   - видим Loading, через ~10с появляется UI, кешируется
2) Второй запуск:
   - UI появляется сразу, параллельно идёт refresh (видно “Updating…”)
3) API down:
   - UI из кеша появляется сразу
   - баннер stale/error после попытки refresh
4) API slow (>timeout):
   - срабатывает timeout+retry
   - UI не сбрасывается
