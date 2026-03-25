## Где я бы ещё усилил план

Есть несколько мест, где я бы сделал формулировки жёстче, чтобы потом снова не уехали в ручную разметку.

### 1. Надо явно зафиксировать, что ручное описание дерева — только fallback

Сейчас у агента это есть, но мягко.

Я бы зафиксировал буквально так:

* **primary strategy**: automatic source graph extraction from React/component structure
* **secondary strategy**: minimal instrumentation
* **fallback**: manual labels / ids / hints for ambiguous or hard-to-map nodes

И отдельно прописать запрет:

> Нельзя строить систему, в которой page-by-page manual target authoring становится основным способом покрытия интерфейса.

Это надо прямо записать в roadmap и boundaries.

### 2. Надо разделить `SourceNode` и `AuthoringNode`

У агента это упомянуто, но пока не разведено до конца.

Я бы сделал так:

* `SourceNode` — узел исходной компонентной структуры
* `AuthoringNode` — authoring-представление этого узла с editable surfaces, scopes, группами параметров и value sources

То есть не всякий `SourceNode` обязан сразу быть authoring-rich.
Это полезно, потому что:

* source graph можно построить раньше;
* authoring schema можно наращивать постепенно;
* не придётся ждать “идеального описания всех параметров”.

### 3. Надо жёстко разделить parse и enrich

В source graph pipeline я бы выделил два шага:

* **parse**: автоматически собрать дерево из кода
* **enrich**: дополнить его label-ами, слотами, editable hints, preferred groups и т.д.

Это важно, потому что тогда можно сначала добиться автоматического покрытия, а потом улучшать качество authoring-метаданных без ощущения, что “дерево вручную собирается”.

### 4. Live Preview должен быть явно завязан на draft layer

Это у агента правильно намечено, но я бы формулировал ещё строже:

* live preview никогда не пишет в source напрямую;
* live preview всегда работает только через draft changes;
* draft changes всегда имеют scope:

  * token
  * component
  * instance

Без этого очень быстро начнётся путаница “я сейчас что поменял вообще?”.

### 5. Source Sync надо делать только после минимально стабильной authoring schema

Иначе получится генератор патчей для нестабильной модели.

Я бы добавил gate:

`CAM-WORKBENCH-SOURCE-SYNC` нельзя начинать, пока не готовы:

* стабильный `SourceNode`
* стабильный `AuthoringValue`
* понятный draft format
* хотя бы базовый scope model: token/component/instance

## Что я бы поменял в naming

Я бы ещё немного подчистил названия кампаний, чтобы они были строже и менее двусмысленны.

Текущий вариант у агента хороший, но я бы сделал так:

* `CAM-WORKBENCH-AUTHORING-VISION`
* `CAM-WORKBENCH-SOURCE-GRAPH`
* `CAM-WORKBENCH-AUTHORING-MODEL`
* `CAM-WORKBENCH-LIVE-PREVIEW`
* `CAM-WORKBENCH-SOURCE-SYNC`
* `CAM-WORKBENCH-HARDENING`

Почему `AUTHORING-MODEL`, а не `AUTHORING-SCHEMA`:
потому что тут будет не только схема полей, но и:

* scopes,
* inheritance,
* favorites,
* grouping,
* value sources,
* override semantics.

`Schema` звучит чуть уже, чем нужно.

## Как я бы переформулировал главный use case

Сейчас у агента:

* parse
* tune
* persist

Это хорошо. Я бы только чуть расширил:

### Canonical user journey

1. **Parse** — система автоматически извлекает source graph из React-кода
2. **Inspect** — пользователь видит source tree и runtime projection
3. **Tune** — пользователь меняет authoring values в live preview
4. **Consolidate** — пользователь решает, что стало token / component default / instance override
5. **Persist** — система генерирует и применяет patch в исходники

То есть между tune и persist я бы добавил **consolidate**.
Это важный этап, особенно если новые токены рождаются прямо в процессе.

## Что я бы добавил в acceptance criteria roadmap

Вот это очень полезно зафиксировать в явном виде.

### Архитектура считается выровненной, если:

* primary tree в roadmap — это `SourceGraph`, а не DOM tree;
* runtime DOM фигурирует только как `RuntimeProjection`;
* ручная разметка не является основной стратегией покрытия;
* inspector описан как shell/delivery layer, а не как product core;
* live preview описан как draft layer;
* source sync описан как отдельный explicit phase;
* новая система может жить без инспектора после apply.

Последний пункт особенно важен:
**результат должен жить в коде без существования inspector runtime.**

## Мой общий вердикт

Да, этот plan realignment — правильный.
Я бы его **принимал как новый верхнеуровневый roadmap**, но с тремя усилениями:

1. жёстко зафиксировать, что manual tree authoring — только fallback;
2. развести `SourceNode` и `AuthoringNode`;
3. добавить промежуточный этап `Consolidate`, хотя бы концептуально.


