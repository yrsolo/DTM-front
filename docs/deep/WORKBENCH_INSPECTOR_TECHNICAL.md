# Workbench Inspector Technical

`Workbench Inspector` — это package-owned universal inspector для local dev, который строит дерево из runtime-структуры React, а затем при возможности обогащает узлы app-specific semantic данными.

Этот документ описывает текущее состояние системы: как inspector включается, как собирает дерево, что показывает в разных режимах и где проходит граница между generic package и app bridge.

## 1. Архитектурная модель

Inspector разделён на два слоя:

- `packages/workbench-inspector` — универсальное ядро;
- `apps/web/src/inspector-integration` — тонкий app-specific bridge.

Package владеет:

- React-first runtime registry;
- runtime tree model;
- shell / launcher;
- `Pick mode`;
- hover / selection / highlight;
- focus set;
- local UI persistence;
- generic properties panel.

App integration владеет:

- activation policy;
- semantic target registry;
- ownership refs;
- workbench bridge actions;
- host metadata и property enrichment.

Current workbench остаётся canonical source of truth для editable runtime values. Inspector ничего не хранит и не редактирует как отдельный editor state.

## 2. Активация и жизненный цикл

Активация задаётся в [`apps/web/src/inspector-integration/activation.ts`](/n:/PROJECTS/DTM/DTM-front/apps/web/src/inspector-integration/activation.ts).

Inspector включается только если одновременно выполняются условия:

- приложение запущено в `import.meta.env.DEV`;
- пользователь явно включил inspector через `?inspector=1` или уже имеет локально сохранённый enabled-flag.

Query-поведение:

- `?inspector=1` включает inspector и сохраняет флаг в localStorage;
- `?inspector=0` выключает inspector и очищает локальный флаг.

Когда inspector выключен:

- package монтируется inert;
- shell и overlay не влияют на страницу;
- workbench остаётся полностью обычным.

## 3. Runtime model

Primary unit — это `InspectorNode`.

Ключевые поля:

- `id` — runtime node id;
- `label` — отображаемое имя;
- `kind` — `semantic | control | content | text | image | container | unknown`;
- `componentName` — имя React-компонента или boundary;
- `tagName` — DOM anchor tag, если он есть;
- `path` — runtime path;
- `ownerPath` — React ownership path;
- `children` — дочерние узлы;
- `bounds` — текущий прямоугольник на странице;
- `isVisible`;
- `isInteractive`;
- `semanticTargetId` — optional enrichment anchor.

Текущее дерево строится через runtime registry в [`packages/workbench-inspector/src/runtime/InspectorRuntimeRegistry.ts`](/n:/PROJECTS/DTM/DTM-front/packages/workbench-inspector/src/runtime/InspectorRuntimeRegistry.ts) и dev-only boundary layer в [`packages/workbench-inspector/src/runtime/InspectorNodeBoundary.tsx`](/n:/PROJECTS/DTM/DTM-front/packages/workbench-inspector/src/runtime/InspectorNodeBoundary.tsx).

Важные свойства текущей runtime-модели:

- inspector идёт от React runtime graph, а не от обхода `document.body`;
- boundary layer автоматически выдаёт technical runtime ids;
- DOM используется как secondary anchor layer для highlight, pick mode и reveal-on-page;
- `data-inspector-target-id` используется как optional semantic marker, а не как primary source of truth.

Почему semantic registry не является primary tree:

- inspector должен работать на любой странице, даже без полной ручной semantic-разметки;
- app-side semantic mapping покрывает только важные продуктовые зоны;
- generic React tree нужен как baseline navigation layer.

## 4. Semantic enrichment

App-side enrichment живёт в `apps/web/src/inspector-integration/`.

Он добавляет к generic node:

- более чистый label;
- metadata;
- ownership refs;
- property sections;
- optional `Open in Workbench`.

Semantic mapping остаётся optional:

- если у узла есть `semanticTargetId`, inspector может показать richer metadata;
- если semantic mapping нет, узел всё равно остаётся полнофункциональным generic inspector node.

Примеры текущих live semantic targets:

- `app.timeline.controls`
- `app.timeline.canvas`
- `app.task.drawer`

Примеры текущих host-side метаданных:

- `availability`
- `scope`
- `designArea`
- `ownerTab`
- `tuningPriority`

## 5. Shell и режимы

### Disabled

Inspector неактивен и не влияет на страницу.

### Launcher collapsed

При включённом inspector пользователь видит плавающий launcher.

- launcher draggable;
- launcher разворачивает основной shell;
- collapsed-state сохраняется локально.

### Shell expanded

Основной shell содержит:

- левый блок `Layers`;
- правый блок `Properties`;
- верхнюю панель режимов и действий.

### `Pick mode off`

Страница интерактивна как обычно.

- можно работать через дерево;
- hover по строке дерева подсвечивает соответствующий элемент на странице;
- selection в дереве обновляет правую панель.

### `Pick mode on`

Страница переводится в режим выбора мышкой.

