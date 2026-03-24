# Workbench Inspector — краткое описание идеи

Мы добавляем в `DTM-front` **локальный dev-only инспектор поверх живой страницы**, который помогает визуально разбирать интерфейс и быстрее работать с существующей системой runtime-настроек.

Сейчас в проекте уже есть `ControlsWorkbench` и каноническая структура runtime-контролов: цвета, defaults, layout, визуальные параметры отдельных зон. Но когда смотришь на готовую страницу, не всегда очевидно:

- какая часть интерфейса сейчас выбрана как объект настройки;
- какой вкладкой или группой workbench она управляется;
- где именно искать нужный control;
- как связаны визуальная зона на экране и существующая дизайн-система.

Идея Workbench Inspector в том, чтобы решить именно эту проблему.

## Что это должно дать

Inspector должен позволять:

- навести курсор на интерфейс и увидеть **осмысленную визуальную зону**, а не случайный DOM-узел;
- выбрать эту зону;
- понять, **какая часть текущего workbench владеет её настройками**;
- быстро перейти к нужным controls;
- в будущем — аккуратно расширить это до более удобного локального дизайна и отладки.

То есть это не “второй редактор сайта” и не page builder.

Это **контекстный слой поверх уже существующей design/runtime-системы**.

## Зачем это нужно

Фича нужна, чтобы:

- быстрее ориентироваться в сложном интерфейсе;
- укреплять дизайн-систему, а не плодить хаос;
- сделать визуальную настройку более понятной;
- связать “что я вижу на странице” и “где это настраивается”;
- заложить основу для будущего универсального inspector-инструмента, который потом можно будет переиспользовать и в других проектах.

## Почему делаем это отдельным package внутри монорепы

Мы хотим **сразу сильно отделить библиотечную часть от сайта**, но пока не выносить её в отдельную репу.

Поэтому архитектура такая:

- `packages/workbench-inspector/` — будущая универсальная библиотека;
- `apps/web/src/inspector-integration/` — тонкий слой интеграции с текущим сайтом;
- весь inspector работает **только локально и только в dev-режиме**.

Это позволяет:
- не переписывать потом всё заново;
- не смешивать код инструмента с кодом сайта;
- постепенно развивать inspector как самостоятельную систему;
- при этом не усложнять себе старт отдельным репозиторием и лишней координацией.

## Главный принцип

Мы не создаём новую конкурирующую систему контролов.

Мы делаем инструмент, который помогает:
- выбрать визуальную область;
- понять её ownership;
- работать с уже существующим workbench.

Именно поэтому сначала важны:
- смысл фичи,
- модель target-ов,
- связь с текущим workbench,
- и только потом границы, пакеты, кампании и правила реализации.


---

## `docs/deep/WORKBENCH_INSPECTOR_PROPOSAL.md`

```md
# WORKBENCH INSPECTOR — proposal

## Статус
Draft / proposed

## Зачем это нужно

В проекте уже существует runtime-настройка визуальной системы через workbench:
- runtime controls;
- key colors;
- runtime defaults;
- workbench layout;
- каноническая ownership-модель контролов.

Новая задача — не строить второй параллельный редактор, а добавить **контекстный инспектор поверх живой страницы**, который:

- работает локально у разработчика;
- умеет выбрать визуальную область на текущей странице;
- показывает, какой частью workbench владеет выбранная зона;
- переводит пользователя к нужным control groups;
- позже может поддержать ограниченное локальное редактирование;
- не вводит второй ownership runtime values.

## Принципиальное решение

### Не отдельная репа
Пока механика не доказана, вынос в отдельный репозиторий преждевременен.

### Но жёсткое разделение сразу
Чтобы не срастить инструмент с сайтом, код делится так:

- `packages/workbench-inspector/`
  - будущая библиотека;
  - не знает ничего про DTM;
  - не знает про страницы, бизнес-сущности и API сайта.

- `apps/web/src/inspector-integration/`
  - тонкий слой интеграции;
  - знает про конкретные visual targets сайта;
  - связывает inspector с существующим workbench.

## Что такое Workbench Inspector

Workbench Inspector — это dev-only overlay-инструмент, который:

1. включается только локально;
2. накладывается на живую страницу;
3. позволяет hover/select по визуальным зонам;
4. определяет канонический `target`;
5. показывает target hierarchy / ownership;
6. открывает или фокусирует существующий workbench на нужных control groups.

## Чего это НЕ должно делать на первом этапе

- не становиться page builder-ом;
- не редактировать произвольный DOM;
- не работать в production;
- не синхронизироваться через backend;
- не хранить отдельную конкурирующую систему control values;
- не дублировать current workbench UI.

## Почему package внутри монорепы — лучший компромисс

Такой вариант:
- даёт сильную изоляцию от кода сайта;
- снимает раннюю боль отдельной репы;
- позволяет быстро менять API;
- сохраняет путь к будущему извлечению в standalone package или repo.

## Высокоуровневая архитектура

### 1. package `workbench-inspector`
Содержит:
- editor/runtime state;
- overlay selection;
- hover and selection outlines;
- inspector panels;
- target registry API;
- adapter contract;
- debug hooks;
- internal event bus / command model.

### 2. web integration
Содержит:
- registry конкретных visual targets сайта;
- mapping `target -> workbench tab/group/control ownership`;
- local-only activation rules;
- glue-code для `ControlsWorkbench`.

## Базовый принцип source of truth

Inspector не должен становиться новым source of truth для значений.

Он может:
- помогать выбрать визуальную зону;
- показывать ownership;
- в перспективе триггерить изменения через существующую runtime control систему.

Но реальные значения по-прежнему должны жить там же, где живут сейчас:
- `DesignControls`
- `KeyColors`
- `RuntimeDefaults`
- `workbenchLayout`
- и их текущая каноническая ownership-модель.

## Базовый UX сценарий

1. Разработчик открывает локальный `apps/web`.
2. Включает inspector через dev flag.
3. Наводит курсор на визуальную область.
4. Inspector подсвечивает допустимый target.
5. По клику target выбирается.
6. В правой панели показывается:
   - canonical target id;
   - label;
   - parent/children;
   - какие workbench tabs/groups владеют этим target;
   - quick actions.
7. Кнопка `Open in Workbench` переводит пользователя в соответствующую часть уже существующего workbench.

## Ключевая формула

Не:
> «делаем новый редактор поверх сайта»

А:
> «добавляем contextual selection layer к уже существующей системе runtime design controls»

## Дальнейшая эволюция

После того как foundation заработает, можно поэтапно добавить:
- breadcrumbs;
- target tree;
- safe local editing через существующие controls;
- optional token visualizer;
- optional control ownership debugger;
- optional export/import local presets.

Но всё это — только после того, как доказана базовая selection + mapping mechanics.
```

