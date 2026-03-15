import { AUTO_TX, TypedValues, Types, Ydb } from "ydb-sdk";

import { getYdbDriver } from "./driver";

type QueryParams = Record<string, Ydb.ITypedValue>;

function toDateFromMicros(value: unknown): Date | null {
  if (value == null) return null;
  const numeric = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return new Date(Math.floor(numeric / 1000));
}

function convertYdbValueToNative(type: any, value: any): unknown {
  if (type?.optionalType) {
    if (value?.nullFlagValue != null) return null;
    return convertYdbValueToNative(type.optionalType.item, value?.nestedValue ?? value);
  }

  switch (type?.typeId) {
    case Types.UTF8.typeId:
      return value?.textValue ?? null;
    case Types.INT32.typeId:
      return value?.int32Value ?? 0;
    case Types.TIMESTAMP.typeId:
      return toDateFromMicros(value?.uint64Value);
    default:
      if (value?.textValue != null) return value.textValue;
      if (value?.int32Value != null) return value.int32Value;
      if (value?.uint64Value != null) return value.uint64Value;
      return value ?? null;
  }
}

export function utf8(value: string) {
  return TypedValues.fromNative(Types.UTF8, value);
}

export function int32(value: number) {
  return TypedValues.fromNative(Types.INT32, value);
}

export function optionalInt32(value: number | null) {
  if (value == null) {
    return {
      type: { optionalType: { item: Types.INT32 } },
      value: { nullFlagValue: 0 },
    };
  }
  return {
    type: { optionalType: { item: Types.INT32 } },
    value: TypedValues.fromNative(Types.INT32, value).value,
  };
}

export function timestamp(value: Date) {
  return TypedValues.fromNative(Types.TIMESTAMP, value);
}

export function optionalTimestamp(value: Date | null) {
  if (value == null) {
    return {
      type: { optionalType: { item: Types.TIMESTAMP } },
      value: { nullFlagValue: 0 },
    };
  }
  return {
    type: { optionalType: { item: Types.TIMESTAMP } },
    value: TypedValues.fromNative(Types.TIMESTAMP, value).value,
  };
}

export function optionalUtf8(value: string | null) {
  if (value == null) {
    return {
      type: { optionalType: { item: Types.UTF8 } },
      value: { nullFlagValue: 0 },
    };
  }
  return {
    type: { optionalType: { item: Types.UTF8 } },
    value: TypedValues.fromNative(Types.UTF8, value).value,
  };
}

function rowsFromResultSet(resultSet: any): Record<string, unknown>[] {
  if (!resultSet?.columns || !resultSet?.rows) return [];
  return resultSet.rows.map((row: any) => {
    const nativeRow: Record<string, unknown> = {};
    row.items.forEach((value: unknown, index: number) => {
      const column = resultSet.columns[index];
      if (!column?.name || !column?.type) return;
      nativeRow[column.name] = convertYdbValueToNative(column.type, value);
    });
    return nativeRow;
  });
}

export async function executeQuery<T = Record<string, unknown>>(
  query: string,
  params: QueryParams = {}
): Promise<T[]> {
  const driver = await getYdbDriver();
  const result = await driver.tableClient.withSessionRetry(async (session) => {
    return session.executeQuery(query, params, AUTO_TX);
  });

  const firstResultSet = result?.resultSets?.[0];
  return rowsFromResultSet(firstResultSet) as T[];
}

export async function executeVoid(query: string, params: QueryParams = {}): Promise<void> {
  await executeQuery(query, params);
}
