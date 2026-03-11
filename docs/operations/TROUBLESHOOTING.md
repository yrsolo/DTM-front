# Troubleshooting

Этот документ собирает типовые проблемы и шаги диагностики.

Source of truth:
- `apps/web/src/config/publicConfig.ts`
- `apps/web/src/config/runtimeContour.ts`
- `apps/web/src/data/useSnapshot.ts`
- `apps/web/src/data/runtimeDefaults.ts`

## Симптом: пустой экран или пустой timeline

Проверьте:
1. Загружается ли `config/public.yaml` или `config/public.yam` относительно текущего app base.
2. Есть ли успешный snapshot request в Network.
3. Есть ли данные в `dtm.snapshot.v1`.
4. Не установлен ли слишком маленький display limit.

## Симптом: сайт не работает с production API

Проверьте:
1. Корректен ли runtime config на хосте.
2. Доступен ли backend endpoint напрямую.
3. Не включён ли `useTestApi`.
4. Совпадает ли `api_frontend_path` с реальным backend path.

## Симптом: runtime config не загрузился

`publicConfig.ts` пробует:
1. `config/public.yaml`
2. `config/public.yam`
3. встроенный fallback

## Симптом: сайт в `/test/` открывается, но не подхватывает данные или config

Проверьте:
1. Что сборка опубликована под `test/`, а не в корень.
2. Что в `test/config/` лежат `public.yaml` и `public.yam`.
3. Что `local_snapshot_path` в runtime-конфиге относительный, а не абсолютный.
4. Что в коде не осталось абсолютных ссылок вида `/config/...`, `/data/...`, `/favicon.ico`, `/DTM_lo.mp4`.

## Симптом: проблемы с локальной разработкой

Проверьте:
- выполнен ли `npm install`;
- запускается ли `npm run dev`;
- local runtime действительно адресует `test` contour для auth/api;
- не остался ли конфликтующий persisted state от прошлой сессии.

## Проверка кодировок

Если в UI или документации появились строки вида `Ð...`, проверьте:
- кодировку файла;
- путь, которым файл был сохранён;
- утилиты, которые могли записать файл не в UTF-8.

Команда проверки:
- `npm run check:mojibake`
