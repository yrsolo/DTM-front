# Audit: modules, docs, workbench taxonomy

Дата: `2026-03-12`

## Summary

Главный вывод:
- ядро продукта уже рабочее, но design/runtime слой и docs-taxonomy росли эволюционно и накопили structural drift;
- наиболее проблемная зона — workbench: раньше в нём смешивались разные уровни абстракции, часть controls дублировалась, один control вообще выпадал из layout;
- документация по workbench и high-level docs отставали от реальной структуры UI и использовали исторические названия вкладок.

## Findings

### 1. Workbench taxonomy drift

- Severity: `critical`
- Symptom: вкладки `Material`, `Buttons`, `Panels`, `Tasks page`, `Colors`, `Palette`, `Left panel` пересекались по смыслу; `24` range-контрола были задублированы; `matScrollbarGlowStrength` выпадал из layout.
- Evidence: [workbenchLayout.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\workbenchLayout.ts), [controls.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\controls.ts)
- Risk: workbench перестаёт быть source of truth; control ownership становится неочевидным; новые controls с высокой вероятностью попадают “куда-нибудь рядом”.
- Fix proposal: каноническая taxonomy `Foundation -> Surfaces -> Timeline -> Tasks Table -> Drawer -> Milestones -> Motion -> Workbench -> Defaults`; один control — одно каноническое место; duplicates только по allowlist.
- Effort: `M`

### 2. UI layout order was not actually canonical

- Severity: `major`
- Symptom: даже при ручном порядке групп UI пересортировывал их по размеру группы.
- Evidence: [ControlsWorkbench.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\ControlsWorkbench.tsx)
- Risk: визуальный порядок не соответствует архитектурной задумке; docs и layout map теряют смысл.
- Fix proposal: сохранить порядок групп ровно как в canonical layout map, без дополнительной сортировки.
- Effort: `S`

### 3. Validation existed only as dev console heuristics

- Severity: `major`
- Symptom: ошибки layout ловились только через `console.warn` в runtime dev-сессии.
- Evidence: [ControlsWorkbench.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\ControlsWorkbench.tsx)
- Risk: orphaned controls, illegal duplicates и drift в taxonomy легко проходят в branch/release.
- Fix proposal: вынести validation в канонический helper и отдельный repo check `check:workbench`.
- Effort: `S`

### 4. Persistence was incomplete

- Severity: `medium`
- Symptom: favorites сохранялись, а последняя вкладка workbench — нет.
- Evidence: [ControlsWorkbench.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\ControlsWorkbench.tsx), [RUNTIME_STORAGE.md](n:\PROJECTS\DTM\DTM-front\docs\operations\RUNTIME_STORAGE.md)
- Risk: taxonomy становится длиннее, но навигация не запоминается; UX feels random after reload.
- Fix proposal: хранить canonical tab id в localStorage и маппить legacy ids.
- Effort: `S`

### 5. Docs taxonomy drift

- Severity: `major`
- Symptom: docs описывали старые вкладки workbench и смешивали историческую структуру с текущей.
- Evidence: [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_CONTROLS.md), [USER_FLOWS.md](n:\PROJECTS\DTM\DTM-front\docs\overview\USER_FLOWS.md), [PRODUCT_OVERVIEW.md](n:\PROJECTS\DTM\DTM-front\docs\overview\PRODUCT_OVERVIEW.md)
- Risk: новый инженер получает ложную mental model; workbench docs не совпадают с реальным UI.
- Fix proposal: один canonical doc по workbench controls плюс отдельный taxonomy law doc; high-level docs только ссылаются на канонические вкладки.
- Effort: `S`

### 6. Overgrown runtime hub in Layout

- Severity: `major`
- Symptom: `Layout.tsx` остаётся центральной точкой для locale, view mode, filters, design state, key colors, snapshot state и глобальных панелей.
- Evidence: [Layout.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\Layout.tsx), [SYSTEM_ARCHITECTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\SYSTEM_ARCHITECTURE.md)
- Risk: высокий coupling, дорогие изменения, сложнее изолированно тестировать runtime hub.
- Fix proposal: следующий этап — выделить отдельные hooks/contexts для design runtime и snapshot runtime, не меняя app shell.
- Effort: `L`

### 7. Dead or drifting component surfaces

- Severity: `medium`
- Symptom: отдельные `MaterialControlsPanel.tsx` и `DrawerControlsPanel.tsx` существуют рядом с полноценным `ControlsWorkbench`, но не являются каноническим UI.
- Evidence: [MaterialControlsPanel.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\MaterialControlsPanel.tsx), [DrawerControlsPanel.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\DrawerControlsPanel.tsx)
- Risk: второй source of truth и ложное ощущение поддерживаемых UI paths.
- Fix proposal: либо удалить как legacy, либо явно понизить до internal/dev-only reference.
- Effort: `S`

### 8. Mojibake remains in non-canonical artifacts

- Severity: `medium`
- Symptom: часть non-canonical text artifacts всё ещё содержит mojibake.
- Evidence: [campaign.md](n:\PROJECTS\DTM\DTM-front\work\now\campaign.md)
- Risk: audit/docs noise, потеря доверия к локальному tracking.
- Fix proposal: прогнать отдельную cleanup-итерацию по non-canonical docs и tracking files.
- Effort: `S`

## Documentation actions

### Keep canonical

- [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_CONTROLS.md)
- [WORKBENCH_TAXONOMY.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_TAXONOMY.md)
- [RUNTIME_STORAGE.md](n:\PROJECTS\DTM\DTM-front\docs\operations\RUNTIME_STORAGE.md)
- [SYSTEM_ARCHITECTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\SYSTEM_ARCHITECTURE.md)

### Rewrite / sync regularly

- [PRODUCT_OVERVIEW.md](n:\PROJECTS\DTM\DTM-front\docs\overview\PRODUCT_OVERVIEW.md)
- [USER_FLOWS.md](n:\PROJECTS\DTM\DTM-front\docs\overview\USER_FLOWS.md)

### Downgrade to reference / legacy follow-up

- [MaterialControlsPanel.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\MaterialControlsPanel.tsx)
- [DrawerControlsPanel.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\DrawerControlsPanel.tsx)

## Recommended next steps

1. Вынести design runtime из `Layout.tsx` в отдельный state layer.
2. Удалить или законсервировать legacy control panels.
3. Добавить `check:workbench` в CI рядом с существующими lightweight checks.
4. Провести отдельную cleanup-итерацию по mojibake в non-canonical docs и tracking files.
