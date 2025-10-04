function assertEquals<T>(actual: T, expected: T, message?: string) {
  const actualString = JSON.stringify(actual);
  const expectedString = JSON.stringify(expected);

  if (actualString !== expectedString) {
    throw new Error(
      message ?? `Expected ${expectedString} but received ${actualString}`,
    );
  }
}

import { createApp } from "./main.ts";
import { setRavenConfig } from "./users.ts";

function resetRavenConfig() {
  setRavenConfig({ urls: [], database: "" });
}

Deno.test("GET / returns the greeting", async () => {
  resetRavenConfig();
  const app = createApp();
  const response = await app.request("/");

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "Hello, World!");
});

Deno.test("GET /users returns an empty array when RavenDB is not configured", async () => {
  resetRavenConfig();
  const app = createApp();
  const response = await app.request("/users");

  assertEquals(response.status, 200);
  assertEquals(await response.json(), []);
});
