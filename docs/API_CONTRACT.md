# API Contract — DTM Frontend API v2

> Contract version: **2.0.1**
> Base URL: `https://dtm-api-test.solofarm.ru`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/frontend` | Main data endpoint |
| GET | `/api/v2/frontend/doc` | Human-readable documentation |
| GET | `/api/v2/frontend/doc?format=json` | Machine-readable contract |

## Query Parameters

| Param | Default | Description |
|-------|---------|-------------|
| `statuses` | `work,pre_done` | Comma-separated status filter (e.g. `work,pre_done,wait`) |
| `designer` | — | Filter by designer ID |
| `limit` | `200` | Max tasks returned (1–1000) |
| `include_people` | `true` | Include `entities.people` in response |
| `window_start` | `null` | `YYYY-MM-DD` — start of date window |
| `window_end` | `null` | `YYYY-MM-DD` — end of date window |
| `window_mode` | `intersects` | `intersects` / `start` / `end` |

### Example request
```
GET /api/v2/frontend?statuses=work,pre_done&limit=100&include_people=true&window_start=2026-03-01&window_end=2026-03-31
```

## Response Structure

```
meta + filters + summary + entities + tasks
```

### `meta`
| Field | Example |
|-------|---------|
| `meta.artifact` | `"dtm_frontend_api_v2"` |
| `meta.contractVersion` | `"2.0.1"` |
| `meta.generatedAt` | ISO 8601 |
| `meta.syncedAt` | ISO 8601 |
| `meta.source` | `{ env, sourceId, sheetName, sheetUrl }` |
| `meta.hash` | `"sha256:…"` |
| `meta.features` | `{ milestonesDefault, timeWindowFilter }` |
| `meta.paging` | `{ limit, nextCursor }` |

### `filters`
Echo of applied query parameters.

### `summary`
| Field | Type |
|-------|------|
| `tasksTotal` | number |
| `tasksReturned` | number |
| `peopleTotal` | number |
| `groupsTotal` | number |
| `milestonesTotal` | number |

### `entities`
| Field | Shape |
|-------|-------|
| `entities.people[]` | `{ id, name, position, links.self }` |
| `entities.groups[]` | `{ id, name, links.self }` |
| `entities.tags[]` | `string[]` |
| `entities.enums.status` | `{ code: label }` |
| `entities.enums.statusGroups` | `{ groupName: [statusCodes] }` |
| `entities.enums.milestoneType` | `{ code: label }` |
| `entities.enums.milestoneStatus` | `{ code: label }` |

### `tasks[]`
| Field | Type / Notes |
|-------|-------------|
| `id` | `string` |
| `title` | `string` |
| `ownerId` | `string` → `entities.people` |
| `groupId` | `string` → `entities.groups` |
| `status` | `string` → `entities.enums.status` |
| `date.start` | `YYYY-MM-DD` |
| `date.end` | `YYYY-MM-DD` |
| `date.nextDue` | `YYYY-MM-DD` |
| `tags` | `string[]` |
| `hash` | `string \| null` |
| `revision` | `string \| null` |
| `links.sheetRowUrl` | `string \| null` |
| `links.self` | `string` |
| `milestones[]` | array (see below) |

### `tasks[].milestones[]`
| Field | Values |
|-------|--------|
| `type` | `storyboard` / `animatic` |
| `planned` | `YYYY-MM-DD` |
| `actual` | `YYYY-MM-DD \| null` |
| `status` | `planned` / `done` / `unknown` / `skipped` |

## Minimal Response Example

```json
{
  "meta": {
    "artifact": "dtm_frontend_api_v2",
    "contractVersion": "2.0.1",
    "generatedAt": "2026-03-02T12:00:00Z",
    "syncedAt": "2026-03-02T11:00:00Z",
    "source": { "env": "test", "sourceId": "sheet:…", "sheetName": "…", "sheetUrl": "…" },
    "hash": "sha256:…",
    "features": { "milestonesDefault": true, "timeWindowFilter": true },
    "paging": { "limit": 200, "nextCursor": null }
  },
  "filters": {
    "statuses": ["work","pre_done"],
    "designer": null,
    "limit": 200,
    "include_people": true,
    "window": { "enabled": false, "start": null, "end": null, "mode": "intersects" }
  },
  "summary": { "tasksTotal": 0, "tasksReturned": 0, "peopleTotal": 0, "groupsTotal": 0, "milestonesTotal": 0 },
  "entities": {
    "people": [],
    "groups": [],
    "tags": [],
    "enums": {
      "status": { "work": "Work", "pre_done": "Pre-done", "done": "Done" },
      "statusGroups": { "active": ["work","pre_done"], "done": ["done"] },
      "milestoneType": { "storyboard": "раскадровка", "animatic": "аниматик" },
      "milestoneStatus": { "planned": "Запланировано", "done": "Готово", "unknown": "Неизвестно" }
    }
  },
  "tasks": []
}
```
