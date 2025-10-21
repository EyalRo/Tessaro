import { type Server } from "bun";

export function watchForQuit(server: Server): void {
  if (!Bun.stdin.isTTY) {
    return;
  }

  console.log("Press q then enter to stop the server.");
  const decoder = new TextDecoder();

  void (async () => {
    try {
      for await (const chunk of Bun.stdin.stream()) {
        const input = decoder.decode(chunk).trim().toLowerCase();
        if (input === "q") {
          console.log("Shutting down Tessaro server...");
          server.stop(true);
          Bun.exit(0);
        }
      }
    } catch (error) {
      console.warn("Quit watcher stopped", error);
    }
  })();
}

export async function serveStaticAsset(pathname: string, publicDir: URL): Promise<Response | null> {
  try {
    const assetUrl = new URL(`.${pathname}`, publicDir);
    const file = Bun.file(assetUrl);
    if (!(await file.exists())) {
      return null;
    }

    return new Response(file);
  } catch {
    return null;
  }
}

export function redirectResponse(location: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: location,
    },
  });
}

export function isFileRequest(pathname: string): boolean {
  return pathname.split("/").pop()?.includes(".") ?? false;
}
