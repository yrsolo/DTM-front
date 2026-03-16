# Страницы и layout-композиции

Этот документ описывает текущие страницы интерфейса и их визуальную композицию.

Для кого:
- дизайнер интерфейса;
- frontend-инженер, меняющий раскладку;
- владелец продукта.

Source of truth в коде:
- [TimelinePage.tsx](../../apps/web/src/pages/TimelinePage.tsx)
- [MiniAppPage.tsx](../../apps/web/src/pages/MiniAppPage.tsx)
- [AdminPage.tsx](../../apps/web/src/pages/AdminPage.tsx)
- [UnifiedTimeline.tsx](../../apps/web/src/gantt/UnifiedTimeline.tsx)
- [DesignersBoard.tsx](../../apps/web/src/components/DesignersBoard.tsx)
- [TaskDetailsDrawer.tsx](../../apps/web/src/components/TaskDetailsDrawer.tsx)

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
- при первом открытии desktop timeline центрируется на сегодняшней дате;
- маленькая кнопка `Сегодня` в верхней control dock в любой момент возвращает viewport к текущему дню;
- клик по строке заголовка или по задаче открывает drawer;
- клик по пустой области не должен открывать карточку;
- pinned-элементы ведут себя независимо от основной прокрутки.

### Drawer

`TaskDetailsDrawer` — отдельная поверхность поверх timeline. Внутри:
- заголовок задачи;
- badges;
- список milestones;
- календарь;
- скрытая по умолчанию панель вложений с count badge;
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

## Страница `Mini App / Mobile Web`

### Назначение слоя

Дать mobile-first режим текущего frontend без второго SPA. Этот слой живёт на отдельных routes `/app` и `/m`, но использует тот же snapshot, ту же auth session и тот же detail layer.

### Основные визуальные объекты

- нижняя mobile navigation;
- список задач в одну колонку;
- compact agenda/timeline по дедлайнам;
- профиль/доступ;
- полноэкранный task details sheet.

### Композиция

- mobile-first слой не пытается повторить desktop SVG timeline;
- Mini App не показывает completed (`done`) tasks;
- для admin по умолчанию показываются все активные задачи;
- для обычного пользователя по умолчанию показываются только его активные задачи;
- задача в Mini App рендерится как компактная однострочная карточка с bubble даты финала справа;
- в `Задачах` есть grouping buttons `Дизайнер`, `Бренд`, `Шоу`, а сами группы раскрываются и скрываются как секции;
- повторный тап по уже активной grouping button массово схлопывает или раскрывает все текущие секции;
- поле, по которому сейчас сделана группировка, не дублируется внутри карточки задачи;
- вкладка `Таймлайн` рендерится как вертикальная календарная сетка по дням;
- пустые дни остаются видимыми, а выходные и праздники выделяются отдельно;
- внутри дня milestones показываются строками `Майлстоун | Бренд | Формат | Шоу` со стандартным цветовым кодированием по milestone tone;
- верхняя action button `Сегодня` остаётся постоянно доступной и прокручивает календарь к текущему дню;
- `TaskDetailsDrawer` переиспользуется как mobile sheet, а не как вторая отдельная карточка задачи.
- `/app` остаётся Telegram Mini App режимом:
  - Telegram runtime и `initData` bootstrap включены;
  - профиль показывает Telegram diagnostics;
  - fallback-сообщения для отсутствующей связи остаются telegram-specific.
- `/m` и `/mobile` открывают тот же mobile shell как обычный web mobile:
  - авторизация идёт через Яндекс;
  - Telegram runtime не требуется и не используется;
  - список задач фильтруется по обычному `authSession.user.personId`, без Telegram-only bootstrap.
- при заходе на обычный `/` с телефона frontend автоматически переводит пользователя в `/m`;
  - планшеты и desktop остаются на стандартном timeline.
