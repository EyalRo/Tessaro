import {
  closeDatabase,
  countUsers,
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from "./storage/denodb.ts";
import { closeKv, getValue, incrementCounter, setValue } from "./storage/kv.ts";
import { assertEquals, assertExists } from "std/assert";

denoTest("user storage integrates denodb and Deno KV", async () => {
  const tempDir = await Deno.makeTempDir();
  const previousSqlitePath = Deno.env.get("SQLITE_PATH");
  const previousKvPath = Deno.env.get("DENO_KV_PATH");

  try {
    const sqlitePath = `${tempDir}/admin.sqlite`;
    const kvPath = `${tempDir}/kv.sqlite`;

    Deno.env.set("SQLITE_PATH", sqlitePath);
    Deno.env.set("DENO_KV_PATH", kvPath);

    await closeDatabase();
    await closeKv();

    assertEquals(await countUsers(), 0);

    const user = await createUser({
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      avatar_url: null,
    });

    assertExists(user.id);
    assertEquals(user.email, "test@example.com");

    const users = await listUsers();
    assertEquals(users.length, 1);

    const fetched = await getUserById(user.id);
    assertExists(fetched);
    assertEquals(fetched?.id, user.id);

    const updated = await updateUser(user.id, { name: "Updated User" });
    assertExists(updated);
    assertEquals(updated?.name, "Updated User");

    assertEquals(await countUsers(), 1);

    const hits = await incrementCounter(["metrics", "test", "hits"]);
    assertEquals(hits, 1);

    await setValue(["metrics", "test", "last"], "now");
    const metric = await getValue<string>(["metrics", "test", "last"]);
    assertEquals(metric, "now");

    const deleted = await deleteUser(user.id);
    assertEquals(deleted, true);
    assertEquals(await countUsers(), 0);
  } finally {
    await closeDatabase();
    await closeKv();

    if (previousSqlitePath === undefined) {
      Deno.env.delete("SQLITE_PATH");
    } else {
      Deno.env.set("SQLITE_PATH", previousSqlitePath);
    }

    if (previousKvPath === undefined) {
      Deno.env.delete("DENO_KV_PATH");
    } else {
      Deno.env.set("DENO_KV_PATH", previousKvPath);
    }

    await Deno.remove(tempDir, { recursive: true });
  }
});

function denoTest(name: string, fn: () => Promise<void>) {
  Deno.test({
    name,
    fn,
    permissions: {
      env: true,
      read: true,
      write: true,
      run: false,
      net: false,
      ffi: false,
    },
  });
}
