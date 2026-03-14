# Snapshot-модель frontend

Этот документ фиксирует внутреннюю модель данных, с которой работает UI после нормализации.

Для кого:
- frontend-инженер;
- инженер, меняющий `normalize.ts`;
- любой разработчик, которому нужно понять разницу между raw API payload и UI model.

Source of truth в коде:
- [normalize.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\normalize.ts)
- [useSnapshot.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\useSnapshot.ts)

## Назначение нормализованной модели

UI не должен работать напрямую с сырой backend-структурой. Нормализация решает три задачи:
- стабилизирует контракт для rendering-слоя;
- упрощает доступ к people/groups/enums;
- даёт предсказуемые fallback-значения при неполных данных.

## Основные сущности

Нормализованный snapshot содержит:
- `meta`
- `summary`
- `filters`
- `entities`
- `tasks`

## `entities`

Frontend использует сущности как lookup-слой:
- `people`
- `groups`
- `tags`
- `enums`

Типичный UI-derived usage:
- по `ownerId` находится дизайнер;
- по `groupId` находится шоу/группа;
- по enum map разворачиваются статусные и milestone labels.

## `tasks`

После нормализации задача используется как единый объект, на основе которого строятся:
- строка таймлайна;
- карточка в board view;
- drawer;
- tooltip;
- цветовая подкраска.

UI особенно опирается на:
- `id`
- `title`
- `brand`
- `format_`
- `groupId`
- `ownerId`
- `status`
- `date`
- `history`
- `milestones`

## Derived values в UI

Часть значений рассчитывается уже после нормализации, на уровне интерфейса:
- display name дизайнера;
- display name шоу;
- сортировочные ключи;
- хэш-цвет задачи;
- milestone tone category;
- tooltip-friendly списки milestones;
- календарные ячейки drawer.

## Owner / group / label resolution

Если lookup в entities не дал результат, UI использует fallback:
- дизайнер: прочерк или raw значение, если оно доступно;
- группа/шоу: fallback label;
- milestone label: raw `type` или `default`-категория.

## Milestone tone mapping

Нормализованный snapshot сам по себе не знает о цветовых категориях milestones. Это второй слой поверх данных:
- raw `milestone.type`
- alias mapping в `milestoneTone.ts`
- итоговая tone category
- actual color tokens из `colors.ts`

## Разница между raw payload и UI model

Raw payload:
- повторяет backend read model;
- может содержать поля, не нужные UI напрямую;
- допускает историческую неоднородность milestone names.

UI model:
- ориентирована на рендер;
- использует entities как lookup-таблицы;
- минимизирует логику разбора backend-формы внутри компонентов.

## Инварианты

- rendering-компоненты не должны вручную реализовывать свою собственную нормализацию;
- нормализация должна оставаться единой boundary между data layer и UI;
- любые изменения формы API нужно сначала отражать в `normalize.ts`, а потом документировать здесь.
