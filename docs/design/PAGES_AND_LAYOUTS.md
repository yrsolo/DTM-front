# Страницы и layout-композиции

Этот документ описывает текущие страницы интерфейса и их визуальную композицию.

Для кого:
- дизайнер интерфейса;
- frontend-инженер, меняющий раскладку;
- владелец продукта.

Source of truth в коде:
- [TimelinePage.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\pages\TimelinePage.tsx)
- [UnifiedTimeline.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\gantt\UnifiedTimeline.tsx)
- [DesignersBoard.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\DesignersBoard.tsx)
- [TaskDetailsDrawer.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\TaskDetailsDrawer.tsx)

## Страница `Задачи`

### Назначение слоя

Дать плотный timeline-обзор задач с возможностью быстро менять группировку, масштаб и фильтры без ухода со страницы.

### Основные визуальные объекты

Сейчас в этой странице важно различать пять объектов:
1. timeline body;
2. row headers / левый блок;
3. top date scale;
4. grouping controls;
5. zoom/filter controls.

### Композиция

- `timeline body` — основное SVG-поле со строками, grid, weekend/holiday overlays и task bars.
- `row headers` — левый блок со строками, который визуально живёт отдельно от графической части.
- `top date scale` — верхняя шкала месяцев и дней, pinned к верхней зоне timeline.
- `grouping controls` — mode panel для переключения view mode.
- `zoom/filter controls` — отдельный docking block с zoom, locale, demo/test/api действиями и runtime-фильтрами.

### Поведение

- горизонтальный drag и vertical drag работают в рамках timeline;
- `Alt + колесо` меняет zoom;
- клик по строке заголовка или по задаче открывает drawer;
- клик по пустой области не должен открывать карточку;
- pinned-элементы ведут себя независимо от основной прокрутки.

### Drawer

`TaskDetailsDrawer` — отдельная поверхность поверх timeline. Внутри:
- заголовок задачи;
- badges;
- список milestones;
- календарь;
- history.

## Страница `Дизайнеры`

### Назначение слоя

Показать тот же snapshot в разрезе исполнителей, без timeline.

### Основные визуальные объекты

- адаптивные колонки по дизайнерам;
- карточки задач;
- tooltip по карточке;
- сервисная шапка страницы, общая с приложением.

### Композиция

- число колонок адаптируется к реальному числу дизайнеров в snapshot;
- пустые зарезервированные колонки не создаются;
- ширина колонок адаптируется под экран, чтобы на широких экранах вмещалось около десяти дизайнеров;
- карточка показывает бренд, формат и шоу;
- имя дизайнера рендерится в две строки: `Имя` / `Фамилия`.

### Hover-tooltip

При наведении показываются:
- milestones в две колонки;
- менеджер;
- history более крупным служебным блоком.

Tooltip может быть шире карточки, чтобы milestone labels помещались в одну-две строки.

## Источники управления

Страницы используют общие runtime controls, но для страницы `Задачи` выделена отдельная вкладка workbench `Tasks page`.

## Инварианты

- `Задачи` остаются основным аналитическим экраном.
- `Дизайнеры` — альтернативный обзор по исполнителям.
- Обе страницы работают на одном и том же snapshot и одном app shell.