---

## `docs/deep/WORKBENCH_INSPECTOR_BOUNDARIES.md`

````md
# WORKBENCH INSPECTOR — boundaries

## Цель документа

Зафиксировать архитектурные границы так, чтобы:
- inspector можно было в будущем вынести из `DTM-front`;
- библиотека не срасталась с приложением;
- сайт не начинал импортировать внутренности inspector как попало;
- ownership runtime controls не размывался.

---

## 1. Структурная граница

### Allowed
- `packages/workbench-inspector/**`
- `apps/web/src/inspector-integration/**`

### Forbidden
Новый код inspector не должен размазываться по произвольным папкам сайта.

Нельзя:
- раскладывать inspector-логику по `pages/*`;
- прятать её в случайные `shared/*`;
- встраивать inspector state в доменные UI-компоненты;
- смешивать package code и app integration code в одних файлах.

---

## 2. Граница ответственности

### `packages/workbench-inspector/**` отвечает за:
- overlay mechanics;
- hover/select logic;
- target model;
- generic inspector state;
- generic panel model;
- generic contracts and types;
- generic commands;
- dev-only inspector shell.

### `apps/web/src/inspector-integration/**` отвечает за:
- какие visual targets есть в приложении;
- как они определяются;
- как target связан с existing workbench ownership;
- как открывать нужные workbench tabs/groups;
- local activation wiring inside web app.

---

## 3. Domain ignorance rule

Код в `packages/workbench-inspector/**` должен быть domain-agnostic.

Он не должен знать:
- task
- designer
- manager
- sheet
- timeline item semantics
- drawer business semantics
- domain statuses
- domain entities
- DTM-specific API terms

Он может знать только:
- target
- overlay
- panel
- selection
- group
- control owner reference
- adapter
- metadata

---

## 4. Import rules

### Rule A
`packages/workbench-inspector/**` не импортирует код из:
- `apps/web/**`
- `apps/**`
- app-specific packages, если они несут domain semantics

### Rule B
`apps/web/**` не импортирует внутренности package напрямую.

Разрешён только импорт через публичный entry package-а, например:

```ts
import { InspectorProvider, InspectorOverlay } from '@dtm/workbench-inspector'
````

или эквивалентный agreed package entry.

### Rule C

Связь между package и web app идёт только через integration-layer.

---

## 5. Source of truth rule

Inspector не является источником истины для runtime design values.

Inspector:

* выбирает target;
* показывает metadata;
* показывает ownership;
* вызывает actions.

Inspector не:

* хранит параллельный канонический набор цветов;
* хранит параллельный канонический набор defaults;
* хранит альтернативную ownership taxonomy.

---

## 6. Production rule

Inspector — только local dev tooling.

На первом этапе запрещено:

* production mounting;
* staging public access;
* backend persistence;
* auth-protected inspector routes;
* multi-user editing;
* remote control sessions.

---

## 7. DOM rule

DOM используется только как технический слой:

* hit testing;
* bounding boxes;
* overlay placement.

DOM не является semantic source of truth.

Все meaningful decisions должны идти через:

* target registry;
* app integration mapping;
* ownership metadata.

---

## 8. One-owner rule

Каждый runtime control должен иметь одно каноническое место владения.

Inspector не имеет права:

* заводить дубли control ownership;
* создавать вторую competing hierarchy controls;
* дублировать вкладки workbench;
* плодить зеркальные панели для тех же значений.

Inspector может только:

* указывать на owner;
* вести к owner;
* отображать owner.

---

## 9. Scope control

На старте разрешены только presentational targets:

* surfaces;
* blocks;
* panels;
* shell regions;
* table surface zones;
* timeline visual regions;
* drawer visual regions;
* badges/chips families;
* layout wrappers.

Не разрешены:

* сложные business-flow nodes;
* API-driven controls;
* domain mutation panels;
* anything requiring backend roundtrips.

---

## 10. Extensibility rule

Любое новое поведение должно добавляться так, чтобы:

* package оставался extractable;
* public API оставался узким;
* app integration оставалась thin;
* current workbench remained canonical.

---

## 11. Review checklist

При любой новой кампании нужно проверить:

* [ ] package не импортирует app-specific code
* [ ] integration-layer thin and explicit
* [ ] no duplicate ownership created
* [ ] no production exposure introduced
* [ ] no backend persistence introduced
* [ ] no domain semantics leaked into package
* [ ] inspector works only under local dev flag
* [ ] existing workbench remains canonical editor surface

````

---

## `docs/deep/WORKBENCH_INSPECTOR_STRUCTURE.md`

```md
# WORKBENCH INSPECTOR — proposed repository structure

## Цель

Зафиксировать рекомендуемую файловую структуру внутри текущей монорепы так, чтобы:
- separation был максимальным;
- интеграция с сайтом оставалась тонкой;
- путь к будущему вынесению package был простым.

---

## Proposed tree

