import { serve } from "bun";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./router";
import {
  initializeDatabase,
  countUsers,
  countOrganizations,
  countServices,
  getUserById,
  listServicesForOrganizations,
  type UserRecord,
} from "./database";
import {
  getAuthenticatedSession,
  type AuthenticatedSession,
} from "./lib/auth-session";
import { ensureDefaultAdmin } from "./lib/default-admin";
import { renderMarkoToString } from "./lib/marko-renderer";

const mainHtmlFile = Bun.file(new URL("../client/main-app.html", import.meta.url));
const publicDir = new URL("../client/public", import.meta.url);

const adminMainTemplatePath = fileURLToPath(
  new URL("../client/src/pages/admin/main.marko", import.meta.url),
);
const adminAuthTemplatePath = fileURLToPath(
  new URL("../client/src/pages/admin/auth.marko", import.meta.url),
);

const mainHtml = await mainHtmlFile.text();

const htmlHeaders = {
  "content-type": "text/html; charset=utf-8",
};

function renderMainApp() {
  return new Response(mainHtml, { status: 200, headers: htmlHeaders });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function renderAdminAuthPage(errorMessage: string | null = null) {
  const html = await renderMarkoToString(adminAuthTemplatePath, {
    errorMessage,
  });
  return new Response(html, { status: 200, headers: htmlHeaders });
}

function createTimestampFormatter() {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

function formatTimestamp(value: string, fallback: string, formatter: Intl.DateTimeFormat | null) {
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

function serviceStatusBadge(status: string) {
  if (status === "active") {
    return "badge badge--success";
  }

  if (status === "maintenance") {
    return "badge badge--warning";
  }

  return "badge";
}

function renderGenericServiceHtml(options: {
  serviceName: string;
  description: string;
  status: string;
  organizationNames: string;
}) {
  const statusClass = serviceStatusBadge(options.status);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(options.serviceName)} • Tessaro Services</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, Segoe UI, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3rem 1.5rem;
      }

      main {
        padding: 3rem 2.5rem;
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        background: rgba(15, 23, 42, 0.92);
        box-shadow: 0 40px 100px -40px rgba(15, 23, 42, 0.75);
        max-width: 640px;
      }

      h1 {
        margin: 0 0 0.75rem;
        font-size: clamp(2.4rem, 5vw, 3.2rem);
        letter-spacing: -0.04em;
      }

      p {
        margin: 0 0 1.25rem;
        line-height: 1.6;
        color: rgba(226, 232, 240, 0.78);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        text-transform: uppercase;
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        border-radius: 999px;
        padding: 0.3rem 0.9rem;
        background: rgba(100, 116, 139, 0.28);
        color: rgba(226, 232, 240, 0.86);
      }

      .badge--success {
        background: rgba(16, 185, 129, 0.28);
        color: rgba(134, 239, 172, 0.92);
      }

      .badge--warning {
        background: rgba(253, 224, 71, 0.28);
        color: rgba(253, 224, 71, 0.95);
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 2rem;
        align-items: center;
      }

      a.button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.9rem 1.6rem;
        border-radius: 999px;
        font-weight: 600;
        text-decoration: none;
        color: #0f172a;
        background: linear-gradient(135deg, #38bdf8, #22d3ee);
      }

      a.button:hover {
        transform: translateY(-1px);
        box-shadow: 0 16px 32px -24px rgba(56, 189, 248, 0.9);
      }

      .supporting {
        font-size: 0.95rem;
        color: rgba(148, 163, 184, 0.85);
      }

      @media (max-width: 640px) {
        main {
          padding: 2.6rem 2rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <p class="supporting">Service workspace</p>
      <h1>${escapeHtml(options.serviceName)}</h1>
      <div class="meta">
        <span class="${statusClass}">${escapeHtml(options.status)}</span>
        <span class="supporting">Available to: ${escapeHtml(options.organizationNames || "Your organization")}</span>
      </div>
      <p>${escapeHtml(options.description)}</p>
      <a class="button" href="/">Back to organization workspace</a>
    </main>
  </body>
</html>`;
}

function renderServiceNotFoundHtml(serviceId: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Service unavailable • Tessaro</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, Segoe UI, sans-serif;
        color: #e2e8f0;
        background: #0f172a;
        padding: 3rem 1.5rem;
      }

      main {
        max-width: 520px;
        background: rgba(15, 23, 42, 0.9);
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        padding: 2.5rem 2.25rem;
        text-align: center;
      }

      h1 {
        margin: 0 0 1rem;
        font-size: 2.4rem;
        letter-spacing: -0.03em;
      }

      p {
        color: rgba(226, 232, 240, 0.78);
        line-height: 1.6;
      }

      a {
        display: inline-flex;
        margin-top: 1.75rem;
        padding: 0.85rem 1.5rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #38bdf8, #22d3ee);
        color: #0f172a;
        font-weight: 600;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Service unavailable</h1>
      <p>
        We couldn't find a service matching <code>${escapeHtml(serviceId)}</code> for your account.
      </p>
      <a href="/">Return to workspace</a>
    </main>
  </body>
</html>`;
}

function renderUserManagementServiceHtml(options: {
  serviceName: string;
  description: string;
  organizations: Array<{
    id: string;
    name: string;
    isAdmin: boolean;
  }>;
}) {
  const bootstrap = escapeHtml(JSON.stringify(options));
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(options.serviceName)} • User Management</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, Segoe UI, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: stretch;
        justify-content: center;
        padding: 3rem 1.5rem;
      }

      main {
        width: min(960px, 100%);
        display: grid;
        gap: 2rem;
      }

      .panel {
        padding: 2.5rem 2rem;
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(15, 23, 42, 0.93);
        box-shadow: 0 40px 95px -40px rgba(15, 23, 42, 0.75);
      }

      .header {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .header h1 {
        margin: 0;
        font-size: clamp(2.4rem, 5vw, 3.25rem);
        letter-spacing: -0.04em;
      }

      .muted {
        color: rgba(226, 232, 240, 0.78);
        line-height: 1.6;
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1rem;
        margin-top: 1.5rem;
      }

      select,
      input,
      button {
        appearance: none;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.3);
        background: rgba(15, 23, 42, 0.8);
        color: inherit;
        font-size: 1rem;
        padding: 0.75rem 1rem;
      }

      button {
        border: none;
        cursor: pointer;
        background: linear-gradient(135deg, #38bdf8, #22d3ee);
        color: #0f172a;
        font-weight: 600;
        transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
      }

      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 32px -20px rgba(56, 189, 248, 0.85);
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
      }

      th,
      td {
        text-align: left;
        padding: 0.85rem 0.75rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      }

      th {
        font-weight: 600;
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(148, 163, 184, 0.85);
      }

      tbody tr:hover {
        background: rgba(30, 41, 59, 0.45);
      }

      .actions-cell {
        display: flex;
        gap: 0.5rem;
      }

      .danger {
        background: linear-gradient(135deg, #f87171, #ef4444);
        color: #0f172a;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .status {
        min-height: 1.5rem;
        font-size: 0.95rem;
        color: rgba(148, 163, 184, 0.88);
      }

      .status.success {
        color: rgba(74, 222, 128, 0.9);
      }

      .status.error {
        color: rgba(248, 113, 113, 0.95);
      }

      .empty {
        padding: 1.5rem 0;
        font-style: italic;
        color: rgba(148, 163, 184, 0.9);
        text-align: center;
      }

      @media (max-width: 640px) {
        body {
          padding: 2.5rem 1.25rem;
        }

        .panel {
          padding: 2.25rem 1.5rem;
        }

        table {
          font-size: 0.95rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <div class="header">
          <p class="muted">Organization service</p>
          <h1>${escapeHtml(options.serviceName)}</h1>
          <p class="muted">${escapeHtml(options.description)}</p>
        </div>
        <div class="toolbar">
          <label>
            <span class="muted" style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Organization</span>
            <select id="organization-select"></select>
          </label>
          <button id="refresh-button" type="button">Refresh</button>
        </div>
        <div id="info-line" class="status" role="status" aria-live="polite"></div>
      </section>
      <section class="panel">
        <div id="users-panel">
          <table id="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Organizations</th>
                <th id="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody id="users-body"></tbody>
          </table>
          <div id="users-empty" class="empty" hidden>No users found for this organization.</div>
        </div>
        <div id="create-form-section">
          <h2 style="margin:2rem 0 0.75rem;font-size:1.3rem;">Add a user</h2>
          <form id="create-user-form">
            <div class="form-grid">
              <label>
                <span class="muted" style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Name</span>
                <input id="user-name" name="name" type="text" autocomplete="name" required />
              </label>
              <label>
                <span class="muted" style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Email</span>
                <input id="user-email" name="email" type="email" autocomplete="email" required />
              </label>
              <label>
                <span class="muted" style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Role</span>
                <select id="user-role" name="role">
                  <option value="member">Member</option>
                  <option value="organization_admin">Organization administrator</option>
                </select>
              </label>
            </div>
            <div style="margin-top:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;">
              <button type="submit">Add user</button>
              <span id="form-status" class="status" role="status" aria-live="polite"></span>
            </div>
          </form>
        </div>
        <div id="not-admin-note" class="status" hidden>
          You can view the membership of this organization, but only administrators can add or remove users.
        </div>
      </section>
    </main>
    <script type="application/json" id="service-bootstrap">${bootstrap}</script>
    <script>
      (() => {
        const bootstrapScript = document.getElementById("service-bootstrap");
        const bootstrap = bootstrapScript ? JSON.parse(bootstrapScript.textContent || "{}"): {};
        const orgSelect = document.getElementById("organization-select");
        const infoLine = document.getElementById("info-line");
        const refreshButton = document.getElementById("refresh-button");
        const usersBody = document.getElementById("users-body");
        const usersEmpty = document.getElementById("users-empty");
        const actionsHeader = document.getElementById("actions-header");
        const formSection = document.getElementById("create-form-section");
        const form = document.getElementById("create-user-form");
        const formStatus = document.getElementById("form-status");
        const notAdminNote = document.getElementById("not-admin-note");

        const state = {
          selectedOrganizationId: null,
          organizations: bootstrap.organizations || [],
          isAdminForSelected: false,
        };

        function updateStatus(element, message, kind = "info") {
          if (!element) {
            return;
          }
          element.textContent = message ?? "";
          element.classList.remove("success", "error");
          if (kind === "success") {
            element.classList.add("success");
          } else if (kind === "error") {
            element.classList.add("error");
          }
        }

        function populateOrganizations() {
          if (!orgSelect) {
            return;
          }

          orgSelect.innerHTML = "";
          state.organizations.forEach((organization, index) => {
            const option = document.createElement("option");
            option.value = organization.id;
            option.textContent = organization.name;
            if (index === 0) {
              option.selected = true;
              state.selectedOrganizationId = organization.id;
              state.isAdminForSelected = Boolean(organization.isAdmin);
            }
            orgSelect.appendChild(option);
          });

          if (state.organizations.length === 0) {
            updateStatus(infoLine, "You are not assigned to an organization yet.", "error");
            if (formSection) {
              formSection.hidden = true;
            }
            if (actionsHeader) {
              actionsHeader.hidden = true;
            }
          }
        }

        function renderUsers(users) {
          if (!usersBody || !usersEmpty) {
            return;
          }

          usersBody.innerHTML = "";

          if (!users.length) {
            usersEmpty.hidden = false;
            return;
          }

          usersEmpty.hidden = true;
          users.forEach((user) => {
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.textContent = user.name;
            row.appendChild(nameCell);

            const emailCell = document.createElement("td");
            emailCell.textContent = user.email;
            row.appendChild(emailCell);

            const roleCell = document.createElement("td");
            roleCell.textContent = user.role;
            row.appendChild(roleCell);

            const orgCell = document.createElement("td");
            orgCell.textContent = (user.organizations || []).map((org) => org.name).join(", ");
            row.appendChild(orgCell);

            const actionsCell = document.createElement("td");
            actionsCell.className = "actions-cell";

            if (state.isAdminForSelected) {
              const removeButton = document.createElement("button");
              removeButton.type = "button";
              removeButton.textContent = "Remove";
              removeButton.className = "danger";
              removeButton.addEventListener("click", async () => {
                const confirmRemove = window.confirm("Remove " + user.name + " from the organization?");
                if (!confirmRemove) {
                  return;
                }
                try {
                  const response = await fetch("/api/users/" + encodeURIComponent(user.id), {
                    method: "DELETE",
                    credentials: "include",
                  });
                  if (!response.ok && response.status !== 404) {
                    throw new Error("Failed with status " + response.status);
                  }
                  updateStatus(infoLine, user.name + " removed.", "success");
                  await loadUsers();
                } catch (error) {
                  console.error("Failed to remove user", error);
                  updateStatus(infoLine, "Could not remove user. Try again.", "error");
                }
              });
              actionsCell.appendChild(removeButton);
            }

            if (!state.isAdminForSelected) {
              actionsCell.textContent = "—";
            }

            row.appendChild(actionsCell);
            usersBody.appendChild(row);
          });
        }

        async function loadUsers(displayStatus = true) {
          if (!state.selectedOrganizationId) {
            return;
          }

          if (displayStatus) {
            updateStatus(infoLine, "Loading members...", "info");
          }

          try {
            const response = await fetch("/api/users", {
              method: "GET",
              credentials: "include",
            });

            if (response.status === 401) {
              updateStatus(infoLine, "Your session expired. Please refresh and sign in again.", "error");
              return;
            }

            if (!response.ok) {
              throw new Error("User list failed with status " + response.status);
            }

            const users = await response.json();
            const filtered = users.filter((user) =>
              Array.isArray(user.organizations) && user.organizations.some((org) => org.id === state.selectedOrganizationId),
            );
            renderUsers(filtered);

            if (displayStatus) {
              const suffix = filtered.length === 1 ? "" : "s";
              updateStatus(infoLine, "Loaded " + filtered.length + " user" + suffix + ".", "success");
            }
          } catch (error) {
            console.error("Failed to load users", error);
            updateStatus(infoLine, "We couldn't load users right now. Please try again shortly.", "error");
          }
        }

        async function handleCreate(event) {
          event.preventDefault();

          if (!state.selectedOrganizationId) {
            updateStatus(formStatus, "Select an organization first.", "error");
            return;
          }

          const formData = new FormData(form);
          const name = String(formData.get("name") || "").trim();
          const email = String(formData.get("email") || "").trim();
          const role = String(formData.get("role") || "member").trim();

          if (!name || !email) {
            updateStatus(formStatus, "Name and email are required.", "error");
            return;
          }

          updateStatus(formStatus, "Adding user...", "info");

          try {
            const response = await fetch("/api/users", {
              method: "POST",
              headers: { "content-type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name,
                email,
                role,
                organization_ids: [state.selectedOrganizationId],
              }),
            });

            if (!response.ok) {
              const message = await response.json().catch(() => null);
              const text = message?.message ?? "Failed with status " + response.status;
              throw new Error(text);
            }

            form.reset();
            updateStatus(formStatus, "User added.", "success");
            await loadUsers(false);
          } catch (error) {
            console.error("Failed to create user", error);
            updateStatus(formStatus, error instanceof Error ? error.message : "Unable to create user.", "error");
          }
        }

        function onOrganizationChange(event) {
          const value = event.target.value;
          state.selectedOrganizationId = value;
          const selected = state.organizations.find((org) => org.id === value);
          state.isAdminForSelected = Boolean(selected?.isAdmin);
          if (state.isAdminForSelected) {
            if (formSection) {
              formSection.hidden = false;
            }
            if (actionsHeader) {
              actionsHeader.hidden = false;
            }
            if (notAdminNote) {
              notAdminNote.hidden = true;
            }
          } else {
            if (formSection) {
              formSection.hidden = true;
            }
            if (actionsHeader) {
              actionsHeader.hidden = true;
            }
            if (notAdminNote) {
              notAdminNote.hidden = false;
            }
          }
          loadUsers();
        }

        if (state.organizations.length > 0) {
          populateOrganizations();
          loadUsers();
          if (!state.isAdminForSelected) {
            if (formSection) {
              formSection.hidden = true;
            }
            if (actionsHeader) {
              actionsHeader.hidden = true;
            }
            if (notAdminNote) {
              notAdminNote.hidden = false;
            }
          }
        } else {
          if (formSection) {
            formSection.hidden = true;
          }
          if (actionsHeader) {
            actionsHeader.hidden = true;
          }
          if (usersBody) {
            usersBody.innerHTML = "";
          }
        }

        orgSelect?.addEventListener("change", onOrganizationChange);
        refreshButton?.addEventListener("click", () => loadUsers());
        form?.addEventListener("submit", handleCreate);
      })();
    </script>
  </body>
</html>`;
}

async function renderServiceWorkspace(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const serviceId = url.pathname.replace(/^\/services\//, "").replace(/\/+$/, "");

  if (!serviceId) {
    return redirectResponse("/", 303);
  }

  const session = await getAuthenticatedSession(request);
  if (!session) {
    return redirectResponse("/", 303);
  }

  const user = await getUserById(session.user_id);
  if (!user) {
    return redirectResponse("/", 303);
  }

  const organizationIds = user.organizations.map((organization) => organization.id);
  const services = await listServicesForOrganizations(organizationIds);
  const service = services.find((entry) => entry.id === serviceId);

  if (!service) {
    return new Response(renderServiceNotFoundHtml(serviceId), {
      status: 404,
      headers: htmlHeaders,
    });
  }

  const organizationNames = user.organizations.map((organization) => organization.name).join(", ");

  let html: string;

  if (service.service_type === "user_management") {
    const organizations = user.organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      isAdmin: user.role === "admin" || user.role === "organization_admin",
    }));

    html = renderUserManagementServiceHtml({
      serviceName: service.name,
      description: service.description ?? "Manage organization users and access.",
      organizations,
    });
  } else {
    html = renderGenericServiceHtml({
      serviceName: service.name,
      description: service.description ?? "No description provided yet.",
      status: service.status,
      organizationNames,
    });
  }

  return new Response(html, { status: 200, headers: htmlHeaders });
}

async function renderAdminDashboardPage(session: AuthenticatedSession) {
  const user = await resolveAdminUser(session);
  const [usersCount, organizationsCount, servicesCount] = await Promise.all([
    countUsers(),
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

function redirectResponse(location: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      Location: location,
    },
  });
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

    if (pathname.startsWith("/services/")) {
      return renderServiceWorkspace(request);
    }

    if (pathname.startsWith("/admin")) {
      if (isFileRequest(pathname)) {
        const assetPath = pathname.replace(/^\/admin/, "");
        const fileResponse = await serveStaticAsset(assetPath);
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

    const staticResponse = await serveStaticAsset(pathname);
    if (staticResponse) {
      return staticResponse;
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.info(`Tessaro Bun server listening on http://localhost:${port}`);
