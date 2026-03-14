import { Driver, getCredentialsFromEnv } from "ydb-sdk";

import { getAuthRuntimeConfig } from "../config";

let driverPromise: Promise<Driver> | null = null;

export async function getYdbDriver(): Promise<Driver> {
  if (!driverPromise) {
    driverPromise = (async () => {
      const cfg = getAuthRuntimeConfig();
      const driver = new Driver({
        endpoint: cfg.ydbEndpoint,
        database: cfg.ydbDatabase,
        authService: getCredentialsFromEnv(),
      });
      await driver.ready(10000);
      return driver;
    })();
  }

  return driverPromise;
}

export async function destroyYdbDriver(): Promise<void> {
  if (!driverPromise) return;
  const driver = await driverPromise;
  driverPromise = null;
  await driver.destroy();
}
