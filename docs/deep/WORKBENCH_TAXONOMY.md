# Workbench taxonomy

Этот документ фиксирует закон группировки крутилок и нужен как canonical reference для дальнейших изменений.

Канонические вкладки:
- `Foundation`
- `Surfaces`
- `Timeline`
- `Tasks Table`
- `Drawer`
- `Milestones`
- `Motion`
- `Workbench`
- `Defaults`

## Закон порядка

Порядок верхних вкладок:
- от глобального к частному;
- от системной основы к конкретным экранам;
- от пользовательского интерфейса к инженерному UI;
- `Defaults` всегда в конце, потому что это не visual surface, а session setup.

Порядок групп внутри вкладки:
1. container / layout
2. spacing / typography
3. visual skin / accents
4. behavior / optimization

## Закон ownership

- `Foundation` владеет scene/material/accent/button/navigation controls.
- `Surfaces` владеет общими surface-токенами и table chrome.
- `Timeline` владеет timeline geometry, grid, date axis, dock controls, tooltip behavior и optimization.
- `Tasks Table` владеет левым блоком, таблицей, badges, text metrics и alignment.
- `Drawer` владеет task drawer container, calendar, drawer surface и drawer glow.
- `Milestones` владеет milestone geometry, labels, cell effects и milestone type colors.
- `Motion` владеет animation/reorder controls.
- `Workbench` владеет только self-UI controls workbench.
- `Defaults` владеет runtime defaults нового сеанса.

## Duplicate policy

- Любой control должен быть назначен ровно один раз.
- Дубли допускаются только через явный allowlist.
- Отсутствие allowlist означает, что повтор любого control — ошибка layout.

## Нежелательные паттерны

- `Other`
- `Misc`
- `(2)`
- смешение page-specific и system-wide controls в одной группе
- смешение visual tokens и optimization controls без сильного основания
