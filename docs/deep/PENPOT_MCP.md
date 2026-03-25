# Penpot MCP CLI

Локальный tooling layer для работы с Penpot MCP из терминала без нативного MCP-клиента Codex.

## What This Is

Мы добавили в репозиторий собственный маленький клиент для Penpot MCP.

Зачем:

- встроенная MCP-интеграция Codex в этой среде видела сервер нестабильно
- сам Penpot MCP server при этом был рабочим
- нужен был надежный путь, которым агент и человек могут пользоваться прямо из терминала

Что именно добавлено:

- `scripts/penpot_config.mjs`
  - единая точка конфигурации URL и timeout
- `scripts/penpot_mcp_client.mjs`
  - низкоуровневый MCP client
  - делает `initialize`
  - отправляет `notifications/initialized`
  - хранит `mcp-session-id`
  - вызывает `tools/list` и `tools/call`
  - парсит `text/event-stream`
- `scripts/penpot_cli.mjs`
  - удобная CLI-обертка над клиентом
  - добавляет Penpot-ориентированные команды вроде `selection-info` и `find-shapes`

Идея простая: вместо ожидания, что Codex сам корректно поднимет MCP transport, мы даем ему и себе готовый рабочий путь через локальный CLI.

## Preconditions

- локальный Penpot UI доступен, например `http://localhost:9001/`
- локальный Penpot MCP server запущен, например `http://localhost:4401/mcp`
- в Penpot открыт MCP plugin
- plugin UI должен оставаться открытым во время работы команд

По умолчанию CLI использует `http://localhost:4401/mcp`.

Переопределение доступно через env:

- `PENPOT_MCP_URL`
- `PENPOT_MCP_TIMEOUT_MS`
- `PENPOT_MCP_CLIENT_NAME`
- `PENPOT_MCP_CLIENT_VERSION`
- `PENPOT_MCP_PROTOCOL_VERSION`

## Commands

Список tools:

```bash
npm run penpot:tools
```

Текущая selection:

```bash
npm run penpot:selection
```

Произвольный JS в plugin context:

```bash
node scripts/penpot_cli.mjs execute-code --code "return { selectionCount: penpot.selection.length };"
```

JS из файла:

```bash
node scripts/penpot_cli.mjs run-js-file --file ./debug-local/penpot_sample.js
```

Penpot API docs:

```bash
node scripts/penpot_cli.mjs api-info --type Shape
node scripts/penpot_cli.mjs api-info --type Shape --member resize
```

Структура страниц:

```bash
node scripts/penpot_cli.mjs page-structure --max-depth 3
```

Поиск shapes по имени:

```bash
node scripts/penpot_cli.mjs find-shapes --name Header
node scripts/penpot_cli.mjs find-shapes --name Header --exact
```

Экспорт shape:

```bash
node scripts/penpot_cli.mjs export-shape --shape-id selection --format png
```

Импорт изображения:

```bash
node scripts/penpot_cli.mjs import-image --file C:\\temp\\image.png --x 10 --y 10 --width 300
```

## Behavior

- CLI сам делает `initialize`, `notifications/initialized`, сохраняет `mcp-session-id` и затем выполняет `tools/list` или `tools/call`
- сервер Penpot сейчас рассматривается как `tools-only`; `resources` не используются
- stdout по умолчанию JSON-first, чтобы команды было удобно автоматизировать

## Common Errors

- `Timed out after ... calling Penpot MCP server`
  - сервер не отвечает или завис transport/session flow
- `HTTP 400 from Penpot MCP server`
  - чаще всего broken MCP session или некорректный запрос
- ошибка внутри `execute_code`
  - код выполнился в plugin context, но сам JS или состояние документа неверны
- пустой ответ или `No MCP messages found`
  - сервер отдал поврежденный или оборванный event-stream
