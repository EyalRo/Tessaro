import { dirname } from "std/path";
import { ensureDir } from "std/fs";

let kvPromise: Promise<Deno.Kv> | null = null;
let kvInstance: Deno.Kv | null = null;

function normalizePath(path: string) {
  if (path.startsWith("file://")) {
    return new URL(path).pathname;
  }

  return path;
}

async function prepareDirectory(path: string) {
  if (path.includes("://")) {
    return;
  }

  const dir = dirname(path);
  if (!dir || dir === ".") {
    return;
  }

  await ensureDir(dir);
}

export async function getKv(): Promise<Deno.Kv> {
  if (!kvPromise) {
    kvPromise = (async () => {
      const kvPath = Deno.env.get("DENO_KV_PATH") ?? "./data/kv.sqlite";
      const normalizedPath = normalizePath(kvPath);
      await prepareDirectory(normalizedPath);
      kvInstance = await Deno.openKv(kvPath);
      return kvInstance;
    })();
  }

  return await kvPromise;
}

export async function incrementCounter(
  key: Deno.KvKey,
  amount = 1,
): Promise<number> {
  const kv = await getKv();

  while (true) {
    const entry = await kv.get<number>(key);
    const currentValue = entry.value ?? 0;
    const nextValue = currentValue + amount;

    const result = await kv.atomic()
      .check(entry)
      .set(key, nextValue)
      .commit();

    if (result.ok) {
      return nextValue;
    }
  }
}

export async function setValue<T>(key: Deno.KvKey, value: T) {
  const kv = await getKv();
  await kv.set(key, value);
}

export async function getValue<T>(key: Deno.KvKey): Promise<T | null> {
  const kv = await getKv();
  const entry = await kv.get<T>(key);
  return entry.value ?? null;
}

export async function closeKv() {
  if (kvInstance) {
    await kvInstance.close();
    kvInstance = null;
    kvPromise = null;
  }
}
