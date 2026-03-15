Вот короткий handoff для фронта.

**Upload flow**
1. `POST /ops/admin/task-attachments/request-upload`
2. Получаете:
- `attachment_id`
- `uploadUrl`
- `headers`
- `key`
3. Делаете `PUT` файла напрямую в `uploadUrl`
4. После успешного `PUT` вызываете:
- `POST /ops/admin/task-attachments/finalize`
5. Дальше ждёте, пока backend job завершит attach

**Когда файл считается готовым**
Файл готов не после `PUT`, а только после:
- `finalize`
- worker attach
- `prep` rebuild
- cache invalidation

Ориентир готовности:
- вложение появилось в `GET /ops/api/v2/frontend` внутри `tasks[].attachments`

**Что читает фронт**
Во frontend payload приходит только safe metadata:
- `id`
- `name`
- `mime`
- `kind`
- `sizeBytes`
- `status`
- `uploadedAt`
- `capabilities`
- `meta.preview`
- `links.view`
- `links.download`

`storage_key` и внутренние storage данные фронту не отдаются.

**Как читать файл**
Для открытия/скачивания использовать только:
- `links.view`
- `links.download`

Не пытаться читать Object Storage напрямую.

**Security rules**
- upload: только через временный presigned `PUT`, выданный backend
- read: только через backend `view/download` routes
- backend сам проверяет доступ перед выдачей read URL
- attachments скрываются полностью в `masked` режиме
- прямой доступ к storage key/frontend не поддерживается

**Важно для UX**
После `finalize` не считать файл готовым мгновенно.
Нужно:
- либо поллить статус/данные задачи
- либо рефетчить `frontend` API, пока attachment не появится в `tasks[].attachments`

Если хочешь, я могу ещё написать это в виде совсем короткой интеграционной инструкции с примерами `request`/`response`.