# Preset System

Назначение:
- зафиксировать, как устроены builtin и cloud presets;
- объяснить graceful fallback, если preset domain или catalog backend недоступен;
- описать ownership и admin governance.

## Контур

Preset assets живут отдельно от frontend buckets и отдельно от contour-specific auth DB:
- bucket: `dtm-presets`
- public domain: `http://dtm-presets.solofarm.ru`

Catalog общий для `test` и `prod`.

## Виды preset-ов

Поддерживаются два независимых вида:
- `color` -> только `KeyColors`
- `layout` -> только `DesignControls`

Что intentionally не входит в preset v1:
- `RuntimeDefaults`
- auth/admin state
- filters и session state

Правило:
- применение color preset не меняет layout;
- применение layout preset не меняет colors.

## Источники preset-ов

### Builtin

Builtin presets лежат в frontend repo:
- [colors index](n:\PROJECTS\DTM\DTM-front\apps\web\public\config\UI\colors\index.json)
- [layouts index](n:\PROJECTS\DTM\DTM-front\apps\web\public\config\UI\layouts\index.json)

Они всегда доступны как baseline и не зависят от cloud catalog.

### Cloud

Cloud presets читаются через auth contour:
- `GET /ops/auth/presets?kind=color|layout`
- `GET /test/ops/auth/presets?kind=color|layout`

Assets указывают на публичные JSON URLs в `http://dtm-presets.solofarm.ru/...`.

## Graceful fallback

Если preset domain недоступен:
- приложение стартует как обычно;
- auth/data flows не ломаются;
- builtin presets остаются доступны;
- cloud preset с битым asset помечается как `broken` или `unavailable`;
- UI не должен показывать blocking error на весь workbench.

Если preset catalog backend недоступен:
- workbench продолжает работать;
- builtin presets остаются доступны;
- cloud create/update/delete/default actions становятся недоступны;
- интерфейс работает в builtin-only режиме.

## Ownership и права

Cloud preset может создать:
- любой `approved` пользователь;
- любой `admin`.

Редактирование:
- обычный пользователь может менять только свои presets;
- admin может менять любые presets;
- попытка сохранить изменения в чужом preset должна идти через clone / `Save as new`.

Удаление и назначение default:
- удалить свой preset может владелец или admin;
- global default меняет только admin;
- defaults задаются отдельно для `color` и `layout`.

## Browser storage

Локальное текущее состояние хранится раздельно:
- `dtm.web.keyColors.v1`
- `dtm.web.designControls.v1`
- `dtm.web.preset.activeColor.v1`
- `dtm.web.preset.activeLayout.v1`

Legacy fallback:
- `dtm.web.uiPreset.v1` читается только для совместимости со старым combined state.

## Admin governance

Админка показывает:
- color presets;
- layout presets;
- автора;
- revision;
- доступность asset;
- текущий default preset.

Admin actions:
- импорт;
- экспорт;
- удалить;
- назначить default.
