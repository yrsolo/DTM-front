# Troubleshooting

Этот документ собирает типовые проблемы и шаги диагностики.

Для кого:
- инженер поддержки;
- frontend-разработчик;
- владелец проекта, который проверяет продовое поведение.

Source of truth в коде:
- [publicConfig.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\config\publicConfig.ts)
- [useSnapshot.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\useSnapshot.ts)
- [runtimeDefaults.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\runtimeDefaults.ts)

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

## Симптом: используется устаревший snapshot

Проверьте:
1. timestamps в `dtm.snapshot.meta`;
2. ETag/304 поведение в Network;
3. не сработал ли fallback на persisted snapshot из-за ошибки запроса.

## Симптом: неожиданно включён demo mode

Проверьте:
1. runtime defaults нового сеанса;
2. persisted runtime state;
3. UI toggle demo mode.

## Симптом: runtime config не загрузился

`publicConfig.ts` пробует:
1. `config/public.yaml`
2. `config/public.yam`
3. встроенный fallback

Если в Network виден `404` на `.yaml`, это ещё не значит окончательную ошибку: приложение может продолжить работать через `.yam` или встроенный fallback.

## Симптом: сайт в `/test-front/` открывается, но не подхватывает данные или config

Проверьте:
1. Что сборка опубликована под `test-front/`, а не в корень.
2. Что в `test-front/config/` лежат `public.yaml` и `public.yam`.
3. Что `local_snapshot_path` в runtime-конфиге относительный, а не абсолютный.
4. Что в коде не осталось абсолютных ссылок вида `/config/...`, `/data/...`, `/favicon.ico`, `/DTM_lo.mp4`.

## Симптом: проблемы с локальной разработкой

Проверьте:
- выполнен ли `npm install`;
- запускается ли `npm run dev` в `apps/web`;
- есть ли доступ к локальному snapshot или API;
- не остался ли конфликтующий persisted state от прошлой сессии.

## Симптом: странное поведение из-за browser storage

Практический минимум проверки в DevTools:
- `dtm.web.designControls.v1`
- `dtm.web.keyColors.v1`
- `dtm.web.uiPreset.v1`
- `dtm.snapshot.v1`
- `dtm.snapshot.meta`
- `dtm.timeline.pageView.v1`

## Проверка кодировок

Если в UI или документации появились строки вида `Ð...`, проверьте:
- кодировку файла;
- путь, которым файл был сохранён;
- консольные утилиты, которые могли записать файл не в UTF-8.

Для репозитория уже существует проверка:
- `npm run check:mojibake`

## Smoke-check после изменений в data loading

Минимальный smoke:
1. reload страницы с уже заполненным localStorage;
2. проверка загрузки свежих данных поверх persisted snapshot;
3. проверка поведения при временном отключении API;
4. проверка статусов, page switch и drawer.
