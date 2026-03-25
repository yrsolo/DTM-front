````md id="1n4i8p"
# Workbench Authoring System — самодостаточный технический пост для агента

## Статус документа

Draft / working master brief

## Назначение документа

Этот документ — **единая самодостаточная постановка задачи** для дальнейшей работы агента над развитием Workbench Inspector в сторону полноценной **design-надстройки над исходным кодом**.

Документ специально написан так, чтобы:
- не требовать чтения предыдущей переписки;
- не требовать внешнего контекста;
- дать полную картину: **что делаем, зачем, как архитектурно мыслим, какие этапы, какие кампании, какие файлы, какие правила и ограничения**;
- служить стартовой точкой для открытия и выполнения кампаний по реализации.

---

# 1. Что мы вообще строим

Мы строим **Workbench Authoring System** — локальную dev-only систему визуального тюнинга интерфейса, работающую **поверх исходного React-кода**, а не только поверх отрендеренной веб-страницы.

Цель системы:

- открыть живой сайт локально;
- визуально выбрать элемент интерфейса;
- понять, **где он находится в исходной иерархии компонентов**;
- понять, **во что он реально рендерится**;
- менять параметры не хаотично и не напрямую через DOM, а через осмысленную authoring-модель;
- видеть изменения в реальном времени;
- накапливать изменения в промежуточном authoring-слое;
- потом отдельно синхронизировать результаты в исходный код.

---

# 2. Что это НЕ должно быть

Система **не должна** превратиться в:

- page builder;
- конструктор сайта с нуля;
- инструмент свободного переписывания React-кода на каждый клик;
- второй конкурирующий workbench;
- второй источник истины для текущих runtime values;
- прямой DOM-редактор;
- продовый редактор на домене;
- систему коллаборативного редактирования;
- раннюю “универсальную магию”, которая пытается понимать любой проект без явной модели.

---

# 3. Главная идея

Нужно перейти от текущей модели:

