// users.ts
import { Hono } from "./lib/hono.ts";
import type { Context } from "./lib/hono.ts";
type DocumentStore = {
  initialize(): void;
  openSession(): {
    query(options: { collection: string }): {
      all(): Promise<unknown[]>;
    };
    dispose?: () => void;
  };
};

type RavenConfig = {
  urls: string[];
  database: string;
};

function safeGetEnv(key: string): string | undefined {
  try {
    return Deno.env.get(key);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "PermissionDenied" || error.name === "NotCapable")
    ) {
      return undefined;
    }

    throw error;
  }
}

function loadConfigFromEnv(): RavenConfig {
  const urls = safeGetEnv("RAVEN_URLS")
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean) ?? [];

  const database = safeGetEnv("RAVEN_DATABASE") ?? "";

  return { urls, database };
}

const app = new Hono();

let ravenConfig: RavenConfig = loadConfigFromEnv();
let documentStore: DocumentStore | null = null;
let documentStoreInitPromise: Promise<DocumentStore | null> | null = null;

export function setRavenConfig(config: RavenConfig) {
  ravenConfig = {
    urls: [...config.urls],
    database: config.database,
  };

  documentStore = null;
  documentStoreInitPromise = null;
}

async function getDocumentStore() {
  if (documentStore) {
    return documentStore;
  }

  if (ravenConfig.urls.length === 0 || !ravenConfig.database) {
    return null;
  }

  if (!documentStoreInitPromise) {
    documentStoreInitPromise = (async () => {
      try {
        const module = await import("npm:ravendb");
        const Store = module.DocumentStore as unknown as new (
          urls: string[],
          database: string,
        ) => DocumentStore;

        const store = new Store(ravenConfig.urls, ravenConfig.database);
        store.initialize();
        documentStore = store;
        return store;
      } catch (error) {
        console.error("Failed to initialize RavenDB document store", error);
        documentStore = null;
        return null;
      } finally {
        documentStoreInitPromise = null;
      }
    })();
  }

  return documentStoreInitPromise;
}

app.get("/", async (c: Context) => {
  const store = await getDocumentStore();

  if (!store) {
    return c.json([]);
  }

  const session = store.openSession();

  try {
    const users = await session
      .query({ collection: "Users" })
      .all();

    return c.json(users ?? []);
  } catch (error) {
    console.error("Failed to load users from RavenDB", error);
    return c.json([]);
  } finally {
    if (typeof session.dispose === "function") {
      session.dispose();
    }
  }
});

app.post("/", (c: Context) => c.json("create a user", 201));
app.get("/:id", (c: Context) => c.json(`get ${c.req.param("id")}`));

export default app;
