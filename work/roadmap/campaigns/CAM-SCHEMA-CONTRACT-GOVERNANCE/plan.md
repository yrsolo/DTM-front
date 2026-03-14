# Plan: CAM-SCHEMA-CONTRACT-GOVERNANCE

## Step 1 - Inventory differences
- Сравнить `snapshot.ts` и `snapshot.schema.json`.
- Выписать расхождения: какие поля есть в TS, но нет в schema.

## Step 2 - Update schema
- Обновить `snapshot.schema.json` под текущий `snapshot.ts`.
- Не добавлять лишнюю строгость: optional-поля оставлять optional.

## Step 3 - Add validator
- Добавить Ajv или другой валидатор в `packages/schema` или root.
- Скрипт `scripts/validate_schema.mjs`:
  - грузит schema
  - валидирует `data/snapshot.example.json`
  - опционально валидирует `data/snapshot.v2.sample.json`, если он появится
  - печатает ошибки и завершает процесс с `exit code != 0`

## Step 4 - npm scripts
- Добавить `validate:schema` в root или `apps/web`.
- Документация: `docs/deep/DEPLOY.md` и `docs/deep/API_CONTRACT.md` по необходимости.

## Step 5 - Guarantees
В `docs/deep/API_CONTRACT.md` добавить:
- ID mapping
- dates format
- hash/revision semantics
- error behavior: что делать frontend, если payload невалидный

## Verification
- `npm run validate:schema` зелёный.
- PR с чётким описанием.
