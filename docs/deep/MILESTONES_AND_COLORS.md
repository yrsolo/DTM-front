# Milestones и цветовые категории

Этот документ описывает текущую milestone-систему и то, как milestone names сопоставляются с цветовыми категориями.

Для кого:
- frontend-инженер;
- владелец продукта;
- любой человек, который обновляет mapping при изменении названий milestones в API.

Source of truth в коде:
- [milestoneTone.ts](../../apps/web/src/utils/milestoneTone.ts)
- [colors.ts](../../apps/web/src/design/colors.ts)
- [TaskDetailsDrawer.tsx](../../apps/web/src/components/TaskDetailsDrawer.tsx)
- [UnifiedTimeline.tsx](../../apps/web/src/gantt/UnifiedTimeline.tsx)

## Назначение слоя

Milestone color system делает разнотипные milestone names устойчивыми для UI. Backend-лексика менялась: часть names была английской, часть русской, часть кастомной. UI должен при этом сохранять стабильные цветовые категории.

## Tone categories

Текущие категории такие:
- `storyboard`
- `animatic`
- `feedback`
- `prefinal`
- `final`
- `master`
- `onair`
- `start`
- `default`

## Alias mapping

`milestoneTone.ts` хранит наборы alias-значений для каждой категории. Принцип такой:
- исторические английские названия сохраняются;
- актуальные русские названия добавляются;
- нераспознанные milestones не ломают UI, а попадают в `default`.

## Где используются milestone colors

### Timeline

Цвет milestone category влияет на:
- bar tone;
- точку milestone;
- label milestone.

### Tooltip

Milestone labels в tooltip наследуют ту же категорию и должны визуально совпадать с timeline.

### Drawer list

Список milestones в карточке задачи использует те же categories для текстов и badge/label-элементов.

### Drawer calendar cells

Календарные ячейки с milestones окрашиваются фоном по tone category. Для нераспознанных значений используется `default`.

## Как обновлять mapping безопасно

1. Взять актуальные milestone names из API или из snapshot активных задач.
2. Сопоставить новые строки с существующими категориями.
3. Добавить новые alias в `milestoneTone.ts`, не удаляя старые исторические значения без необходимости.
4. Если milestone не удаётся уверенно отнести к категории, временно оставить его в `default` и отдельно зафиксировать для ручной классификации.

## Инварианты

- UI не должен зависеть от единственного точного написания milestone name.
- Одна цветовая категория может покрывать набор вариантов названия.
- `default` должен существовать как безопасный fallback.
- Категория `master` поддерживается наравне с другими и должна иметь собственный цветовой control в workbench.

## Текущие компромиссы

- Alias mapping неизбежно накапливает исторические названия.
- Некоторые входные данные могут приходить с проблемами кодировки; это нужно лечить на уровне данных или mapping, но не ценой поломки UI fallback.

