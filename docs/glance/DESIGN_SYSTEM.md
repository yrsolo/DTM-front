# Дизайн-система

Этот документ описывает визуальную архитектуру интерфейса и её основные инварианты.

Для кого:
- дизайнер интерфейса;
- frontend-инженер, меняющий визуальные слои;
- владелец проекта, которому нужно понимать систему, а не набор случайных крутилок.

Source of truth в коде:
- [globals.css](n:\PROJECTS\DTM\DTM-front\apps\web\src\styles\globals.css)
- [colors.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\colors.ts)
- [controls.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\controls.ts)
- [Layout.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\Layout.tsx)

## Назначение слоя

Дизайн-система определяет не только цвета, но и роль каждого визуального слоя: сцена, панели, text hierarchy, glow, badges, milestone colors и отдельные surface-системы для timeline и task drawer.

## Основные визуальные объекты

### Scene background

Общий фон страницы со световыми градиентами и материалом сцены. Он задаёт атмосферу, но не должен мешать читаемости timeline и панелей.

### Topbar

Верхняя часть интерфейса с логотипом, названием продукта и управляющими панелями. Сейчас zoom/filter блок вынесен поверх других слоёв и живёт как самостоятельный docking object.

### Panels and cards

Есть несколько независимых поверхностей:
- панели таблицы и timeline frame;
- панели карточки задачи;
- карточки на странице дизайнеров;
- служебные панели workbench.

Они должны настраиваться независимо, особенно для таймлайна и drawer.

### Text hierarchy

Иерархия текста строится на контрасте:
- сильные заголовки;
- средние labels;
- subdued служебные подписи;
- badges и pills как короткие выделенные токены.

### Badges / pills

Используются в left panel, drawer, designers board и tooltip. Это один из основных повторяемых элементов интерфейса.

### Task palette

Задача может получать собственный базовый оттенок, который используется в bar, карточке дизайнера и связанных визуальных производных.

## Источники управления

- `KeyColors` задают базовые цветовые токены.
- `DesignControls` задают геометрию, opacity, glow, размеры и прочую runtime-настройку.
- CSS variables, проброшенные из `Layout.tsx`, доставляют значения в actual rendering.

## Runtime-параметры

Основные группы runtime-параметров:
- material;
- buttons;
- panels;
- tasks page;
- timeline;
- milestones;
- drawer;
- colors;
- palette;
- animation;
- defaults;
- workbench itself.

Полная карта описана в [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_CONTROLS.md).

## Инварианты

- Timeline остаётся темнее и плотнее, чем карточка задачи.
- Drawer и board cards могут быть светлее и мягче, чем основная таблица.
- Верхние управляющие панели не должны визуально теряться на фоне timeline.
- Badge/pill язык должен быть консистентным на всех страницах.
- Milestone colors должны читаться одинаково в timeline, tooltip и drawer.

## Текущие компромиссы

- Система насыщена runtime-контролами, поэтому без документации легко потерять понимание, какой слой за что отвечает.
- Некоторые визуальные решения исторически накапливались через workbench, поэтому важно держать отдельное описание ролей слоёв, а не только числовых параметров.

## Подробнее

- Страницы и композиции: [PAGES_AND_LAYOUTS.md](n:\PROJECTS\DTM\DTM-front\docs\glance\PAGES_AND_LAYOUTS.md)
- Workbench taxonomy: [WORKBENCH_TAXONOMY.md](n:\PROJECTS\DTM\DTM-front\docs\deep\WORKBENCH_TAXONOMY.md)
- Полная карта контролов: [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\deep\WORKBENCH_CONTROLS.md)
