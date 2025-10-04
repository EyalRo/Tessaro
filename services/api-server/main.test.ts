function assertEquals<T>(actual: T, expected: T, message?: string) {
  const actualString = JSON.stringify(actual);
  const expectedString = JSON.stringify(expected);

  if (actualString !== expectedString) {
    throw new Error(
      message ?? `Expected ${expectedString} but received ${actualString}`,
    );
  }
}

const originalRavenUrls = Deno.env.get("RAVEN_URLS");
const originalRavenDatabase = Deno.env.get("RAVEN_DATABASE");

Deno.env.set("RAVEN_URLS", "");
Deno.env.set("RAVEN_DATABASE", "");

const { createApp } = await import("./main.ts");

addEventListener("unload", () => {
  if (originalRavenUrls === undefined) {
    Deno.env.delete("RAVEN_URLS");
  } else {
    Deno.env.set("RAVEN_URLS", originalRavenUrls);
  }

  if (originalRavenDatabase === undefined) {
    Deno.env.delete("RAVEN_DATABASE");
  } else {
    Deno.env.set("RAVEN_DATABASE", originalRavenDatabase);
  }
});

Deno.test("GET / returns the greeting", async () => {
  const app = createApp();
  const response = await app.request("/");

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "Hello, World!");
});

Deno.test("GET /users returns an empty array when RavenDB is not configured", async () => {
  const app = createApp();
  const response = await app.request("/users");

  assertEquals(response.status, 200);
  assertEquals(await response.json(), []);
});
