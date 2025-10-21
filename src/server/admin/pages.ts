import { fileURLToPath } from "node:url";
import {
  countOrganizations,
  countServices,
  getUserById,
  type UserRecord,
} from "../database";
import { type AuthenticatedSession } from "../lib/auth-session";
import { ensureDefaultAdmin } from "../lib/default-admin";
import { renderMarkoToString } from "../lib/marko-renderer";
import { countUsersFromFission } from "../lib/users-service";

const adminMainTemplatePath = fileURLToPath(
  new URL("../../client/src/pages/admin/main.marko", import.meta.url),
);
const adminAuthTemplatePath = fileURLToPath(
  new URL("../../client/src/pages/admin/auth.marko", import.meta.url),
);

const htmlHeaders = {
  "content-type": "text/html; charset=utf-8",
};

function createTimestampFormatter(): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

function formatTimestamp(
  value: string,
  fallback: string,
  formatter: Intl.DateTimeFormat | null,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  if (formatter) {
    try {
      return formatter.format(date);
    } catch {
      return date.toUTCString();
    }
  }

  return date.toUTCString();
}

async function resolveAdminUser(session: AuthenticatedSession): Promise<UserRecord> {
  const record = await getUserById(session.user_id);
  if (record) {
    return record;
  }

  return ensureDefaultAdmin();
}

export async function renderAdminAuthPage(errorMessage: string | null = null): Promise<Response> {
  const html = await renderMarkoToString(adminAuthTemplatePath, {
    errorMessage,
  });
  return new Response(html, { status: 200, headers: htmlHeaders });
}

export async function renderAdminDashboardPage(session: AuthenticatedSession): Promise<Response> {
  const user = await resolveAdminUser(session);
  const [usersCount, organizationsCount, servicesCount] = await Promise.all([
    countUsersFromFission(),
    countOrganizations(),
    countServices(),
  ]);

  const formatter = createTimestampFormatter();
  const issued = formatTimestamp(session.issued_at, session.issued_at, formatter);
  const expires = formatTimestamp(session.expires_at, session.expires_at, formatter);

  const highlights = [
    {
      title: "Session established",
      description: `Current admin session issued ${issued}.`,
    },
    {
      title: "Session expiry",
      description: `Token automatically expires ${expires}. Re-authenticate to renew.`,
    },
  ];

  const html = await renderMarkoToString(adminMainTemplatePath, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    stats: {
      users: usersCount,
      organizations: organizationsCount,
      services: servicesCount,
    },
    highlights,
    title: "Tessaro Admin Console",
  });

  return new Response(html, { status: 200, headers: htmlHeaders });
}
