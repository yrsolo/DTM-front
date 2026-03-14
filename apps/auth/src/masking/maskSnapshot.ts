import { createHash } from "node:crypto";

const DESIGNER_FIRST_NAMES = ["Алексей", "Мария", "Илья", "Ольга", "Егор", "Анна", "Дмитрий", "Лера", "Никита", "Полина"];
const DESIGNER_LAST_NAMES = ["Соколов", "Миронова", "Ершов", "Веденеева", "Орлов", "Нестерова", "Крылов", "Тарасова", "Васильев", "Жукова"];
const BRANDS = ["Проект Альфа", "Проект Бета", "Проект Гамма", "Проект Дельта", "Проект Омега", "Проект Сфера"];
const SHOWS = ["Шоу Север", "Шоу Вектор", "Шоу Сигма", "Шоу Спектр", "Шоу Линия"];
const CUSTOMERS = ["Менеджер А", "Менеджер Б", "Менеджер В", "Менеджер Г", "Менеджер Д"];
const FORMATS = ["Формат А", "Формат Б", "Формат В", "Формат Г", "Формат Д"];

function pickByHash(seed: string, values: string[]): string {
  const hash = createHash("sha256").update(seed).digest();
  const index = hash.readUInt32BE(0) % values.length;
  return values[index];
}

function hashKey(salt: string, scope: string, value: string): string {
  return createHash("sha256").update(`${salt}:${scope}:${value}`).digest("hex");
}

function maskPersonName(salt: string, id: string, original: string): string {
  const first = pickByHash(hashKey(salt, "person:first", `${id}:${original}`), DESIGNER_FIRST_NAMES);
  const last = pickByHash(hashKey(salt, "person:last", `${id}:${original}`), DESIGNER_LAST_NAMES);
  return `${first} ${last}`;
}

function maskShortLabel(salt: string, scope: string, id: string, original: string, variants: string[]): string {
  return pickByHash(hashKey(salt, scope, `${id}:${original}`), variants);
}

export function maskSnapshotPayload(rawPayload: any, maskingSalt: string): any {
  const payload = JSON.parse(JSON.stringify(rawPayload));

  if (Array.isArray(payload?.entities?.groups)) {
    payload.entities.groups = payload.entities.groups.map((group: any) => ({
      ...group,
      name: maskShortLabel(maskingSalt, "group", String(group.id ?? ""), String(group.name ?? ""), SHOWS),
    }));
  }

  if (Array.isArray(payload?.entities?.people)) {
    payload.entities.people = payload.entities.people.map((person: any) => ({
      ...person,
      name: maskPersonName(maskingSalt, String(person.id ?? ""), String(person.name ?? "")),
    }));
  }

  if (Array.isArray(payload?.tasks)) {
    payload.tasks = payload.tasks.map((task: any) => {
      const maskedBrand = maskShortLabel(maskingSalt, "brand", String(task.id ?? ""), String(task.brand ?? ""), BRANDS);
      const maskedGroup = maskShortLabel(maskingSalt, "group", String(task.groupId ?? task.id ?? ""), String(task.title ?? ""), SHOWS);
      const maskedFormat = maskShortLabel(maskingSalt, "format", String(task.id ?? ""), String(task.format_ ?? ""), FORMATS);
      const maskedCustomer = maskShortLabel(maskingSalt, "customer", String(task.id ?? ""), String(task.customer ?? ""), CUSTOMERS);

      return {
        ...task,
        brand: maskedBrand,
        customer: maskedCustomer,
        format_: maskedFormat,
        history: task.history ? "История скрыта до одобрения доступа" : task.history,
        title: `${maskedBrand} [${maskedGroup}] ${maskedFormat}`,
      };
    });
  }

  return payload;
}