```text
packages/
  workbench-inspector/
    package.json
    tsconfig.json
    src/
      public.ts

      core/
        state.ts
        store.ts
        actions.ts
        reducer.ts
        commands.ts
        history.ts

      model/
        target.ts
        targetTree.ts
        ownership.ts
        panels.ts
        overlays.ts

      contracts/
        adapter.ts
        registry.ts
        metadata.ts
        activation.ts

      runtime/
        InspectorProvider.tsx
        useInspector.ts
        useInspectorState.ts
        useSelection.ts

      overlay/
        InspectorOverlay.tsx
        HoverOutline.tsx
        SelectedOutline.tsx
        BoundsTracker.ts
        overlayMath.ts

      panels/
        InspectorSidebar.tsx
        TargetMetaPanel.tsx
        OwnershipPanel.tsx
        HierarchyPanel.tsx
        DebugPanel.tsx

      ui/
        FloatingToolbar.tsx
        Breadcrumbs.tsx
        EmptyState.tsx

      utils/
        dom.ts
        guards.ts
        ids.ts
        shallow.ts

      types/
        common.ts
        target.ts
        ownership.ts
        controls.ts
        panel.ts

apps/
  web/
    src/
      inspector-integration/
        index.ts
        activation.ts
        targetRegistry.ts
        targetBindings.ts
        openWorkbench.ts
        workbenchOwnership.ts
        targetGuards.ts
        targetMeta.ts

      components/
        inspector/
          WebInspectorMount.tsx

      app/
      pages/
      design/
      styles/
      data/

docs/
  deep/
    WORKBENCH_INSPECTOR_PROPOSAL.md
    WORKBENCH_INSPECTOR_BOUNDARIES.md
    WORKBENCH_INSPECTOR_STRUCTURE.md
    WORKBENCH_INSPECTOR_TARGETS.md
    WORKBENCH_INSPECTOR_DELIVERY_PROCESS.md

work/
  roadmap/
    campaigns/
      CAM-WORKBENCH-INSPECTOR-FOUNDATION/
        charter.md
        plan.md
        evidence.md
      CAM-WORKBENCH-INSPECTOR-SELECTION/
        charter.md
        plan.md
        evidence.md
      CAM-WORKBENCH-INSPECTOR-BINDINGS/
        charter.md
        plan.md
        evidence.md
      CAM-WORKBENCH-INSPECTOR-UI/
        charter.md
        plan.md
        evidence.md
      CAM-WORKBENCH-INSPECTOR-HARDENING/
        charter.md
        plan.md
        evidence.md
````

---

## Why this structure

### `packages/workbench-inspector`

Это будущая библиотека.
Она должна быть как можно ближе к самостоятельному package already now.

### `apps/web/src/inspector-integration`

Это единственное место, где библиотека узнаёт про текущий сайт.

### `components/inspector/WebInspectorMount.tsx`

Тонкая точка подключения к web app.

---

## Package public API rule

Внутренности package не должны импортироваться из app напрямую.

Нужен один public entry:

```text
packages/workbench-inspector/src/public.ts
```

Допустимый consumer pattern:

```ts
import {
  InspectorProvider,
  InspectorOverlay,
  type InspectorAdapter,
} from '@dtm/workbench-inspector'
```

---

## App integration rule

В `apps/web/src/inspector-integration/*` разрешены:

* imports from app-specific code
* imports from existing workbench code
* mapping to control groups and tabs
* local feature flag wiring

Но запрещено:

* тащить app imports обратно в package
* переопределять current workbench ownership
* дублировать existing workbench values

---

## Future extraction path

Если package докажет жизнеспособность:

1. стабилизировать API;
2. сократить лишние app assumptions;
3. вынести `packages/workbench-inspector` в отдельную репу или standalone package;
4. оставить в `DTM-front` только integration-layer.

Такая структура делает extraction path самым дешёвым.

````

---

## `docs/deep/WORKBENCH_INSPECTOR_TARGETS.md`

```md
# WORKBENCH INSPECTOR — target model

## Цель

Определить, что именно inspector выбирает на странице.

Inspector не должен выбирать “любой div”.
Он должен выбирать **канонические visual targets**, которые:
- понятны человеку;
- стабильны относительно DOM churn;
- сопоставимы с ownership existing workbench controls.

---

## 1. Что такое target

Target — это semantic visual zone, а не сырой DOM node.

Пример:
- `app-shell`
- `top-header`
- `timeline-surface`
- `timeline-grid`
- `timeline-card-family`
- `tasks-table-surface`
- `drawer-surface`
- `milestone-chip-family`
- `controls-workbench-shell`

Target должен быть:
- recognisable;
- stable;
- mappable to workbench ownership.

---

## 2. Target levels

### Level A — surface targets
Крупные области интерфейса:
- app shell
- main surface
- side panels
- drawer
- top navigation

### Level B — system regions
Области внутри конкретного большого модуля:
- timeline surface
- tasks table surface
- milestones region
- motion region
- drawer content area

### Level C — family targets
Семейства повторяемых визуальных элементов:
- task card family
- status badge family
- milestone chip family
- table row family
- table cell family

---

## 3. Что не является target на старте

На старте не считаются target:
- случайные wrapper divs
- dynamic technical nodes
- transient DOM helpers
- nodes without stable visual meaning
- nodes meaningful only to React internals

---

## 4. Target fields

Recommended shape:

```ts
type InspectorTarget = {
  id: string
  type: string
  label: string
  level: 'surface' | 'region' | 'family'
  dom?: HTMLElement | null
  parentId?: string
  childrenIds?: string[]
  ownershipRefs: OwnershipRef[]
  debug?: Record<string, unknown>
}
````

---

## 5. OwnershipRef

Target должен указывать, кто им владеет с точки зрения existing workbench.

```ts
type OwnershipRef = {
  tabId: string
  groupId?: string
  controlIds?: string[]
  note?: string
}
```

---

## 6. Mapping examples

### Example: timeline grid

```text
target.id = timeline-grid
ownership:
- tab: Timeline
- groups: grid, density, rows, milestones-visual-linkage
```

### Example: drawer surface

```text
target.id = drawer-surface
ownership:
- tab: Drawer
- groups: shell, spacing, elevation, inner-surface
```

### Example: task status badges

```text
target.id = task-status-badge-family
ownership:
- tab: Tasks Table
- groups: badges, status-coloring, typography
```

---

## 7. Selection philosophy

When inspector hovers the page:

* it should prefer nearest valid semantic target;
* not raw deepest DOM node;
* not random technical wrapper.

This means the app integration layer should expose a registry of valid targets.

---

## 8. Future evolution

Later we may support:

* control-level highlights;
* token-level explanations;
* target search;
* inspector tree.

But first the model must remain small and stable.

````

---

## `docs/deep/WORKBENCH_INSPECTOR_DELIVERY_PROCESS.md`

```md
# WORKBENCH INSPECTOR — delivery process

## Цель

Описать, как вести работу над inspector внутри существующего процесса проекта.

---

## 1. Где трекать работу

Работа ведётся через текущие project conventions:
- `agent/OPERATING_CONTRACT.md`
- `/AGENTS.md`
- `work/roadmap/campaigns/*`
- `work/now/tasks.md`

Inspector не получает отдельного “теневого” процесса.

---

## 2. Как оформляется новая работа

Для каждого этапа создаётся campaign folder:

```text
work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-<NAME>/
  charter.md
  plan.md
  evidence.md
````

---

## 3. Что обязательно должно быть в charter

* цель кампании;
* scope;
* constraints;
* boundary reminders;
* acceptance criteria;
* explicit out-of-scope.

---

## 4. Что обязательно должно быть в plan

* маленькие шаги реализации;
* ожидаемые touched paths;
* проверки after each step;
* risk notes.

---

## 5. Что обязательно должно быть в evidence

* что было сделано;
* какие файлы изменены;
* как проверялось;
* не нарушены ли architectural boundaries;
* open questions / follow-up items.

---

## 6. Gate before coding

Перед любой реализацией агент обязан:

1. прочитать operating docs;
2. прочитать existing workbench docs;
3. прочитать inspector proposal docs;
4. только после этого создавать кодовые изменения.

---

## 7. Non-negotiable rules

* no production exposure;
* no backend sync;
* no duplicate workbench ownership;
* no package -> app imports;
* no random DOM editing as source of truth.

---

## 8. Recommended order of campaigns

1. FOUNDATION
2. SELECTION
3. BINDINGS
4. UI
5. HARDENING

---

## 9. Definition of done per campaign

Кампания считается завершённой, если:

* acceptance criteria выполнены;
* boundaries не нарушены;
* evidence.md заполнен;
* `work/now/tasks.md` обновлён.

---

## 10. When to consider extraction

Вынесение `packages/workbench-inspector` за пределы текущей репы рассматривается только после:

* working foundation;
* stable target model;
* stable adapter contract;
* at least one useful end-to-end local workflow.

````

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-FOUNDATION/charter.md`

```md
# CAM-WORKBENCH-INSPECTOR-FOUNDATION — charter

## Objective

Заложить архитектурный фундамент workbench inspector внутри текущей монорепы так, чтобы:
- будущая библиотека была сразу жёстко отделена от сайта;
- inspector опирался на текущую workbench-system, а не конкурировал с ней;
- кодовая база была готова к следующему этапу: selection overlay.

## Scope

In scope:
- создание package skeleton `packages/workbench-inspector/`
- создание web integration skeleton `apps/web/src/inspector-integration/`
- создание public package entry
- создание базовых типов и contracts
- создание docs for proposal / boundaries / structure / targets / process
- создание campaign scaffolding
- dev-only activation skeleton without UI behavior

Out of scope:
- hover/select overlay behavior
- target detection implementation
- actual workbench focus switching
- local editing
- persistence
- production wiring

## Constraints

- package must remain domain-agnostic
- no package imports from app code
- no duplicate runtime control ownership
- no production exposure
- no backend integration
- no page-builder behavior
- no hidden side effects in current app runtime

## Acceptance criteria

- `packages/workbench-inspector/` exists and compiles
- `apps/web/src/inspector-integration/` exists and compiles
- package has a narrow public entry
- docs are added under `docs/deep/`
- no existing app behavior is changed
- foundation is ready for selection campaign

## Risks to watch

- accidentally leaking DTM-specific semantics into package
- introducing a second source of truth for workbench values
- over-designing the API too early
- mixing integration code into package internals
````

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-FOUNDATION/plan.md`

```md
# CAM-WORKBENCH-INSPECTOR-FOUNDATION — plan

## Step 1 — Read and align
Read current operational and architectural docs:
- agent/OPERATING_CONTRACT.md
- /AGENTS.md
- docs/README.md
- docs/glance/*
- docs/deep/FRONTEND_STRUCTURE.md
- docs/deep/WORKBENCH_CONTROLS.md

Outcome:
- avoid proposing a parallel editor architecture
- anchor inspector around current workbench ownership model

## Step 2 — Create package skeleton
Create:
- packages/workbench-inspector/package.json
- packages/workbench-inspector/tsconfig.json
- packages/workbench-inspector/src/public.ts
- source folders for core/model/contracts/runtime/overlay/panels/ui/utils/types

Outcome:
- future-extractable package structure exists
- no real behavior yet

## Step 3 — Define base contracts
Add minimal types:
- InspectorTarget
- OwnershipRef
- InspectorAdapter
- InspectorActivation
- InspectorPanel model
- generic state model

Outcome:
- package API has a shape
- future campaigns have stable starting point

## Step 4 — Create web integration skeleton
Create:
- apps/web/src/inspector-integration/index.ts
- activation.ts
- targetRegistry.ts
- targetBindings.ts
- openWorkbench.ts
- targetGuards.ts

Outcome:
- app-specific integration has a single home
- package/app boundary is explicit

## Step 5 — Add docs
Add all proposed deep docs for inspector:
- proposal
- boundaries
- structure
- targets
- delivery process

Outcome:
- future agents have a canonical reference
- architecture drift risk is reduced

## Step 6 — Add no-op mount path
Create a minimal no-op mount path inside web app, guarded by local dev activation.
No visual behavior yet.

Outcome:
- activation plumbing exists
- next campaign can attach overlay

## Verification checklist
- [ ] package builds
- [ ] app builds
- [ ] no package imports from app
- [ ] no production behavior change
- [ ] no duplicate control state introduced
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-FOUNDATION/evidence.md`

```md
# CAM-WORKBENCH-INSPECTOR-FOUNDATION — evidence

## Status
Planned

## Intended deliverables
- package skeleton
- integration skeleton
- base contracts
- docs
- no-op activation path

## Verification to perform
- app compile passes
- package compile passes
- grep or lint confirms no package -> app imports
- no visible runtime change when inspector disabled

## Notes
This campaign intentionally stops before implementing any overlay logic.
Its goal is separation and scaffolding, not user-visible behavior.
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-SELECTION/charter.md`

```md
# CAM-WORKBENCH-INSPECTOR-SELECTION — charter

## Objective

Реализовать базовый dev-only overlay selection workflow:
- hover valid target
- select valid target
- show visual outline
- keep inspector target model semantic

## Scope

In scope:
- hover tracking
- target hit testing via integration registry
- selected target state
- hover and selected outlines
- overlay placement and bounds tracking

Out of scope:
- workbench focus switching
- control editing
- persistence
- production usage

## Constraints

- inspector must select semantic targets, not arbitrary DOM nodes
- DOM is used only for technical positioning
- package stays domain-agnostic
- target semantics are provided only via integration layer

## Acceptance criteria

- valid targets are highlighted on hover
- click selects a target
- selected target remains outlined correctly during scroll/resize
- unregistered DOM nodes are ignored
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-SELECTION/plan.md`

```md
# CAM-WORKBENCH-INSPECTOR-SELECTION — plan

## Step 1 — Finalize selection state
Add generic state fields:
- hoveredTargetId
- selectedTargetId
- target bounds snapshot

## Step 2 — Add overlay primitives
Implement:
- HoverOutline
- SelectedOutline
- overlay math helpers
- bounds tracker

## Step 3 — Wire hit testing
Through web integration layer:
- detect nearest valid semantic target
- ignore random DOM wrappers
- normalize target resolution

## Step 4 — Mount overlay in local dev mode
Use no-op mount path from foundation campaign and attach overlay only when enabled.

## Step 5 — Verify UX basics
- hover works
- click works
- outlines reposition on resize/scroll

## Verification checklist
- [ ] no workbench ownership changes introduced
- [ ] no app-specific imports leaked into package
- [ ] only semantic targets can be selected
- [ ] overlay works only locally in dev
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-SELECTION/evidence.md`

```md
# CAM-WORKBENCH-INSPECTOR-SELECTION — evidence

## Status
Planned

## Intended deliverables
- hover state
- selection state
- semantic target resolution
- overlay outlines

## Verification to perform
- local manual check with inspector flag on
- scroll/resize resilience check
- check that random DOM nodes are not selected
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-BINDINGS/charter.md`

```md
# CAM-WORKBENCH-INSPECTOR-BINDINGS — charter

## Objective

Связать inspector targets с существующей системой workbench ownership так, чтобы выбранная зона могла:
- показать, кто ей владеет;
- открыть нужную часть workbench;
- не создать параллельную систему контролов.

## Scope

In scope:
- target -> ownership refs mapping
- ownership panel
- open-in-workbench action
- integration with existing workbench navigation/focus model

Out of scope:
- new control values
- duplicated sidebar controls
- local editing of actual values

## Constraints

- existing workbench remains canonical
- inspector only points to owners
- no duplication of tabs/groups ownership

## Acceptance criteria

- selected target shows ownership refs
- quick action opens/focuses the relevant workbench section
- mapping remains explicit and integration-local
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-BINDINGS/plan.md`

```md
# CAM-WORKBENCH-INSPECTOR-BINDINGS — plan

## Step 1 — Define ownership refs
Finalize:
- tab ids
- optional group ids
- optional control ids
- note/debug info

## Step 2 — Add integration mapping
In web integration layer:
- map each target to ownership refs
- keep mapping readable and explicit

## Step 3 — Add ownership panel
Render ownership refs generically in package panel UI.

## Step 4 — Add workbench open/focus bridge
Implement integration-side helper to open/focus current workbench context.

## Step 5 — Verify one-owner rule
Ensure every target points to existing owners rather than creating new ones.

## Verification checklist
- [ ] no duplicated control hierarchies
- [ ] no package knowledge of workbench internals beyond contracts
- [ ] mappings live only in integration layer
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-BINDINGS/evidence.md`

```md
# CAM-WORKBENCH-INSPECTOR-BINDINGS — evidence

## Status
Planned

## Intended deliverables
- ownership mapping
- ownership panel
- workbench focus/open action

## Verification to perform
- selected target shows proper owner refs
- open action lands in the correct workbench area
- no duplicated controls were introduced
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-UI/charter.md`

```md
# CAM-WORKBENCH-INSPECTOR-UI — charter

## Objective

Собрать usable local inspector UI поверх уже работающих selection и bindings.

## Scope

In scope:
- sidebar shell
- target metadata panel
- hierarchy / breadcrumbs
- ownership panel composition
- floating toolbar / quick actions
- empty states

Out of scope:
- advanced editing
- persistence
- token authoring
- production UI support

## Constraints

- UI remains generic in package
- app-specific labels/mapping stay in integration layer
- workbench remains canonical editing surface

## Acceptance criteria

- local workflow feels usable
- selected target metadata is visible
- hierarchy is visible
- ownership access is convenient
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-UI/plan.md`

```md
# CAM-WORKBENCH-INSPECTOR-UI — plan

## Step 1 — Sidebar shell
Implement generic sidebar with sections:
- target meta
- hierarchy
- ownership
- debug

## Step 2 — Breadcrumbs
Show selected target path for orientation.

## Step 3 — Floating quick actions
Add minimal actions:
- open in workbench
- copy target id
- toggle debug info

## Step 4 — Empty states
Ensure no-selection mode is informative and clean.

## Step 5 — Verify usability
Manual dev workflow check.

## Verification checklist
- [ ] still no duplicate editing surface
- [ ] package UI remains generic
- [ ] app-specific strings remain thin and local
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-UI/evidence.md`

```md
# CAM-WORKBENCH-INSPECTOR-UI — evidence

## Status
Planned

## Intended deliverables
- sidebar
- breadcrumbs
- quick actions
- empty states

## Verification to perform
- local manual flow end-to-end
- visual sanity check
- architecture boundary review
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-HARDENING/charter.md`

```md
# CAM-WORKBENCH-INSPECTOR-HARDENING — charter

## Objective

Закрепить границы, упростить extraction path и добавить защиту от архитектурного сползания.

## Scope

In scope:
- boundary reviews
- package API cleanup
- docs updates
- optional lint/import guardrails
- activation hardening
- internal cleanup

Out of scope:
- new product features
- production rollout
- backend persistence

## Constraints

- do not expand inspector scope
- prefer cleanup over feature creep
- preserve current workbench as canonical editor

## Acceptance criteria

- package/app boundary is easy to explain
- public API is narrow
- extraction path is cleaner
- docs match implementation
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-HARDENING/plan.md`

```md
# CAM-WORKBENCH-INSPECTOR-HARDENING — plan

## Step 1 — Boundary audit
Review imports and file responsibilities.

## Step 2 — Narrow public API
Remove accidental exports and unstable internals.

## Step 3 — Improve activation guard
Ensure inspector cannot mount outside intended local dev mode.

## Step 4 — Add optional import/lint guardrails
If repo tooling allows, add import restrictions.

## Step 5 — Update docs
Align docs with actual package shape and workflows.

## Verification checklist
- [ ] narrow public entry
- [ ] no package -> app imports
- [ ] local-only guard reliable
- [ ] docs current
```

---

## `work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-HARDENING/evidence.md`

```md
# CAM-WORKBENCH-INSPECTOR-HARDENING — evidence

## Status
Planned

## Intended deliverables
- boundary cleanup
- API cleanup
- stronger local-only guard
- docs sync

## Verification to perform
- import audit
- local activation audit
- docs consistency audit
```

---

## `work/now/tasks.md` (добавляемый фрагмент)

```md
# Proposed addition — Workbench Inspector

## Active candidate stream
- [ ] CAM-WORKBENCH-INSPECTOR-FOUNDATION — create package/integration/docs scaffold
- [ ] CAM-WORKBENCH-INSPECTOR-SELECTION — semantic target hover/select overlay
- [ ] CAM-WORKBENCH-INSPECTOR-BINDINGS — target ownership mapping to current workbench
- [ ] CAM-WORKBENCH-INSPECTOR-UI — local inspector sidebar and quick actions
- [ ] CAM-WORKBENCH-INSPECTOR-HARDENING — boundary hardening and cleanup

## Notes
- Inspector is local-only and dev-only.
- Existing workbench remains canonical owner of control values.
- Package code must remain domain-agnostic.
- App-specific mapping lives only in `apps/web/src/inspector-integration/`.
```

---

## `packages/workbench-inspector/README.md`

````md
# @dtm/workbench-inspector

## Status
Internal monorepo package, early-stage foundation.

## Purpose

`@dtm/workbench-inspector` is a local dev-only contextual inspector package for React apps.

It is intended to provide:
- overlay selection on live pages;
- semantic target model;
- generic inspector state;
- generic sidebar/panel primitives;
- adapter-based integration with host applications.

## Non-goals (current stage)

- production editor
- page builder
- backend persistence
- collaborative editing
- domain-specific control systems
- replacing the current workbench

## Design constraints

- package must remain domain-agnostic
- package must not import app-specific code
- real control ownership remains outside the package
- package uses DOM only for technical overlay placement

## Expected public API direction

```ts
import {
  InspectorProvider,
  InspectorOverlay,
  type InspectorAdapter,
  type InspectorTarget,
  type OwnershipRef,
} from '@dtm/workbench-inspector'
````

## Current integration model

The host app is expected to provide:

* target registry
* target ownership mapping
* local activation rules
* existing workbench bridge

## Extraction path

This package is intentionally being built inside the current monorepo first.
If the model stabilizes, it can later be extracted into its own repository with minimal changes.

````

---

## `apps/web/src/inspector-integration/README.md`

```md
# inspector-integration

## Purpose

This folder is the only app-specific integration layer between:
- the generic `@dtm/workbench-inspector` package
- the concrete `apps/web` runtime and current workbench

## Responsibilities

- define valid semantic targets for the current app
- map targets to existing workbench ownership
- provide local activation conditions
- bridge inspector actions to current workbench behavior

## Rules

- keep this layer thin
- do not move generic logic here unless it really depends on app specifics
- do not leak app-specific knowledge back into the package
- do not create duplicate control ownership or duplicate editing surfaces

## Expected files

- `activation.ts`
- `targetRegistry.ts`
- `targetBindings.ts`
- `openWorkbench.ts`
- `workbenchOwnership.ts`
- `targetGuards.ts`
- `index.ts`

## Anti-patterns

Do not:
- add business logic mutations here
- make inspector depend on backend
- store parallel runtime values here
- turn this folder into a second workbench implementation
````

---

## `packages/workbench-inspector/src/public.ts` (как md-описание контракта, не кодовый файл)

```md
# public.ts contract

## Purpose

The package must expose a narrow and stable public API.
Host applications should import only from this entry.

## Allowed exports (initial direction)

- `InspectorProvider`
- `InspectorOverlay`
- `InspectorSidebar`
- `useInspector`
- `useSelection`
- `type InspectorAdapter`
- `type InspectorTarget`
- `type OwnershipRef`
- `type InspectorState`
- `type InspectorActivation`

## Forbidden exports

Do not export:
- experimental internals
- raw reducer internals
- overlay math internals
- app-specific helpers
- unstable testing-only utilities unless intentionally public

## Why this matters

A narrow public API:
- prevents coupling
- keeps extraction path simple
- reduces accidental dependency on internals
```

---

## `packages/workbench-inspector/src/contracts/adapter.md`

````md
# InspectorAdapter contract

## Purpose

The host app must provide an adapter so the package can stay app-agnostic.

## Draft shape

```ts
type InspectorAdapter = {
  isEnabled(): boolean
  resolveTargetFromElement(element: HTMLElement): InspectorTarget | null
  getTargetById(id: string): InspectorTarget | null
  getParentTarget(id: string): InspectorTarget | null
  getChildTargets(id: string): InspectorTarget[]
  openTargetInWorkbench(targetId: string): void
}
````

## Notes

* The adapter belongs conceptually to the host app.
* The package relies on the adapter but must not know app internals.
* The adapter may internally use current workbench APIs, registries, and route state.

## Future extensions

Possible later additions:

* `getDebugMeta`
* `copyInspectorLink`
* `focusControlGroup`
* `listOwnershipRefs`

These should only be added when proven necessary.

````

---

## `apps/web/src/inspector-integration/activation.md`

```md
# activation strategy

## Goal

Inspector must run:
- only locally
- only in development
- only when explicitly enabled

## Recommended activation conditions

- `import.meta.env.DEV === true`
- plus a local explicit flag:
  - query param
  - localStorage flag
  - dev toolbar toggle

## Strict requirements

Inspector must not:
- auto-enable in production
- auto-enable in public staging
- mount accidentally during normal user sessions

## Suggested policy

Activation requires both:
1. development mode
2. explicit local opt-in

Example policy:
- `DEV && queryFlag('inspector')`

## Why such strictness

The inspector is developer tooling, not product UI.
````

---

## `apps/web/src/inspector-integration/targetRegistry.md`

```md
# target registry principles

## Purpose

The registry defines which semantic targets exist in the app.

## Principles

1. Targets must be semantic, not raw DOM wrappers.
2. Targets must be stable across small DOM refactors.
3. Targets must map to existing workbench ownership.
4. Targets should be readable by humans.

## Recommended target categories

- shell surfaces
- timeline regions
- tasks table regions
- drawer regions
- milestone visual families
- badge families
- repeated presentational blocks

## Not recommended at start

- low-level technical wrappers
- ephemeral DOM nodes
- deeply dynamic business nodes
- anything not mappable to current workbench

## Registry ownership

This registry is owned by the app integration layer, not the package.
```

---

## `docs/deep/WORKBENCH_INSPECTOR_IMPLEMENTATION_NOTES.md`

```md
# WORKBENCH INSPECTOR — implementation notes

## High-level implementation strategy

### Phase 1
Build the package shape and app integration seam.

### Phase 2
Implement semantic target selection.

### Phase 3
Bind targets to current workbench ownership.

### Phase 4
Add usable local UI.

### Phase 5
Harden boundaries and cleanup.

---

## Important implementation bias

When in doubt:
- choose stricter separation
- prefer explicit mapping over magic inference
- prefer semantic targets over deep DOM precision
- prefer current workbench as owner over introducing parallel controls

---

## What to avoid technically

- deep reflection into arbitrary React internals
- mutation of uncontrolled DOM styles as source of truth
- automatic inference of business semantics from class names
- broad app imports inside the package
- hidden coupling through global stores without contracts

---

## What is acceptable technically

- DOM hit testing for overlay placement
- data attributes or marker props if used carefully
- explicit app-side target mapping
- explicit ownership references
- local-only state inside the package

---

## Migration mindset

The package should be written as:
- if it may be extracted later
- but without pretending it is already stable

So:
- separation strong
- API still conservative
- avoid premature generalization beyond proven needs
```

---

## `agent/WORKBENCH_INSPECTOR_AGENT_RULES.md`

```md
# WORKBENCH INSPECTOR — agent rules

## Purpose

This file supplements the existing project operating rules for all workbench inspector tasks.

It does not replace:
- `agent/OPERATING_CONTRACT.md`
- `/AGENTS.md`

It narrows behavior for inspector-specific work.

---

## 1. Read before acting

Before making any inspector change, read:
- `agent/OPERATING_CONTRACT.md`
- `/AGENTS.md`
- `docs/deep/WORKBENCH_INSPECTOR_PROPOSAL.md`
- `docs/deep/WORKBENCH_INSPECTOR_BOUNDARIES.md`
- `docs/deep/WORKBENCH_INSPECTOR_STRUCTURE.md`
- `docs/deep/WORKBENCH_INSPECTOR_TARGETS.md`
- `docs/deep/WORKBENCH_INSPECTOR_DELIVERY_PROCESS.md`

---

## 2. Separation is mandatory

Treat:
- `packages/workbench-inspector/**` as future-extractable library code
- `apps/web/src/inspector-integration/**` as the only app-specific bridge

Do not mix them.

---

## 3. Forbidden behavior

Do not:
- import app code into the package
- introduce production inspector behavior
- create duplicate workbench ownership
- create a second competing editor surface
- treat arbitrary DOM nodes as semantic targets
- add backend persistence
- add auth or remote collaboration

---

## 4. Package bias

When implementing package code:
- keep names generic
- avoid DTM terminology
- prefer contracts over app assumptions
- keep public API narrow

---

## 5. Integration bias

When implementing integration code:
- make mappings explicit
- prefer readability over magic
- keep target ownership references maintainable
- do not reimplement the workbench here

---

## 6. Delivery discipline

Each campaign must update:
- `charter.md`
- `plan.md`
- `evidence.md`
- and relevant deep docs if architecture shifted

---

## 7. Review checklist

Before declaring completion:
- [ ] package is domain-agnostic
- [ ] integration remains thin
- [ ] current workbench remains canonical
- [ ] local-only guard still holds
- [ ] no hidden coupling introduced
- [ ] docs remain aligned
```

---

## `PROMPT_AGENT_CAM_WORKBENCH_INSPECTOR_FOUNDATION.md`

````md
# Prompt for agent — CAM-WORKBENCH-INSPECTOR-FOUNDATION

You are working inside the current `DTM-front` monorepo.

Your task is to implement the **FOUNDATION** campaign for a new local dev-only contextual inspector that extends the existing workbench system without replacing or duplicating it.

---

## First: required reading

Before making changes, read and follow:
- `agent/OPERATING_CONTRACT.md`
- `/AGENTS.md`
- `docs/README.md`
- `docs/glance/*`
- `docs/deep/FRONTEND_STRUCTURE.md`
- `docs/deep/WORKBENCH_CONTROLS.md`

Then read the new inspector docs if already added:
- `docs/deep/WORKBENCH_INSPECTOR_PROPOSAL.md`
- `docs/deep/WORKBENCH_INSPECTOR_BOUNDARIES.md`
- `docs/deep/WORKBENCH_INSPECTOR_STRUCTURE.md`
- `docs/deep/WORKBENCH_INSPECTOR_TARGETS.md`
- `docs/deep/WORKBENCH_INSPECTOR_DELIVERY_PROCESS.md`

---

## Objective

Create the architectural and file-system foundation for a future-extractable `workbench-inspector` package inside the monorepo, while keeping app-specific integration thin and local to `apps/web`.

This campaign must not add full UI behavior yet.
It must focus on:
- structure
- contracts
- boundaries
- no-op local activation path
- documentation
- campaign scaffolding

---

## Hard constraints

1. `packages/workbench-inspector/**` must remain domain-agnostic.
2. No imports from `apps/web/**` into `packages/workbench-inspector/**`.
3. Existing workbench remains the canonical owner of runtime control values.
4. Do not create a second editor system.
5. Inspector must remain local-only and dev-only.
6. No backend integration.
7. No production exposure.
8. No page-builder behavior.
9. No hidden coupling through app stores or business logic.

---

## Required structure to create

Create or verify these paths:

```text
packages/workbench-inspector/
  package.json
  tsconfig.json
  src/
    public.ts
    core/
    model/
    contracts/
    runtime/
    overlay/
    panels/
    ui/
    utils/
    types/

apps/web/src/inspector-integration/
  index.ts
  activation.ts
  targetRegistry.ts
  targetBindings.ts
  openWorkbench.ts
  workbenchOwnership.ts
  targetGuards.ts

docs/deep/
  WORKBENCH_INSPECTOR_PROPOSAL.md
  WORKBENCH_INSPECTOR_BOUNDARIES.md
  WORKBENCH_INSPECTOR_STRUCTURE.md
  WORKBENCH_INSPECTOR_TARGETS.md
  WORKBENCH_INSPECTOR_DELIVERY_PROCESS.md

work/roadmap/campaigns/CAM-WORKBENCH-INSPECTOR-FOUNDATION/
  charter.md
  plan.md
  evidence.md
````

---

## Required implementation deliverables

### 1. Package skeleton

Create a future-extractable package skeleton for `workbench-inspector` with:

* narrow public entry
* base folders
* minimal compile-safe internal modules

### 2. Base contracts

Define minimal generic contracts and types for:

* `InspectorTarget`
* `OwnershipRef`
* `InspectorAdapter`
* activation model
* minimal inspector state shape

Keep the contracts conservative and generic.

### 3. App integration skeleton

Create thin app-side integration stubs in:

* `apps/web/src/inspector-integration/`

These files may be mostly scaffolding, but should clearly establish where app-specific inspector logic belongs.

### 4. No-op local activation path

Create a local dev-only mount path for the inspector that does nothing visible yet.
It must be safe and not affect normal app runtime when disabled.

### 5. Documentation

Add the deep docs listed above.
The docs must clearly explain:

* why the package exists
* why it is not a parallel editor
* where the boundary between package and app lies
* why current workbench remains canonical

### 6. Campaign bookkeeping

Ensure the foundation campaign folder exists and reflects the work done.

---

## Out of scope for this campaign

Do NOT implement yet:

* hover outline
* selection outline
* semantic target detection logic
* workbench focus switching
* control editing
* persistence
* advanced panel UI
* production wiring

---

## Acceptance criteria

The campaign is successful only if all of these are true:

* package skeleton exists and compiles
* app integration skeleton exists and compiles
* no package imports app-specific code
* no existing runtime behavior changes when inspector is disabled
* docs clearly describe architecture and boundaries
* current workbench remains explicitly canonical
* the codebase is ready for the next campaign: semantic target selection

---

## Expected output from you

1. Implement the foundation changes.
2. Update or create the campaign files.
3. Summarize:

   * what you changed
   * which files were added
   * how you verified compile safety
   * how you verified package/app separation
   * what remains for the next campaign

Do not continue into the next campaign automatically.
Stop after FOUNDATION is complete.

````

---

## `README_WORKBENCH_INSPECTOR_BOOTSTRAP_CHECKLIST.md`

```md
# Workbench Inspector bootstrap checklist

Use this checklist right after FOUNDATION implementation.

## Structure
- [ ] `packages/workbench-inspector/` exists
- [ ] `apps/web/src/inspector-integration/` exists
- [ ] package has one narrow public entry

## Boundaries
- [ ] package imports no app-specific code
- [ ] integration layer is the only app-aware bridge
- [ ] docs explain the boundary clearly

## Runtime safety
- [ ] inspector has local dev-only activation path
- [ ] disabled mode leaves app unchanged
- [ ] no production exposure path exists

## Ownership safety
- [ ] current workbench remains canonical owner of values
- [ ] no duplicate control hierarchy introduced
- [ ] no parallel editor state for runtime values introduced

## Delivery process
- [ ] campaign folder exists
- [ ] charter/plan/evidence present
- [ ] `work/now/tasks.md` updated
````

---

Если брать это как единый пакет, то первым в работу агенту лучше отдавать именно **`PROMPT_AGENT_CAM_WORKBENCH_INSPECTOR_FOUNDATION.md`**.
