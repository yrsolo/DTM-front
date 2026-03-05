# CAM-SCHEMA-CONTRACT-GOVERNANCE

## Why
Фронт и бэк развиваются параллельно. Если TS-типы, JSON Schema и пример снапшота расходятся — агенты и люди теряют "истину", ломаются интеграции, и баги становятся неочевидными.

## Goal
1) Синхронизировать `packages/schema/snapshot.ts` и `packages/schema/snapshot.schema.json`.
2) Ввести простую валидацию снапшотов (локально + в CI при возможности).
3) Зафиксировать минимальные “hard guarantees” в `docs/API_CONTRACT.md`:
   - соответствие ownerId -> people.id (или чёткое правило, что иначе)
   - формат дат (YYYY-MM-DD или ISO datetime, но единообразно)
   - стабильность `meta.version/artifact` и `meta.hash/revision`

## Scope
- packages/schema/*
- data/snapshot.example.json
- docs/API_CONTRACT.md (секция Guarantees)
- scripts/validate_schema.(js|ts) + npm script `validate:schema`

## Non-goals
- Полный OpenAPI/Swagger.
- Генерация SDK.

## Definition of Done
- `npm run validate:schema` валидирует `data/snapshot.example.json` и (опционально) фикстуры v2.
- Схема покрывает все реально используемые поля.
- В API_CONTRACT есть секция Guarantees.