```text
Rendered DOM -> optional semantic enrichment
````

к новой модели:

```text
Source Graph -> Authoring Schema -> Live Preview -> Source Sync
```

Или ещё короче:

* **исходная модель компонентов становится главной**;
* **рендер страницы становится проекцией**;
* **редактирование идёт через authoring layer**;
* **сохранение в код — отдельный, осознанный этап**.

---

# 4. Почему текущего инспектора недостаточно

Текущий инспектор как класс инструмента полезен, но по смыслу он строился как:

* надстройка над живой веб-страницей;
* DOM-first система;
* инструмент инспекции, навигации и дебага;
* не полноценный authoring engine.

Это было правильным стартом для:

* hover/select;
* overlay;
* tree;
* inspection panel;
* runtime reveal;
* связи с текущим workbench.

Но если конечная цель — **править исходный код и ходить по дереву исходных компонентов**, то DOM-first модель уже недостаточна.

Проблемы текущего подхода:

* главный объект системы — runtime node, а не source node;
* дерево — это дерево рендера, а не дерево исходной композиции;
* сложно различать “изменить тип компонента” и “изменить конкретный экземпляр”;
* невозможно безопасно и последовательно сохранять решения в код напрямую;
* текущий инспектор не знает, какие значения пришли из токенов, какие из defaults, а какие из локальных override-ов;
* если продолжать без переосмысления, получится слой костылей.

Поэтому сейчас — правильный момент для **архитектурного разворота**, пока система не заросла трудноисправимыми обходными решениями.

---

# 5. Главный архитектурный принцип

## Не прямое редактирование кода на каждый шаг

Поскольку:

* дизайн-система ещё не устоялась;
* заранее неизвестно, какие параметры вообще понадобятся;
* новые токены будут рождаться прямо в процессе;
* библиотека должна быть универсальной и применимой на сырых проектах;

нельзя строить систему как “каждое движение мышью сразу пишет в исходники”.

Вместо этого нужна **двухфазная модель**:

### Фаза A. Authoring

Редактируется промежуточный слой данных.

### Фаза B. Apply / Sync

Из authoring-слоя осознанно и отдельно формируются изменения в исходный код.

---

# 6. Итоговая целевая модель системы

Нужно построить 4 основные подсистемы и 1 vision-слой поверх них.

## Vision layer

Фиксирует смысл системы и её ограничения.

## Subsystem 1. Source Graph

Определяет, что такое редактируемый объект в исходном коде.

## Subsystem 2. Authoring Schema

Определяет, какие параметры существуют, как они группируются и на каких уровнях редактируются.

## Subsystem 3. Live Preview Engine

Определяет, как authoring-изменения мгновенно отображаются на живом UI.

## Subsystem 4. Source Sync Pipeline

Определяет, как authoring-решения превращаются в безопасные изменения исходников.

---

# 7. Четыре этапа реализации

Ниже зафиксированы четыре большие инженерные программы, которые должны быть реализованы отдельно, с отдельными документами, отдельными кампаниями и чёткими границами.

---

## Этап 1. Source Graph Refactor

### Суть этапа

Перевести систему с “DOM как основание” на “исходная модель как основание”.

### Что должно появиться

* primary tree = source tree;
* secondary tree = rendered tree;
* source node ↔ runtime projection mapping;
* клик по странице выбирает runtime node и мапится в source node;
* клик по source node подсвечивает соответствующий runtime result;
* инспектор умеет работать в двух режимах:

  * Source
  * Rendered

### Главная мысль

DOM остаётся, но перестаёт быть главным semantic source.

### Что станет редактируемой единицей

Не DOM node, а **SourceNode**.

### Что такое SourceNode

Это осмысленный узел исходной модели UI, например:

* component type
* instance path
* slot
* variant
* source file
* source location
* render bindings
* editable surface metadata

### Почему это важно

Без этого невозможно:

* ходить по дереву исходников;
* синхронно менять одинаковые компоненты;
* различать редактирование компонента и экземпляра;
* безопасно сохранять результат в код.

---

## Этап 2. Authoring Schema

### Суть этапа

Сделать систему отображения и структуры редактируемых параметров.

### Главная идея

Правая панель — это не просто список полей, а **authoring surface**.

### Что должно быть в модели

Нужно ввести уровни значения:

* token
* component default
* instance override
* effective value

### Что ещё обязательно

* группы параметров;
* подгруппы параметров;
* collapse/expand по заголовку;
* favorites по типам компонентов;
* advanced sections;
* source badges (откуда пришло значение);
* editable level markers (где можно менять это значение);
* inheritance / reset / promote semantics.

### Главная мысль

Нужно редактировать **не произвольный CSS**, а осмысленные параметры компонентной системы.

---

## Этап 3. Live Preview Engine

### Суть этапа

Сделать мгновенное применение изменений на живом сайте, но **без записи в исходники на каждый шаг**.

### Главная идея

Редактируется **authoring layer**, а не код напрямую.

### Что должно быть

* draft state;
* моментальный preview;
* computed effective values;
* относительное позиционирование внутри уже существующей layout-иерархии;
* reset / revert;
* promote from instance to component;
* creation of draft tokens on the fly.

### Главная мысль

Нужно поддержать режим эксперимента, где система ещё рождается, а не только режим обслуживания уже идеально описанной дизайн-системы.

---

## Этап 4. Source Sync Pipeline

### Суть этапа

Сделать систему сохранения результатов редактирования.

### Главная идея

Применение в исходный код — это отдельный этап, а не побочный эффект каждого движения.

### Что должно появиться

* diff model;
* apply plan;
* режимы применения;
* patch generation;
* safe write zones;
* ручная проверка перед записью;
* статус applied / not applied / draft / stable.

### Главная мысль

Система должна сначала помогать думать и тюнить, а потом уже синхронизировать в код.

---

# 8. Нулевая документация: Vision

Прежде чем делать четыре этапа, обязательно нужен нулевой документ — короткий, но очень ясный.

## Нужен документ:

`WORKBENCH_AUTHORING_VISION.md`

Он должен зафиксировать:

* что мы строим;
* зачем это нужно;
* чем это отличается от page builder-а;
* чем это отличается от обычного DOM inspector-а;
* почему code-first важнее render-first;
* почему authoring layer нужен отдельно;
* почему source sync — это отдельный этап.

---

# 9. Полный набор документов, который должен появиться

Ниже список самодостаточных документов, которые должны быть созданы в рамках этой программы.

---

## 00. `docs/deep/WORKBENCH_AUTHORING_VISION.md`

### Назначение

Короткий северный ориентир всей системы.

### Должен содержать

* product intent;
* non-goals;
* главные ограничения;
* итоговую формулу системы;
* почему нужен authoring layer;
* почему source-first важнее DOM-first;
* почему не пишем код на каждый шаг.

---

## 01. `docs/deep/SOURCE_GRAPH_ARCHITECTURE.md`

### Назначение

Подробный техдок по этапу 1.

### Должен содержать

* problem statement;
* current DOM-first limits;
* target source-first model;
* `SourceNode` model;
* `RenderProjection` model;
* mapping source ↔ runtime;
* source tree vs rendered tree;
* source location semantics;
* how pick mode maps to source;
* migration notes from current inspector.

---

## 02. `docs/deep/AUTHORING_SCHEMA_ARCHITECTURE.md`

### Назначение

Подробный техдок по этапу 2.

### Должен содержать

* уровни значений;
* field schema;
* property grouping;
* subgroups;
* favorites;
* editable level rules;
* inheritance / overrides;
* source badges;
* advanced / hidden fields;
* panel composition rules.

---

## 03. `docs/deep/LIVE_AUTHORING_RUNTIME_ARCHITECTURE.md`

### Назначение

Подробный техдок по этапу 3.

### Должен содержать

* draft state model;
* runtime preview strategy;
* computed effective values;
* relative layout editing;
* token creation flows;
* instance override flows;
* promote/reset semantics;
* no-direct-write policy.

---

## 04. `docs/deep/SOURCE_SYNC_ARCHITECTURE.md`

### Назначение

Подробный техдок по этапу 4.

### Должен содержать

* why not direct-write;
* authoring json structure;
* apply modes;
* patch proposal;
* safe source zones;
* file rewrite strategy;
* review points;
* applied-state model.

---

## 05. `docs/deep/WORKBENCH_AUTHORING_DELIVERY_ROADMAP.md`

### Назначение

Общий дорожный документ по реализации.

### Должен содержать

* dependency graph between stages;
* order of implementation;
* parallelization constraints;
* acceptance criteria per stage;
* campaign map;
* decision gates between stages.

---

# 10. Репозиторная структура, которая нужна

Ниже рекомендуемая структура внутри текущей монорепы.

## Почему именно так

Нужно **сразу сильно отделить библиотечную часть от сайта**, но пока не выносить в отдельную репу.

Поэтому:

* библиотечная часть живёт в `packages/`;
* интеграция с конкретным сайтом живёт только в `apps/web/`;
* документы живут в `docs/deep/`;
* кампании — в `work/roadmap/campaigns/`.

---

## Целевая файловая структура

```text
packages/
  workbench-authoring/
    package.json
    tsconfig.json
    README.md
    src/
      public.ts

      source-graph/
        types.ts
        graph.ts
        sourceNode.ts
        projection.ts
        location.ts
        bridges.ts

      authoring-schema/
        fieldSchema.ts
        fieldGroups.ts
        favorites.ts
        editableLevels.ts
        inheritance.ts
        displayModel.ts

      live-runtime/
        draftState.ts
        previewEngine.ts
        computedValues.ts
        overrides.ts
        tokenDrafts.ts
        relativeLayout.ts

      source-sync/
        applyPlan.ts
        patchModel.ts
        safeWriters.ts
        diff.ts
        reviewState.ts

      inspector-ui/
        shell/
        tree/
        panels/
        overlay/
        toolbar/
        badges/
        accordions/

      contracts/
        adapter.ts
        sourceGraphAdapter.ts
        authoringAdapter.ts
        previewAdapter.ts
        syncAdapter.ts

      types/
        common.ts
        source.ts
        fields.ts
        authoring.ts
        sync.ts

      utils/
        ids.ts
        shallow.ts
        guards.ts
        collections.ts

