# Troubleshooting

Этот документ собирает типовые runtime, deploy и data-loading проблемы для текущего frontend-контура.

Source of truth:
- `apps/web/src/config/publicConfig.ts`
- `apps/web/src/config/runtimeContour.ts`
- `apps/web/src/data/api.ts`
- `apps/web/src/data/useSnapshot.ts`
- `scripts/deploy_frontend.ps1`
- `scripts/deploy_auth_function.ps1`
- `scripts/update_unified_gateway.ps1`

## Пустой экран или не рисуется timeline

Проверьте:
1. загружается ли `config/public.yaml` или `config/public.yam` относительно текущего app base;
2. есть ли успешный snapshot request в Network;
3. не упёрлись ли display/load limits в workbench/runtime defaults;
4. не сломан ли `dtm.snapshot.v1` в localStorage.

## `/test` и `/test/` ведут себя по-разному

Текущее правило:
- public test frontend живёт по `https://dtm.solofarm.ru/test/`;
- gateway должен отдавать test `index.html` и на `/test`, и на `/test/`;
- test build должен собираться с `DTM_WEB_BUILD_BASE=/test/`.

Если на `/test` или `/test/` белый экран:
1. проверьте, что test bucket — `dtm-front-test`;
2. проверьте, что в test `index.html` asset paths начинаются с `/test/assets/...`;
3. проверьте, что gateway не делает redirect loop между `/test` и `/test/`;
4. проверьте, что `/test/{path+}` не уходит в prod bucket.

## Runtime config не загружается

`publicConfig.ts` ищет runtime-файл в таком порядке:
1. `config/public.yaml`
2. `config/public.yam`
3. встроенный fallback

Если конфиг не найден:
1. проверьте, что `config/` реально опубликован в target bucket;
2. проверьте, что gateway не уводит `config/*` в SPA fallback;
3. проверьте MIME и HTTP status для `config/public.yaml`.

## Локальный frontend работает не против test contour

Canonical поведение:
- localhost = `test` contour для auth/api;
- localhost SPA base path остаётся `/`;
- login должен идти в `https://dtm.solofarm.ru/test/ops/auth/login?...`;
- browser-facing data requests должны идти в `https://dtm.solofarm.ru/test/ops/bff/*`.

Если локально открывается `/ops/auth/...` вместо `/test/ops/auth/...`:
1. проверьте `apps/web/src/config/runtimeContour.ts`;
2. проверьте, что localhost распознан как local frontend runtime;
3. проверьте, что `getFrontendBasePath()` для localhost возвращает `/`, а не `/test/`.

## Локально есть CORS-ошибка на `/test/ops/bff/*`

Это ожидаемая точка риска.

Важно:
- локальный frontend ходит cross-origin в `https://dtm.solofarm.ru/test/ops/bff/*`;
- credentialed requests (`credentials: include`) несовместимы с `Access-Control-Allow-Origin: *`.

Если нужен локальный masked/guest режим:
- frontend может ходить без credentials.

Если нужен локальный full-access режим:
1. browser-facing auth/bff route должен отдавать exact `Access-Control-Allow-Origin` для `http://localhost:5173`;
2. должен быть `Access-Control-Allow-Credentials: true`;
3. auth cookie и callback flow должны быть корректно настроены для test contour.

## OAuth callback mismatch

Canonical callback URLs:
- prod -> `https://dtm.solofarm.ru/ops/auth/callback`
- test -> `https://dtm.solofarm.ru/test/ops/auth/callback`

Проверьте:
1. `YANDEX_CLIENT_ID_TEST` / `YANDEX_CLIENT_SECRET_TEST` используются только для test;
2. `YANDEX_CLIENT_ID_PROD` / `YANDEX_CLIENT_SECRET_PROD` используются только для prod;
3. в Yandex OAuth app зарегистрирован именно тот callback URL, который строит auth function;
4. auth deploy больше не использует fallback на общие OAuth credentials.

## Test frontend открывается, но auth остаётся guest

Проверьте:
1. `https://dtm.solofarm.ru/test/ops/auth/health` возвращает `200`;
2. `https://dtm.solofarm.ru/test/ops/auth/me` возвращает JSON, а не HTML;
3. gateway по-прежнему направляет `/test/ops/auth/*` в `auth-test`;
4. cookie не была сброшена из-за `session_version` mismatch.

## Первый админ ещё не поднят

Если `ADMIN_BOOTSTRAP_UID_*` ещё не настроен, первого администратора можно выдать вручную:

```bash
node scripts/auth_admin_tool.mjs --target test --command list-users
node scripts/auth_admin_tool.mjs --target test --command make-admin --user-id <USER_ID>
```

Для production используется `--target prod`.

## Deploy ушёл не в тот контур

Проверьте:
1. `deploy_frontend.ps1` / `deploy_stack.ps1` вызваны с правильным `-Target`;
2. `prod` публикуется только в `dtm-front`;
3. `test` публикуется только в `dtm-front-test`;
4. target-specific build base:
   - prod -> `/`
   - test -> `/test/`

## Gateway routes разъехались

Пересоберите и примените текущий unified gateway spec:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1
```

Dry-run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1 -DryRun
```

Проверьте, что:
- `/ops/auth/*` -> `auth-prod`
- `/test/ops/auth/*` -> `auth-test`
- `/ops/bff/*` -> `auth-prod`
- `/test/ops/bff/*` -> `auth-test`
- `/ops/*` и `/test/ops/*` не уходят в SPA fallback
- `/grafana/*` обслуживается отдельно от `ops`

## Подозрение на mojibake

Если в UI или markdown появились `????` или искажённая кириллица:
1. проверьте кодировку файла;
2. не открывался ли файл/вывод в ANSI/Windows-1251;
3. используйте UTF-8 для docs и shell-вывода.