- поверх страницы включается page shield;
- page interaction блокируется;
- shell inspector остаётся активным и из него можно выйти из `Pick mode`;
- pointer hover показывает рамку на выбранном runtime node;
- click по странице выбирает узел и синхронизирует его с деревом;
- выбор идёт по deepest доступному runtime element через `elementsFromPoint`, а не по верхнему контейнеру.

### `All`

Показывает все текущие зарегистрированные React-узлы дерева.

### `Focus`

Показывает только отмеченные узлы и их ancestor path.

Это package-owned filtering, а не host-owned editor state.

### `Meaningful components`

Пытается убрать часть runtime wrapper noise и оставить более meaningful React view.

### `All registered nodes`

Показывает более полный runtime graph зарегистрированных React-узлов.

## 6. Tree behavior

Дерево рендерится через `react-arborist` в [`packages/workbench-inspector/src/panels/InspectorSidebar.tsx`](/n:/PROJECTS/DTM/DTM-front/packages/workbench-inspector/src/panels/InspectorSidebar.tsx).

Текущее поведение дерева:

- строки строятся из `InspectorNode.children`;
- expand/collapse state хранится в package state;
- chevron виден только у узлов, у которых реально есть дочерние узлы;
- повторный клик по уже выбранной строке раскрывает или сворачивает её ветку;
- hover по строке дерева подсвечивает элемент на странице;
- `+ / ★` помечает узел как важный для `Focus`.

Search:

- фильтрует по `label`;
- фильтрует по `tagName`;
- учитывает enriched host label, если он есть.

SVG-backed nodes:

- timeline и похожие графические subtree больше не схлопывают дерево до внешнего контейнера;
- highlight и pick mode продолжают работать по DOM anchors, даже если primary tree уже React-first.

## 7. Selection, hover и highlight flow

Selection flow:

- выбор в дереве -> `selectedNodeId`;
- inspector ищет элемент узла;
- правый блок перестраивается под текущий selection;
- на странице показывается selected highlight.

Hover flow:

- hover строки дерева -> `hoveredNodeId`;
- inspector рисует hover рамку на странице;
- если selected node есть, он остаётся более сильным highlight.

`Pick mode` flow:

- page pointer move -> ищется underlying element;
- inspector поднимается от deepest element к ближайшему известному node;
- hover обновляется на лету;
- click фиксирует selection;
- `Escape` выключает `Pick mode`.

## 8. Right panel behavior

Правая панель всегда показывает generic inspector sections для выбранного узла:

- `Node`
- `Layout`

Если enrichment доступен, добавляются:

- `Semantic`
- `Ownership`
- host-provided property sections

Также могут появляться действия:

- `Reveal on page`
- `Copy node id`
- `Open in Workbench`

Чего здесь сейчас нет:

- package-owned inline editing model;
- bidirectional authoring UI;
- full editable design-control surface.

То есть правая панель сейчас mixed inspection + bridge, а не полноценный editor.

## 9. Persistence

Inspector хранит package-owned UI state в localStorage под ключом:

- `dtm.workbenchInspector.ui.v3`

Там сохраняются:

- `panelOpen`
- `panelPosition`
- `pickMode`
- `hierarchy.expandedNodeIds`
- `hierarchy.markedNodeIds`
- `hierarchy.query`
- `hierarchy.focusMode`
- `hierarchy.treeFilterMode`

Отдельно activation-flag хранится в:

- `dtm.workbenchInspector.enabled`

Что переживает reload:

- открытость shell;
- позиция панели;
- `Pick mode`;
- search query;
- раскрытые ветки;
- marked nodes;
- `All / Focus`;
- `Smart DOM / Raw DOM`.

Persistence локальная и dev-only. Production behavior на неё не опирается.

## 10. Текущие ограничения и non-goals

Inspector сейчас intentionally не делает следующее:

- не пытается дать полную parity с Figma;
- не заменяет current workbench;
- не включает production exposure;
- не хранит editable design values;
- не строит второй editor state;
- не гарантирует semantic enrichment для всех узлов страницы.

Текущий фокус системы:

- universal React-first navigation;
- semantic enrichment поверх generic tree;
- design-tuning workflows через selection, hover, focus set и workbench bridge.

## 11. Связанные документы

- Proposal: [WORKBENCH_INSPECTOR_PROPOSAL.md](WORKBENCH_INSPECTOR_PROPOSAL.md)
- Structure: [WORKBENCH_INSPECTOR_STRUCTURE.md](WORKBENCH_INSPECTOR_STRUCTURE.md)
- Boundaries: [WORKBENCH_INSPECTOR_BOUNDARIES.md](WORKBENCH_INSPECTOR_BOUNDARIES.md)
- Targets: [WORKBENCH_INSPECTOR_TARGETS.md](WORKBENCH_INSPECTOR_TARGETS.md)
- Delivery process: [WORKBENCH_INSPECTOR_DELIVERY_PROCESS.md](WORKBENCH_INSPECTOR_DELIVERY_PROCESS.md)
