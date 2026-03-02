# API Contract (Draft)

> MVP can ignore this. Production will finalize.

## Base
- `GET /snapshot` -> returns `SnapshotV1` JSON

## SnapshotV1 response
- Must satisfy JSON Schema in `packages/schema/snapshot.schema.json`

Example:
```json
{
  "meta": {
    "version": "v1",
    "generatedAt": "2026-03-02T12:00:00Z",
    "source": "dtm",
    "hash": "sha256:..."
  },
  "people": [
    {
      "id": "p1",
      "name": "Designer A"
    }
  ],
  "tasks": [
    {
      "id": "t1",
      "title": "Landing hero",
      "ownerId": "p1",
      "status": "in_progress",
      "start": "2026-03-01",
      "end": "2026-03-05",
      "tags": ["promo"],
      "groupId": "g1",
      "links": {
        "sheetRowUrl": "https://..."
      }
    }
  ],
  "groups": [
    {
      "id": "g1",
      "name": "Project X"
    }
  ],
  "enums": {
    "status": {
      "todo": "To do",
      "in_progress": "In progress",
      "review": "Review",
      "done": "Done"
    }
  }
}
```
