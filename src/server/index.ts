import { serve, type Server } from "bun";
import { handleApiRequest } from "./router";
import { initializeDatabase } from "./database";
import { getAuthenticatedSession } from "./lib/auth-session";
import { renderAdminAuthPage, renderAdminDashboardPage } from "./admin/pages";
import { renderServiceWorkspace } from "./admin/workspace";
import {
  isFileRequest,
  redirectResponse,
  serveStaticAsset,
  watchForQuit,
} from "./lib/server-utils";
import embeddedMainAppHtml from "../client/main-app.html";
import { logger } from "./lib/logger";

const publicDir = new URL("../client/public", import.meta.url);
const embeddedMainHtml = embeddedMainAppHtml;

const mainHtml = await loadMainHtml();

const htmlHeaders = {
  "content-type": "text/html; charset=utf-8",
};

async function loadMainHtml(): Promise<string> {
  const fileUrl = new URL("../client/main-app.html", import.meta.url);
  const file = Bun.file(fileUrl);

  if (await file.exists()) {
    return file.text();
  }

  if (embeddedMainHtml) {
    if (typeof embeddedMainHtml === "string") {
      return embeddedMainHtml;
    }

    const assetPath = (embeddedMainHtml as { index?: unknown }).index;
    if (typeof assetPath === "string") {
      const assetFile = Bun.file(assetPath);
      if (await assetFile.exists()) {
        return assetFile.text();
      }
    }
  }

  throw new Error("Unable to load client/main-app.html");
}

function renderMainApp(): Response {
  return new Response(mainHtml, { status: 200, headers: htmlHeaders });
}

await initializeDatabase();

const port = Number.parseInt(Bun.env.PORT ?? "3000", 10);

const server: Server = serve({
  port,
  development: process.env.NODE_ENV !== "production",
  fetch: async (request) => {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) {
      return handleApiRequest(request);
    }

    if (pathname.startsWith("/services/")) {
      return renderServiceWorkspace(request);
    }

    if (pathname.startsWith("/admin")) {
      if (isFileRequest(pathname)) {
        const assetPath = pathname.replace(/^\/admin/, "");
        const fileResponse = await serveStaticAsset(assetPath, publicDir);
        if (fileResponse) {
          return fileResponse;
        }
      }

      if (pathname === "/admin/auth" || pathname === "/admin/auth/") {
        const session = await getAuthenticatedSession(request);
        if (session) {
          return redirectResponse("/admin", 303);
        }

        const errorMessage = url.searchParams.get("error");
        return renderAdminAuthPage(errorMessage);
      }

      const session = await getAuthenticatedSession(request);
      if (!session) {
        return redirectResponse("/admin/auth", 303);
      }

      return renderAdminDashboardPage(session);
    }

    if (pathname === "/" || pathname === "/index.html") {
      return renderMainApp();
    }

    const staticResponse = await serveStaticAsset(pathname, publicDir);
    if (staticResponse) {
      return staticResponse;
    }

    return new Response("Not Found", { status: 404 });
  },
});

watchForQuit(server);

logger.info("Tessaro Bun server started", {
  port,
  development: process.env.NODE_ENV !== "production",
});
