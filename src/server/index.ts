import { serve } from "bun";
import { handleApiRequest } from "./router";
import { initializeDatabase } from "./database";

const mainHtmlFile = Bun.file(new URL("../client/main-app.html", import.meta.url));
const adminHtmlFile = Bun.file(new URL("../client/admin-app.html", import.meta.url));
const publicDir = new URL("../client/public", import.meta.url);

const [mainHtml, adminHtml] = await Promise.all([
  mainHtmlFile.text(),
  adminHtmlFile.text(),
]);

const htmlHeaders = {
  "content-type": "text/html; charset=utf-8",
};

function renderMainApp() {
  return new Response(mainHtml, { status: 200, headers: htmlHeaders });
}

function renderAdminApp() {
  return new Response(adminHtml, { status: 200, headers: htmlHeaders });
}

async function serveStaticAsset(pathname: string): Promise<Response | null> {
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

function isFileRequest(pathname: string): boolean {
  return pathname.split("/").pop()?.includes(".") ?? false;
}

await initializeDatabase();

const port = Number.parseInt(Bun.env.PORT ?? "3000", 10);

serve({
  port,
  development: process.env.NODE_ENV !== "production",
  fetch: async (request) => {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) {
      return handleApiRequest(request);
    }

    if (pathname.startsWith("/admin")) {
      if (isFileRequest(pathname)) {
        const assetPath = pathname.replace(/^\/admin/, "");
        const fileResponse = await serveStaticAsset(assetPath);
        if (fileResponse) {
          return fileResponse;
        }
      }

      return renderAdminApp();
    }

    if (pathname === "/" || pathname === "/index.html") {
      return renderMainApp();
    }

    const staticResponse = await serveStaticAsset(pathname);
    if (staticResponse) {
      return staticResponse;
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.info(`Tessaro Bun server listening on http://localhost:${port}`);
