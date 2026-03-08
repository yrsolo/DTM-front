# Workbench-крутилки

Этот документ описывает структуру runtime workbench и смысл его вкладок.

Для кого:
- frontend-инженер;
- дизайнер интерфейса;
- владелец, который настраивает внешний вид без пересборки.

Source of truth в коде:
- [ControlsWorkbench.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\ControlsWorkbench.tsx)
- [controls.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\controls.ts)
- [colors.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\colors.ts)
- [workbenchLayout.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\workbenchLayout.ts)
- [runtimeDefaults.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\runtimeDefaults.ts)

## Назначение слоя

Workbench — это runtime-редактор визуальной системы и части runtime defaults. Он позволяет менять внешний вид и поведение интерфейса без пересборки, импортировать/экспортировать JSON-пресеты и сохранять настройки в браузере.

## Основные визуальные объекты

- панель вкладок;
- группы контролов;
- range-крутилки;
- бинарные icon-button переключатели;
- действия `Сохранить`, `Загрузить`, `Сброс`, `Экспорт`, `Импорт`, `Deploy`.

## Источники управления

Workbench управляет тремя типами данных:
- `DesignControls`
- `KeyColors`
- `RuntimeDefaults`

## Типы контролов

### Range controls

Используются для числовых значений:
- размеры;
- opacity;
- glow strength;
- offsets;
- animation timing;
- tint strength.

### Binary controls

Используются для вкл/выкл флагов. Текущая договорённость: бинарные значения отображаются не числом `0/1`, а зажимаемой кнопкой со значком.

## Persistence

Workbench использует browser storage для сохранения пресетов и текущих настроек. Ключи перечислены в [RUNTIME_STORAGE.md](n:\PROJECTS\DTM\DTM-front\docs\operations\RUNTIME_STORAGE.md).

## Вкладки workbench

| Вкладка | Что регулирует |
| --- | --- |
| `Defaults` | runtime defaults нового сеанса: demo mode, лимиты, refresh interval, статусные дефолты |
| `Material` | базовый material сцены и фоновые токены |
| `Buttons` | стиль кнопок и highlight для управляющих элементов |
| `Panels` | поверхности панелей и карточек |
| `Panel guide` | интерактивная схема панелей и привязка цветовых зон |
| `Animation` | включение анимации, timing, easing, stagger/related motion параметры |
| `Tasks page` | геометрия и layout-крутилки именно для страницы `Задачи` |
| `Timeline` | плотность timeline, grid, pinned areas, zoom-adjacent параметры |
| `Milestones` | цвета, opacity, размеры и label-параметры milestones |
| `Left panel` | параметры левого блока timeline |
| `Drawer` | размеры и surface карточки задачи |
| `Colors` | базовые key colors приложения |
| `Palette` | распределение и сила task-палитры |
| `Workbench` | параметры самого интерфейса workbench |

## Инварианты

- Параметры должны быть сгруппированы по смыслу, а не случайным списком.
- Значения, влияющие только на страницу `Задачи`, не должны смешиваться с общими surface-настройками.
- Runtime defaults должны описывать новый сеанс, а не обязательно текущее активное состояние.

## Текущие компромиссы

- Количество контролов уже велико, поэтому без явной вкладочной структуры workbench быстро превращается в шум.
- Часть вкладок исторически росла по мере развития интерфейса, поэтому документация обязана объяснять их доменные зоны отдельно от конкретных numeric keys.
