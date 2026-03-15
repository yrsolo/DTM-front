Схема такая.

1. Фронт запрашивает у бэка upload contract:
- `POST /ops/admin/task-attachments/request-upload`
- передаёт `task_id`, `filename`, `mime`, `size`, `uploaded_by`

2. Бэк проверяет задачу и отдаёт:
- `attachment_id`
- `key`
- `uploadUrl`
- `headers`
- это временный presigned `PUT` в Object Storage

3. Фронт грузит файл напрямую в Object Storage:
- не через backend
- backend бинарник не принимает и не проксирует

4. После успешного `PUT` фронт вызывает:
- `POST /ops/admin/task-attachments/finalize`
- передаёт `task_id`, `attachment_id`, `uploaded_by`

5. Backend на `finalize`:
- проверяет, что объект реально загружен
- сверяет `size` и `mime`
- ставит в очередь `attach_task_file`

6. Worker:
- пишет metadata вложения
- rebuild-ит `prep`
- сбрасывает exact frontend response cache
- после этого вложение появляется в `frontend` API

7. Чтение вложения:
- фронт не получает `storage_key`
- в `tasks[].attachments` есть только safe metadata + ссылки:
  - `links.view`
  - `links.download`

8. `view/download`:
- это backend routes
- backend перед выдачей проверяет доступ
- только потом отдаёт короткоживущий presigned read URL

По безопасности главное:
- upload идёт напрямую в storage по временной ссылке
- storage internals наружу не светятся
- чтение файла разрешено только для trusted + authenticated + `full` + `approved`
- в `masked` режиме attachments скрываются полностью
- после attach/delete полный refresh не делается, только локальный `prep` rebuild + targeted cache invalidation

Если нужно, я могу следующим сообщением написать это же в формате handoff для фронта: `что вызывать / что ждать / когда считать файл готовым`.