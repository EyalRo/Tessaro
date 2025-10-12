import { compileFile } from "@marko/compiler";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEMPLATE_CACHE = new Map<string, { factory: any }>();
const CACHE_DIR = fileURLToPath(new URL("../../../.marko-cache/", import.meta.url));
let ensureCacheDirPromise: Promise<void> | null = null;

function sanitizeBaseName(path: string) {
  const segments = path.split(/[/\\]/);
  const basename = segments.pop() ?? "template";
  return basename.replace(/[^a-zA-Z0-9_-]/g, "_") || "template";
}

function hashPath(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

async function writeCompiledModule(originalPath: string, code: string) {
  if (!ensureCacheDirPromise) {
    ensureCacheDirPromise = mkdir(CACHE_DIR, { recursive: true });
  }

  await ensureCacheDirPromise;

  const baseName = sanitizeBaseName(originalPath);
  const hash = hashPath(originalPath).toString(16);
  const fileName = `${baseName}-${hash}.mjs`;
  const outputPath = join(CACHE_DIR, fileName);

  await writeFile(outputPath, code, "utf8");
  return outputPath;
}

async function loadTemplate(path: string) {
  const cached = TEMPLATE_CACHE.get(path);
  if (cached) {
    return cached.factory;
  }

  const { code } = await compileFile(path, {
    output: "html",
    modules: "esm",
    optimize: false,
  });

  const compiledPath = await writeCompiledModule(path, code);
  const moduleUrl = pathToFileURL(compiledPath).href;
  const module = await import(moduleUrl);
  const factory = module?.default ?? module;

  if (!factory) {
    throw new Error(`Failed to load Marko template at ${path}`);
  }

  TEMPLATE_CACHE.set(path, { factory });
  return factory;
}

export async function renderMarkoToString(path: string, input: Record<string, unknown> = {}) {
  const template = await loadTemplate(path);

  if (typeof template.renderToString === "function") {
    const result = template.renderToString(input);
    if (typeof result === "string") {
      return result;
    }

    if (result && typeof result.then === "function") {
      return await result;
    }
  }

  if (typeof template.render === "function") {
    const result = template.render(input);
    if (typeof result === "string") {
      return result;
    }

    if (result && typeof result.then === "function") {
      return await result;
    }
  }

  if (typeof template === "function") {
    const result = template(input);
    if (typeof result === "string") {
      return result;
    }

    if (result && typeof result.then === "function") {
      return await result;
    }
  }

  throw new Error(`Unsupported template export for ${path}`);
}