apps/
  web/
    src/
      authoring-integration/
        index.ts
        sourceRegistry.ts
        sourceBindings.ts
        projectionBindings.ts
        targetGuards.ts
        workbenchBridge.ts
        runtimePreviewBridge.ts
        sourceSyncBridge.ts
        activation.ts

      components/
        authoring/
          AuthoringMount.tsx

docs/
  deep/
    WORKBENCH_AUTHORING_VISION.md
    SOURCE_GRAPH_ARCHITECTURE.md
    AUTHORING_SCHEMA_ARCHITECTURE.md
    LIVE_AUTHORING_RUNTIME_ARCHITECTURE.md
    SOURCE_SYNC_ARCHITECTURE.md
    WORKBENCH_AUTHORING_DELIVERY_ROADMAP.md
    WORKBENCH_AUTHORING_BOUNDARIES.md
    WORKBENCH_AUTHORING_REPOSITORY_STRUCTURE.md

work/
  roadmap/
    campaigns/
      CAM-WA-FOUNDATION/
      CAM-WA-SOURCE-GRAPH/
      CAM-WA-AUTHORING-SCHEMA/
      CAM-WA-LIVE-RUNTIME/
      CAM-WA-SOURCE-SYNC/
      CAM-WA-HARDENING/
```

---

# 11. Самые важные архитектурные границы

Ниже — жёсткие правила, которые обязательны для всех кампаний.

---

## 11.1. Package must stay extractable

Код в `packages/workbench-authoring/**` должен писаться так, будто это будущая библиотека.

### Значит:

* никаких импортов из `apps/web/**`;
* никаких доменных сущностей проекта;
* никаких прямых знаний о страницах сайта;
* никаких hardcoded DTM-specific names.

---

## 11.2. App integration only in one place

Всё, что знает о конкретном сайте, должно жить только в:

```text
apps/web/src/authoring-integration/**
```

Именно здесь разрешены:

* source registry;
* projection mapping;
* knowledge about existing workbench;
* local runtime wiring;
* file/path mappings for current app.

---

## 11.3. No direct DOM editing as source of truth

DOM может использоваться только для:

* pick mode;
* hit testing;
* overlay;
* runtime reveal.

Но не как semantic source of truth.

---

## 11.4. No direct code write on each move

Нельзя писать в исходники при каждом движении мышью.

Все изменения сначала попадают в authoring layer.

---

## 11.5. No second competing editor surface

Нельзя превратить новый слой в второй независимый редактор, живущий параллельно текущему design/runtime management.

Новый authoring system должен быть:

* authoring-oriented;
* source-oriented;
* не конкурирующим по ownership модели.

---

## 11.6. Local-only and dev-only

На первых этапах:

* никакого production mounting;
* никакого staging exposure;
* никакой auth-инфраструктуры;
* никакой серверной синхронизации;
* никакой коллаборации.

---

# 12. Какая должна быть новая primary data model

Нужно ввести три главные сущности.

---

## 12.1. `SourceNode`

Это основная единица исходной системы.

### Что она должна описывать

* component type
* instance path
* slot
* variant
* source file
* source location
* parent / children
* editable capabilities
* runtime projections

### Пример по смыслу

```ts
type SourceNode = {
  id: string
  componentType: string
  instancePath: string
  slot?: string
  variant?: string
  sourceFile: string
  sourceLocation?: {
    startLine: number
    startColumn: number
    endLine?: number
    endColumn?: number
  }
  parentId?: string
  childrenIds: string[]
  editableRef?: string
  projectionIds: string[]
}
```

---

## 12.2. `AuthoringValue`

Это единица редактируемого параметра.

### Что она должна описывать

* effective value
* source of value
* editable level
* inheritance
* override state
* whether it is draft or stable
* whether it can be promoted or reset

### Пример по смыслу

```ts
type AuthoringValue = {
  key: string
  effectiveValue: unknown
  sourceType: 'token' | 'component' | 'instance' | 'computed'
  sourceRef?: string
  editableAt: 'token' | 'component' | 'instance' | 'none'
  isOverridden: boolean
  isDraft: boolean
  canPromote: boolean
  canReset: boolean
}
```

---

## 12.3. `RenderProjection`

Это мост между source-моделью и живым рендером.

### Что она должна описывать

* runtime DOM nodes
* current bounds
* visible / hidden state
* debug mapping

### Пример по смыслу

```ts
type RenderProjection = {
  id: string
  sourceNodeId: string
  domNodeIds: string[]
  primaryElement?: HTMLElement | null
  isVisible: boolean
  bounds?: DOMRect
}
```

---

# 13. Какая должна быть authoring-модель значений

Здесь нужно чётко зафиксировать слои.

---

## 13.1. Token

Наиболее общий уровень.

Примеры:

* colors
* radii
* shadows
* space scale
* typography roles
* border widths
* opacity
* motion constants

Если меняем token, меняется всё, что к нему привязано.

---

## 13.2. Component default / recipe

Уровень типа компонента.

Примеры:

* Badge defaults
* PanelCard defaults
* DrawerSection defaults
* TimelineBlock defaults

Если меняем recipe, меняются все экземпляры компонента, кроме тех, где есть override.

---

## 13.3. Instance override

Уровень конкретного узла.

Примеры:

* локальный color override
* local offset
* local align
* особый radius
* индивидуальный shadow preset

---

## 13.4. Effective value

То, что реально видно на экране после всех уровней наследования.

---

# 14. Как должны показываться параметры в UI

Правая панель должна стать **authoring surface**, а не просто inspection panel.

---

## 14.1. Глобальная структура панели

Для выбранного `SourceNode` панель должна содержать как минимум следующие блоки:

### Identity

* component type
* instance path
* slot
* variant
* source file
* source location
* parent info

### Layout

* parent layout mode
* position in parent
* relative offsets
* sizing rules
* spacing
* alignment
* layering

### Appearance

* fill / background
* border
* radius
* shadow / glow
* opacity / effects

### Typography

* text role
* size
* weight
* line height
* letter spacing
* color
* align

### Content

* content bindings
* icon / label / visibility
* truncation
* content mode

### Ownership / Source

* token links
* recipe source
* instance overrides
* effective value trace

### Favorites

* pinned controls for current component type

### Advanced

* редкие или сложные поля

---

## 14.2. Обязательные UX-правила

### Rule A. Всё группируется

Параметры не показываются сплошным списком.

### Rule B. Есть подгруппы

Если параметров много, внутри блока появляются подблоки.

### Rule C. Все блоки сворачиваемые

Клик по заголовку должен collapse / expand секцию.

### Rule D. Есть favorites

Для каждого типа компонента свой набор избранных параметров.

### Rule E. Видно источник значения

У каждого поля должно быть видно:

* token
* component
* instance
* computed

### Rule F. Видно уровень редактирования

Нужно показывать:

* edit token
* edit component
* edit instance
* read-only

---

# 15. Как должна выглядеть работа с layout

Это критически важно.

Нельзя показывать только абсолютные координаты.

---

## Нужно показывать относительное размещение

Вместо:

* `x = 38`
* `y = 212`

нужно стремиться показывать:

* parent layout mode
* offset relative to parent
* gap relative to siblings
* align in parent
* order in stack
* row / column placement
* span
* inset / padding contribution

---

## Базовый vocabulary для layout authoring

Рекомендуемый набор понятий:

* `flow`: free / row / column / grid / overlay
* `anchor`: start / center / end / stretch
* `offsetInline`
* `offsetBlock`
* `gapBefore`
* `gapAfter`
* `paddingInline`
* `paddingBlock`
* `columnSpan`
* `rowSpan`
* `zLayer`

---

# 16. Почему нужен промежуточный authoring JSON

Потому что заранее неизвестно:

* какие параметры реально понадобятся;
* какие токены будут нужны;
* какая часть решений станет stable, а какая останется локальной;
* какие поля вообще должны попасть в официальную дизайн-систему.

Если писать всё сразу в код:

* вы рано зацементируете решения;
* потеряете свободу эксперимента;
* получите много хрупких транзакций;
* усложните rollback;
* усложните эволюцию схемы.

Поэтому нужен отдельный промежуточный слой.

---

# 17. Что должно храниться в authoring JSON

Ниже рекомендуемая структура.

---

## 17.1. `draftTokens`

Новые токены, созданные прямо в процессе редактирования.

Примеры:

* новый цвет
* новая тень
* новый preset radius
* новый spacing preset
* новая typography role

---

## 17.2. `componentRecipes`

Описание типов компонентов:

* defaults
* variants
* slot rules
* bindings to tokens
* favorites
* panel grouping

---

## 17.3. `instanceOverrides`

Локальные отклонения конкретных экземпляров:

* offsets
* local color overrides
* local align
* local visibility
* local size tweaks

---

## 17.4. `sourceBindings`

Связи source nodes с editable surfaces:

* component type
* slot
* editable groups
* allowed levels

---

## 17.5. `panelSchemas`

Как показывать параметры:

* блоки
* подблоки
* favorites
* advanced fields

---

## 17.6. `applyState`

Статус применения в код:

* draft
* stable
* applied
* rejected
* pending-review

---

# 18. Stable vs Draft

Это обязательное различие.

---

## Draft

То, что появилось в ходе тюнинга и ещё не признано частью системы.

Примеры:

* временный цвет
* локальная тень
* новый spacing preset
* экспериментальный radius

---

## Stable

То, что уже признано канонической частью системы.

Примеры:

* официальный token
* официальный recipe field
* официальный variant
* утверждённый favorite control set

---

## Зачем это нужно

Чтобы система могла быть одновременно:

* свободной на этапе дизайна;
* дисциплинированной на этапе систематизации;
* безопасной на этапе записи в исходники.

---

# 19. Какие режимы применения в исходники должны быть

Сразу нужен не один режим, а несколько.

---

## Mode A. Runtime only

Изменения применяются только в локальном preview.

Код не меняется.

---

## Mode B. Patch proposal

Система показывает:

* какие файлы затронутся;
* какие новые токены появятся;
* какие recipes меняются;
* какие instance overrides возникли.

Но ничего автоматически не пишет.

---

## Mode C. Semi-automatic apply

Автоматически пишутся только безопасные зоны:

* token files
* recipe files
* structured config files
* known mapping files

---

## Mode D. Manual export

Генерируется JSON / patch / md summary, который агент или разработчик применяет вручную.

---

## Для старта обязателен минимум

На ранних этапах обязательно поддержать:

* Runtime only
* Patch proposal

---

# 20. Что считается safe source zone

Нельзя пытаться автоматически переписывать любой JSX и любые сложные компонентные тела.

На первом этапе safe zone — это:

* token files
* recipe files
* workbench mapping files
* config-like authoring files
* structured bindings
* known defaults registries

---

# 21. Почему нельзя писать в произвольный React-код сразу

Потому что React-код может содержать:

* вычисления;
* условный рендер;
* нестабильный JSX;
* смешанные className / inline style / tokens;
* context-driven behavior;
* composition layers;
* непредсказуемые паттерны.

Поэтому правильная стратегия:

**не переписывать весь код произвольно**,
а **ввести authoring-friendly слой и редактировать прежде всего его**.

---

# 22. Целевая роль инспектора

После разворота инспектор не должен исчезнуть.

Его новая роль:

* выбрать узел на живой странице;
* показать его положение в source tree;
* показать его runtime projection;
* показать authoring values и ownership;
* дать authoring UI;
* дать переход к patch/apply flow.

То есть инспектор остаётся оболочкой, но уже не является главным semantic source.

---

# 23. Два режима дерева, которые должны быть в UI

Это обязательное решение.

---

## 23.1. Source tree

Главное дерево.

Показывает:

* component hierarchy
* slots
* variants
* instance paths
* source locations
* authoring capabilities

---

## 23.2. Rendered tree

Вторичное дерево.

Показывает:

* runtime nodes
* actual DOM / SVG output
* useful for debugging and complex render cases

---

## Как должно работать взаимодействие

### Клик по странице

Runtime node -> RenderProjection -> SourceNode

### Клик по SourceNode

SourceNode -> highlight runtime projection

### Клик по Rendered tree

Rendered node -> map to SourceNode if possible

---

# 24. Поэтапный порядок работ

Очень важно не перепутать зависимости.

---

## Сначала обязательно

1. Vision
2. Source Graph

---

## Потом

3. Authoring Schema

---

## Потом

4. Live Runtime

---

## Последним

5. Source Sync

---

## Общее правило

Этап 4 (source sync) нельзя делать всерьёз до тех пор, пока не стабилизированы:

* source graph;
* authoring schema;
* draft/stable model.

---

# 25. Карта кампаний

Ниже кампании, которые должны быть открыты последовательно.

---

## CAM-WA-FOUNDATION

### Цель

Подготовить репозиторный каркас, boundaries, docs scaffolding и package/app separation.

### Что входит

* `packages/workbench-authoring/` skeleton
* `apps/web/src/authoring-integration/` skeleton
* базовые deep docs
* campaign scaffolding
* no-op local mount path

### Что не входит

* source graph implementation
* authoring schema UI
* preview
* source sync

---

## CAM-WA-SOURCE-GRAPH

### Цель

Построить source-first foundation.

### Что входит

* `SourceNode` model
* source registry / source graph
* source tree UI
* source ↔ runtime mapping
* two-tree model
* click page -> source
* click source -> reveal render

### Что не входит

* полноценное authoring редактирование
* patch pipeline

---

## CAM-WA-AUTHORING-SCHEMA

### Цель

Построить систему отображения и описания редактируемых параметров.

### Что входит

* `AuthoringValue`
* grouped fields
* subgroups
* favorites
* editable levels
* source badges
* ownership display
* panel model

### Что не входит

* live application logic
* patch writing

---

## CAM-WA-LIVE-RUNTIME

### Цель

Сделать live preview на основе authoring layer.

### Что входит

* draft state
* live overrides
* relative layout editing
* token drafts
* component vs instance editing
* reset / promote UX

### Что не входит

* запись в source files

---

## CAM-WA-SOURCE-SYNC

### Цель

Сделать pipeline сохранения в исходники.

### Что входит

* authoring json
* diff model
* patch proposal
* safe apply strategy
* review steps
* apply state markers

### Что не входит

* запись во все возможные типы файлов без ограничений

---

## CAM-WA-HARDENING

### Цель

Закрепить API, boundaries, extraction path и architectural cleanliness.

### Что входит

* import audits
* API narrowing
* docs alignment
* safe guards
* local-only hardening
* package cleanup

---

# 26. Структура папок кампаний

Ниже шаблон для каждой кампании.

```text
work/roadmap/campaigns/CAM-<NAME>/
  charter.md
  plan.md
  evidence.md
```

---

# 27. Что должно быть в `charter.md`

Для каждой кампании обязательно:

* objective
* scope
* constraints
* out of scope
* acceptance criteria
* risks

---

# 28. Что должно быть в `plan.md`

Для каждой кампании обязательно:

* шаги реализации;
* touched paths;
* checkpoints;
* verification checklist;
* known risks / rollback notes

---

# 29. Что должно быть в `evidence.md`

Для каждой кампании обязательно:

* что было сделано;
* какие файлы изменены;
* как проверялось;
* не нарушены ли границы;
* что осталось на следующий этап

---

# 30. Набор служебных документов, которые должны быть созданы

Ниже полный комплект документов, который агент должен создать.

---

## `docs/deep/WORKBENCH_AUTHORING_VISION.md`

Vision-документ

## `docs/deep/SOURCE_GRAPH_ARCHITECTURE.md`

Техдок этапа 1

## `docs/deep/AUTHORING_SCHEMA_ARCHITECTURE.md`

Техдок этапа 2

## `docs/deep/LIVE_AUTHORING_RUNTIME_ARCHITECTURE.md`

Техдок этапа 3

## `docs/deep/SOURCE_SYNC_ARCHITECTURE.md`

Техдок этапа 4

## `docs/deep/WORKBENCH_AUTHORING_DELIVERY_ROADMAP.md`

Delivery roadmap

## `docs/deep/WORKBENCH_AUTHORING_BOUNDARIES.md`

Правила границ

## `docs/deep/WORKBENCH_AUTHORING_REPOSITORY_STRUCTURE.md`

Структура репозитория

---

# 31. Обязательный шаблон для всех архитектурных доков

Чтобы документы были самодостаточными и единообразными, каждый из них должен содержать одинаковые разделы.

---

## Required sections

* Purpose
* Problem statement
* Current state
* Target state
* Core concepts
* Data model
* Responsibilities
* Boundaries
* UX implications
* Risks
* Non-goals
* Delivery slices
* Acceptance criteria

---

# 32. Жёсткие запреты для агента

Ниже список вещей, которые агент **не должен** делать без отдельного explicit approval.

---

## Forbidden

* переписывать систему обратно в DOM-first;
* писать изменения в произвольный React-код на каждый drag;
* пытаться автоматически понимать весь проект без source metadata;
* смешивать package и app integration code;
* выносить package в отдельную репу раньше времени;
* делать продовый редактор;
* подключать backend sync;
* делать collaborative editing;
* вводить второй source of truth для текущих runtime values;
* строить универсальную “магическую” схему без явных моделей.

---

# 33. Что агенту разрешено считать хорошим компромиссом

---

## Allowed pragmatic choices

* явная source metadata;
* частичная регистрация только редактируемых компонентов;
* explicit bindings вместо auto-magic;
* JSON authoring layer;
* limited safe source zones;
* gradual token introduction;
* draft-first model;
* partial support before full universality.

---

# 34. Рекомендуемые базовые контракты

Ниже минимальный набор интерфейсов по смыслу, который должен появиться.

---

## `SourceNode`

```ts
type SourceNode = {
  id: string
  componentType: string
  instancePath: string
  slot?: string
  variant?: string
  sourceFile: string
  sourceLocation?: {
    startLine: number
    startColumn: number
    endLine?: number
    endColumn?: number
  }
  parentId?: string
  childrenIds: string[]
  projectionIds: string[]
}
```

---

## `AuthoringValue`

```ts
type AuthoringValue = {
  key: string
  effectiveValue: unknown
  sourceType: 'token' | 'component' | 'instance' | 'computed'
  sourceRef?: string
  editableAt: 'token' | 'component' | 'instance' | 'none'
  isOverridden: boolean
  isDraft: boolean
  canPromote: boolean
  canReset: boolean
}
```

---

## `RenderProjection`

```ts
type RenderProjection = {
  id: string
  sourceNodeId: string
  domNodeIds: string[]
  primaryElement?: HTMLElement | null
  isVisible: boolean
  bounds?: DOMRect
}
```

---

## `AuthoringDraft`

```ts
type AuthoringDraft = {
  draftTokens: Record<string, unknown>
  componentRecipes: Record<string, unknown>
  instanceOverrides: Record<string, unknown>
  panelSchemas: Record<string, unknown>
  applyState: Record<string, unknown>
}
```

---

# 35. Как должен выглядеть первый успешный MVP

Чтобы не расползаться, нужно зафиксировать первый реально полезный результат.

---

## MVP outcome

Система считается вышедшей на полезный уровень, если:

* есть `Source tree` как primary tree;
* есть `Rendered tree` как secondary tree;
* клик по странице ведёт к source node;
* клик по source node подсвечивает rendered result;
* правая панель показывает grouped authoring blocks;
* можно изменить хотя бы несколько safe полей:

  * color source
  * radius
  * shadow preset
  * spacing preset
  * relative offset
* изменения попадают в authoring draft;
* изменения сразу видно в preview;
* можно получить patch proposal;
* код не переписывается на каждый шаг.

---

# 36. Порядок работы агента

Ниже жёсткий порядок, который нужно соблюдать.

---

## Step 1

Создать и согласовать Vision + Boundaries + Repository Structure docs.

## Step 2

Создать и согласовать `SOURCE_GRAPH_ARCHITECTURE.md`.

## Step 3

Только после этого открывать реализацию `CAM-WA-SOURCE-GRAPH`.

## Step 4

Создать `AUTHORING_SCHEMA_ARCHITECTURE.md`.

## Step 5

Только после этого открывать `CAM-WA-AUTHORING-SCHEMA`.

## Step 6

Создать `LIVE_AUTHORING_RUNTIME_ARCHITECTURE.md`.

## Step 7

Только после этого открывать `CAM-WA-LIVE-RUNTIME`.

## Step 8

Создать `SOURCE_SYNC_ARCHITECTURE.md`.

## Step 9

Только после этого открывать `CAM-WA-SOURCE-SYNC`.

---

# 37. Какие кампании можно открыть прямо сейчас

Сразу можно открыть только две:

---

## CAM-WA-FOUNDATION

Каркас, package/app separation, docs scaffolding

## CAM-WA-DOCS-VISION-AND-ARCH

Написание полного пакета документов:

* Vision
* Boundaries
* Repository Structure
* Source Graph Architecture
* Authoring Schema Architecture
* Live Authoring Runtime Architecture
* Source Sync Architecture
* Delivery Roadmap

---

# 38. Пример содержимого `CAM-WA-FOUNDATION/charter.md`

```md
# CAM-WA-FOUNDATION — charter

## Objective
Create the repository and architectural foundation for the Workbench Authoring System.

## Scope
- package skeleton
- app integration skeleton
- docs scaffolding
- no-op local mount
- campaign scaffolding

## Constraints
- no app imports into package
- no production behavior
- no direct-write editing
- no DOM-first re-centering
- no second editor ownership

## Out of scope
- source graph logic
- authoring schema implementation
- live preview engine
- source sync pipeline

## Acceptance criteria
- repository structure exists
- package/app separation is explicit
- docs skeleton exists
- no-op local mount compiles
```

---

# 39. Пример содержимого `CAM-WA-DOCS-VISION-AND-ARCH/charter.md`

```md
# CAM-WA-DOCS-VISION-AND-ARCH — charter

## Objective
Create the full documentation set for the Workbench Authoring System before large-scale implementation begins.

## Scope
- authoring vision
- boundaries
- repository structure
- source graph architecture
- authoring schema architecture
- live authoring runtime architecture
- source sync architecture
- delivery roadmap

## Constraints
- docs must be self-contained
- docs must not assume prior chat context
- docs must clearly separate subsystems
- docs must define non-goals and risks

## Out of scope
- code implementation beyond scaffolding

## Acceptance criteria
- all deep docs created
- all docs follow common structure
- implementation phases and campaigns are explicit
```

---

# 40. Единый служебный документ с правилами для агента

Нужно создать:

## `docs/deep/WORKBENCH_AUTHORING_BOUNDARIES.md`

Он должен содержать:

---

## Mandatory rules

1. Package is future-extractable.
2. App integration is thin and isolated.
3. DOM is projection, not source of truth.
4. Editing is authoring-first, not direct-write.
5. Source sync is a separate pipeline.
6. No second competing runtime ownership.
7. Local-only / dev-only until explicitly changed.
8. Explicit source metadata is allowed and encouraged.
9. Draft/stable distinction is mandatory.
10. Safe source zones only for early sync.

---

# 41. Как должен выглядеть roadmap-документ

Нужно создать:

## `docs/deep/WORKBENCH_AUTHORING_DELIVERY_ROADMAP.md`

Он должен содержать:

* phase order;
* dependencies;
* what can be parallelized;
* required acceptance criteria between phases;
* list of campaigns;
* exit criteria for each subsystem;
* criteria for when package is ready for extraction.

---

# 42. Когда можно будет думать о вынесении в отдельную репу

Не раньше, чем будут выполнены все условия:

* source graph работает;
* authoring schema стабилизирована;
* live preview полезен;
* source sync хотя бы на уровне patch proposal существует;
* package API очистили и сузили;
* app integration действительно тонкая.

До этого этапа отдельная репа — преждевременна.

---

# 43. Критерии успеха всей программы

Система считается архитектурно успешной, если в конце можно сделать следующее:

1. Открыть сайт локально.
2. Кликнуть на элемент.
3. Увидеть, где он находится в source tree.
4. Увидеть, во что он рендерится.
5. Увидеть grouped authoring parameters.
6. Понять, что пришло из token / component / instance.
7. Изменить несколько параметров в live preview.
8. Создать draft token при необходимости.
9. Не записать код автоматически на каждый шаг.
10. Получить осмысленный diff / patch proposal.
11. Применить изменения в safe source zones отдельно и осознанно.

---

# 44. Самая короткая формула всей программы

Мы строим не DOM-редактор, не page builder и не “магическую фигму для React”.

Мы строим:

> **code-first authoring system with live preview and deferred source sync**

Или по-русски:

> **локальную дизайн-надстройку над исходной компонентной системой, с живым предпросмотром и отложенной синхронизацией в код**

---

# 45. Финальная инструкция агенту

Ниже — краткая, но обязательная operational-form постановка.

---

## Агент должен действовать так

### Сначала

1. Создать package/app separation scaffold.
2. Создать полный набор документации.
3. Зафиксировать boundaries и roadmap.

### Потом

4. Перенести первичную модель на source-first foundation.
5. Построить authoring schema.
6. Построить live preview engine.
7. Построить source sync pipeline.

### На всём протяжении

8. Не возвращаться к DOM-first как к основной модели.
9. Не писать в исходники на каждый шаг.
10. Не смешивать package и app integration.
11. Не делать “универсальную магию” раньше явной модели.
12. Поддерживать draft-first thinking.

---

# 46. Готовый промпт агенту

Ниже текст, который можно использовать как стартовое сообщение агенту.

```md
You are working on a new subsystem inside the current frontend monorepo.

Your mission is to transform the current inspector direction into a **code-first Workbench Authoring System**.

## Core goal
Build a local dev-only design-authoring layer over the source component system, with:
- source-first hierarchy
- rendered projection bridge
- grouped authoring parameters
- live preview via an intermediate authoring layer
- deferred sync into source code

## This is NOT
- not a page builder
- not a DOM editor
- not direct React code rewriting on every action
- not a second competing workbench
- not a production editor
- not a collaboration system

## Architectural principles
1. Source graph becomes the primary model.
2. Rendered DOM becomes a projection/debug layer.
3. Editing happens in an authoring layer first.
4. Sync to source code is a separate pipeline.
5. Package code must stay future-extractable and app-agnostic.
6. App-specific knowledge must live only in the app integration layer.

## Required outcomes
You must produce:
- repository/package structure
- full deep docs set
- campaign scaffolding
- phased implementation roadmap

## Mandatory docs to create
- `docs/deep/WORKBENCH_AUTHORING_VISION.md`
- `docs/deep/SOURCE_GRAPH_ARCHITECTURE.md`
- `docs/deep/AUTHORING_SCHEMA_ARCHITECTURE.md`
- `docs/deep/LIVE_AUTHORING_RUNTIME_ARCHITECTURE.md`
- `docs/deep/SOURCE_SYNC_ARCHITECTURE.md`
- `docs/deep/WORKBENCH_AUTHORING_DELIVERY_ROADMAP.md`
- `docs/deep/WORKBENCH_AUTHORING_BOUNDARIES.md`
- `docs/deep/WORKBENCH_AUTHORING_REPOSITORY_STRUCTURE.md`

## Required repository structure
Create a package under:
- `packages/workbench-authoring/`

Create thin app integration under:
- `apps/web/src/authoring-integration/`

## Delivery order
1. Foundation and docs
2. Source graph
3. Authoring schema
4. Live runtime
5. Source sync
6. Hardening

## Hard constraints
- no package imports from app
- no DOM-first primary model
- no direct-write editing
- no production exposure
- no hidden coupling
- no second ownership system for runtime values

## First concrete task
Start with:
- package/app separation scaffold
- full documentation set
- campaign folders and charters
- no-op local mount path

Stop after the documentation + foundation stage is complete.
Do not start implementing later phases automatically.
```

---

# 47. Последняя проверка смысла

Если агент сомневается, правильный ли курс, он должен проверить себя по трём вопросам:

### Вопрос 1

Главный объект системы — это source node или DOM node?

Правильный ответ:
**source node**

### Вопрос 2

Изменение сразу пишет в код или сначала живёт в authoring layer?

Правильный ответ:
**сначала живёт в authoring layer**

### Вопрос 3

Rendered DOM — это источник истины или проекция?

Правильный ответ:
**проекция**

Если хотя бы на один вопрос получается другой ответ, значит архитектура начинает съезжать не туда.

---

```
```