- attachment panel по умолчанию свёрнута, но summary с количеством вложений виден сразу;
- внутри раскрытой панели attachments показываются как compact file-icons;
- desktop использует hover-tooltip для имени и даты загрузки attachment, Mini App — tap-friendly selection surface;
- имя файла в раскрытой панели кликабельно и открывает preview; compact action buttons используют иконки, а preview modal сохраняет full-text buttons;
- повторный клик по уже выбранной file-icon тоже открывает preview;
- встроенный preview внутри сайта сейчас покрывает `docx`, изображения и `pdf`; legacy `doc` открывается через embedded frame без ухода пользователя со страницы;
- upload control виден только admin и использует существующий backend upload contour без изменения snapshot contract;
- при upload frontend нормализует MIME по расширению файла, если браузер или webview не прислал надёжный `File.type`; это покрывает `doc`, `docx`, `pdf` и текущие image-форматы;
- desktop drawer принимает drag-and-drop upload по всей поверхности карточки задачи: при перетаскивании подсвечивается весь drawer, а drop в любое место карточки загружает файл в текущую задачу.

## Страница `Админка`

### Назначение слоя

Собрать в одном месте governance-поверхности для доступа и visual preset management, не смешивая user-ops и styling-ops в один длинный скролл.

### Композиция

- top-level tabs:
  - `Доступ`
  - `Стиль`
- `Доступ` содержит две подвкладки:
  - `Люди`
  - `Ссылки`
- `Стиль` пока содержит одну подвкладку:
  - `Пресеты`
  - `UI`

### `Доступ -> Люди`

Содержит все текущие access-governance блоки:
- pending users;
- approved users;
- approve / reject / revoke;
- admin role toggle;
- allowlist;
- `Обновить базу дизайнеров`.

### `Доступ -> Ссылки`

Рабочая операторская поверхность для временных viewer-ссылок:
- создание reusable link с expiry;
- список active / expired / revoked ссылок;
- quick copy browser URL;
- inline edit label / expiry;
- revoke;
- usage stats / audit log slot.

Runtime semantics:
- ссылка ведёт в обычный web timeline;
- redemption создаёт temp-link session;
- auth panel показывает countdown до `expiresAt`;
- temp-link session даёт full viewer access без admin-прав.

### `Стиль -> Пресеты`

Сохраняет текущую бизнес-логику preset management:
- color presets;
- layout presets;
- import / export / delete / set default;
- drag-order persistence.

### `Стиль -> UI`

Read-only inventory layer для унификации дизайн-системы:
- code-owned registry, не связанный с preset catalog;
- в реестр входят реальные элементы со всех surface layers:
  - desktop pages;
  - Mini App;
  - task drawer;
  - attachments;
  - admin;
  - workbench;
- группы `Buttons`, `Bubbles`, `Labels`, `Panels`;
- поиск по `id / title / description / usage / source path`;
- compact surface filter по месту использования;
- основной режим показа — узкие горизонтальные row-cards в одну строку:
  - слева identity и описание;
  - затем usage tags и source path;
  - справа живой inline preview элемента;
- порядок внутри группы курируется вручную по похожести, чтобы почти одинаковые элементы лежали рядом;
- inspector остаётся secondary aid и показывает `sourcePath`, `similarityKey` и `propsSummary`;
- runtime editing и normalization workflow пока не включены: слой нужен для visual audit и последующей ручной унификации.

### Переходы

- если admin route открыт из Mini App profile, кнопка закрытия возвращает пользователя обратно в Mini App;
- если admin route открыт как обычная desktop/admin поверхность, кнопка закрытия возвращает на основной timeline.

## Источники управления

Страницы используют общие runtime controls, но для страницы `Задачи` выделена отдельная вкладка workbench `Tasks page`.

## Инварианты

- `Задачи` остаются основным аналитическим экраном.
- `Дизайнеры` — альтернативный обзор по исполнителям.
- `Mini App / Mobile Web` — один и тот же мобильный режим frontend для Telegram и обычного mobile-web сценария.
- Обе страницы работают на одном и том же snapshot и одном app shell.

## Подробнее

- Общая продуктовая роль страниц: [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md)
- Архитектура shell и рендеринга: [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
- Workbench и runtime design details: [WORKBENCH_CONTROLS.md](../deep/WORKBENCH_CONTROLS.md)

