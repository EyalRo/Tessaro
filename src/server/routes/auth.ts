import type { ApiHandler } from "../router";
import { ensureDefaultAdmin } from "../lib/default-admin";
import {
  createAuthSession,
  deleteAuthSession,
  createSessionCookie,
  expireSessionCookie,
  getAuthenticatedSession,
  readSessionToken,
} from "../lib/auth-session";
import { getUserById } from "../database";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export const loginRoute: ApiHandler = async (request) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  try {
    // Consume body even if we do not require specific payload fields.
    if (request.headers.get("content-type")?.includes("application/json")) {
      await request.json().catch(() => ({}));
    }
  } catch (error) {
    console.error("Failed to parse auth login body", error);
  }

  const user = await ensureDefaultAdmin();
  const session = await createAuthSession(user.id);

  const response = Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      expires_at: session.expires_at,
    },
    { status: 200, headers: jsonHeaders },
  );

  response.headers.append("set-cookie", createSessionCookie(session.token, session.expires_at));
  return response;
};

export const logoutRoute: ApiHandler = async (request) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const token = readSessionToken(request.headers.get("cookie"));
  if (token) {
    await deleteAuthSession(token).catch((error) => {
      console.error("Failed to delete auth session", error);
    });
  }

  const response = Response.json({ success: true }, { status: 200, headers: jsonHeaders });
  response.headers.append("set-cookie", expireSessionCookie());
  return response;
};

export const sessionRoute: ApiHandler = async (request) => {
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  const authSession = await getAuthenticatedSession(request);
  if (!authSession) {
    return Response.json(
      { message: "Not authenticated" },
      { status: 401, headers: jsonHeaders },
    );
  }

  const user = await getUserById(authSession.user_id);
  if (!user) {
    return Response.json(
      { message: "User not found" },
      { status: 404, headers: jsonHeaders },
    );
  }

  return Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      expires_at: authSession.expires_at,
    },
    { status: 200, headers: jsonHeaders },
  );
};
