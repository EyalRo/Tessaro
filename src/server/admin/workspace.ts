import { getUserById, listServicesForOrganizations } from "../database";
import { ensureSessionOrganization, getAuthenticatedSession } from "../lib/auth-session";
import { redirectResponse } from "../lib/server-utils";
import { logger } from "../lib/logger";

const htmlHeaders = {
  "content-type": "text/html; charset=utf-8",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serviceStatusBadge(status: string): string {
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
}): string {
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

function renderServiceNotFoundHtml(serviceId: string): string {
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
  organization: {
    id: string;
    name: string;
    isAdmin: boolean;
  } | null;
}): string {
  const organizationLabel = options.organization
    ? `Organization: ${escapeHtml(options.organization.name)}`
    : "No organization assigned";
  const bootstrap = JSON.stringify(options)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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

      .secondary {
        background: transparent;
        border-color: rgba(148, 163, 184, 0.4);
        color: rgba(226, 232, 240, 0.9);
      }

      .secondary:hover {
        background: rgba(148, 163, 184, 0.18);
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
        <p class="muted">${organizationLabel}</p>
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
                <th id="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody id="users-body"></tbody>
          </table>
          <div id="users-empty" class="empty" hidden>No users found for this organization.</div>
        </div>
        <div id="edit-form-section" hidden>
          <h2 style="margin:2rem 0 0.75rem;font-size:1.3rem;">Edit a user</h2>
          <form id="edit-user-form">
            <div class="form-grid">
              <label>
                <span class="muted" style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Name</span>
                <input id="edit-name" name="name" type="text" autocomplete="name" required />
              </label>
              <label>
                <span class="muted" style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Email</span>
                <input id="edit-email" name="email" type="email" autocomplete="email" required />
              </label>
              <label>
                <span class="muted" style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Role</span>
                <select id="edit-role" name="role">
                  <option value="member">Member</option>
                  <option value="organization_admin">Organization administrator</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
              <label>
                <span class="muted" style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Password</span>
                <input
                  id="edit-password"
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Leave blank to keep the current password"
                />
              </label>
            </div>
            <div style="margin-top:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;">
              <button type="submit">Save changes</button>
              <button type="button" id="cancel-edit" class="secondary">Cancel</button>
              <span id="edit-status" class="status" role="status" aria-live="polite"></span>
            </div>
          </form>
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
        const bootstrap = bootstrapScript ? JSON.parse(bootstrapScript.textContent || "{}") : {};
        const infoLine = document.getElementById("info-line");
        const usersBody = document.getElementById("users-body");
        const usersEmpty = document.getElementById("users-empty");
        const actionsHeader = document.getElementById("actions-header");
        const formSection = document.getElementById("create-form-section");
        const form = document.getElementById("create-user-form");
        const formStatus = document.getElementById("form-status");
        const notAdminNote = document.getElementById("not-admin-note");
        const editFormSection = document.getElementById("edit-form-section");
        const editForm = document.getElementById("edit-user-form");
        const editStatus = document.getElementById("edit-status");
        const editNameInput = document.getElementById("edit-name");
        const editEmailInput = document.getElementById("edit-email");
        const editRoleSelect = document.getElementById("edit-role");
        const editPasswordInput = document.getElementById("edit-password");
        const cancelEditButton = document.getElementById("cancel-edit");

        const state = {
          organizationId: bootstrap.organization ? bootstrap.organization.id : null,
          isAdmin: Boolean(bootstrap.organization?.isAdmin),
          users: [],
          editingUserId: null,
        };

        function logButton(action) {
          console.log("[UserMgmt] Button pressed:", action);
        }

        function formatTimestamp(value) {
          if (typeof value !== "string" || value.length === 0) {
            return null;
          }
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return null;
          }
          try {
            return date.toLocaleString();
          } catch {
            return date.toISOString();
          }
        }

        async function callApi(url, init) {
          const method = (init?.method ?? "GET").toUpperCase();
          console.log("[UserMgmt] API request:", method, url);
          try {
            const response = await fetch(url, init);
            console.log("[UserMgmt] API response:", method, url, "->", response.status);
            return response;
          } catch (error) {
            console.error("[UserMgmt] API error:", method, url, error);
            throw error;
          }
        }

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

        function getInputValue(input) {
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            return input.value.trim();
          }
          if (input instanceof HTMLSelectElement) {
            return input.value.trim();
          }
          return "";
        }

        function setInputValue(input, value) {
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            input.value = value ?? "";
          } else if (input instanceof HTMLSelectElement) {
            input.value = value ?? "";
          }
        }

        function getEditingUser() {
          if (!state.editingUserId) {
            return null;
          }
          return state.users.find((candidate) => candidate.id === state.editingUserId) ?? null;
        }

        function exitEditMode() {
          state.editingUserId = null;
          if (editForm instanceof HTMLFormElement) {
            editForm.reset();
          }
          if (editFormSection) {
            editFormSection.hidden = true;
          }
          if (editStatus) {
            updateStatus(editStatus, "");
          }
        }

        function syncEditForm() {
          if (!state.isAdmin || !editFormSection) {
            return;
          }

          const editingUser = getEditingUser();
          if (!editingUser) {
            exitEditMode();
            return;
          }

          editFormSection.hidden = false;
          setInputValue(editNameInput, editingUser.name ?? "");
          setInputValue(editEmailInput, editingUser.email ?? "");
          setInputValue(editRoleSelect, editingUser.role ?? "member");
          setInputValue(editPasswordInput, "");
          if (editStatus) {
            updateStatus(editStatus, "");
          }
        }

        function beginEdit(user) {
          logButton("Edit user " + (user.email || user.id));
          state.editingUserId = user.id;
          syncEditForm();
        }

        function renderUsers(users) {
          if (!usersBody || !usersEmpty) {
            return;
          }

          state.users = Array.isArray(users) ? [...users] : [];
          usersBody.innerHTML = "";

          if (!users.length) {
            usersEmpty.hidden = false;
            if (state.editingUserId) {
              exitEditMode();
            }
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

            const actionsCell = document.createElement("td");
            actionsCell.className = "actions-cell";

            if (state.isAdmin) {
              const editButton = document.createElement("button");
              editButton.type = "button";
              editButton.textContent = "Edit";
              editButton.addEventListener("click", () => {
                beginEdit(user);
              });
              actionsCell.appendChild(editButton);

              const removeButton = document.createElement("button");
              removeButton.type = "button";
              removeButton.textContent = "Remove";
              removeButton.className = "danger";
              removeButton.addEventListener("click", async () => {
                logButton("Remove user " + (user.email || user.id));
                const confirmRemove = window.confirm("Remove " + user.name + " from the organization?");
                if (!confirmRemove) {
                  return;
                }
                try {
                  const response = await callApi("/api/users/" + encodeURIComponent(user.id), {
                    method: "DELETE",
                    credentials: "include",
                  });
                  if (!response.ok && response.status !== 404) {
                    throw new Error("Failed with status " + response.status);
                  }
                  if (state.editingUserId === user.id) {
                    exitEditMode();
                  }
                  updateStatus(infoLine, user.name + " removed.", "success");
                  await loadUsers();
                } catch (error) {
                  console.error("Failed to remove user", error);
                  updateStatus(infoLine, "Could not remove user. Try again.", "error");
                }
              });
              actionsCell.appendChild(removeButton);
            } else {
              actionsCell.textContent = "—";
            }

            row.appendChild(actionsCell);
            usersBody.appendChild(row);
          });

          if (state.editingUserId) {
            syncEditForm();
          }
        }

        async function loadUsers(displayStatus = true) {
          if (!state.organizationId) {
            return;
          }

          if (displayStatus) {
            updateStatus(infoLine, "Loading members...", "info");
          }

          try {
            const response = await callApi("/api/users", {
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
            const visibleCountHeader = response.headers.get("x-users-visible-count");
            const totalCountHeader = response.headers.get("x-users-total-count");
            const listHitsHeader = response.headers.get("x-users-list-hits");
            const lastListAtHeader = response.headers.get("x-users-last-list-at");
            const mutationHeader = response.headers.get("x-users-last-mutation-at");
            const filtered = users.filter((user) =>
              Array.isArray(user.organizations) &&
              user.organizations.some((org) => org.id === state.organizationId)
            );
            renderUsers(filtered);

            if (displayStatus) {
              const suffix = filtered.length === 1 ? "" : "s";
              const parts = [];
              if (listHitsHeader) {
                parts.push("request #" + listHitsHeader);
              }
              const visibleLabel = visibleCountHeader ?? totalCountHeader;
              if (visibleLabel) {
                parts.push(visibleLabel + " visible");
              }
              const listedAt = formatTimestamp(lastListAtHeader);
              if (listedAt) {
                parts.push("listed " + listedAt);
              }
              const lastMutation = formatTimestamp(mutationHeader);
              if (lastMutation) {
                parts.push("last change " + lastMutation);
              }
              const detailSuffix = parts.length ? " (" + parts.join("; ") + ")" : "";
              updateStatus(
                infoLine,
                "Loaded " + filtered.length + " user" + suffix + "." + detailSuffix,
                "success",
              );
            }
          } catch (error) {
            console.error("Failed to load users", error);
            updateStatus(infoLine, "We couldn't load users right now. Please try again shortly.", "error");
          }
        }

        async function handleEditSubmit(event) {
          event.preventDefault();

          if (!state.isAdmin) {
            return;
          }

          const editingUser = getEditingUser();
          if (!editingUser) {
            updateStatus(editStatus, "Select a user to edit first.", "error");
            return;
          }

          logButton("Save changes for user " + (editingUser.email || editingUser.id));
          const name = getInputValue(editNameInput);
          const email = getInputValue(editEmailInput).toLowerCase();
          const role = getInputValue(editRoleSelect) || editingUser.role;
          const password = getInputValue(editPasswordInput);

          if (!name) {
            updateStatus(editStatus, "Name is required.", "error");
            return;
          }

          if (!email) {
            updateStatus(editStatus, "Email is required.", "error");
            return;
          }

          const payload: Record<string, unknown> = {};
          if (name !== editingUser.name) {
            payload.name = name;
          }
          if (email !== editingUser.email) {
            payload.email = email;
          }
          if (role && role !== editingUser.role) {
            payload.role = role;
          }
          if (password) {
            payload.password = password;
          }

          if (Object.keys(payload).length === 0) {
            updateStatus(editStatus, "No changes to save.", "error");
            return;
          }

          updateStatus(editStatus, "Saving changes...", "info");

          try {
            const response = await callApi("/api/users/" + encodeURIComponent(editingUser.id), {
              method: "PATCH",
              headers: {
                "content-type": "application/json",
                "x-svc-user-management-action": "user_management:update_user",
              },
              credentials: "include",
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const message = await response.json().catch(() => null);
              const text = message?.message ?? "Failed with status " + response.status;
              throw new Error(text);
            }

            updateStatus(infoLine, "User updated.", "success");
            exitEditMode();
            await loadUsers();
          } catch (error) {
            console.error("Failed to update user", error);
            updateStatus(
              editStatus,
              error instanceof Error ? error.message : "Unable to update user.",
              "error",
            );
          }
        }

        async function handleCreate(event) {
          event.preventDefault();
          logButton("Add user submit");

          if (!state.organizationId) {
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
            const response = await callApi("/api/users", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-svc-user-management-action": "user_management:add_user",
              },
              credentials: "include",
              body: JSON.stringify({
                name,
                email,
                role,
                organization_ids: [state.organizationId],
              }),
            });

            if (!response.ok) {
              const message = await response.json().catch(() => null);
              const text = message?.message ?? "Failed with status " + response.status;
              throw new Error(text);
            }

            form.reset();
            updateStatus(formStatus, "User added.", "success");
            await loadUsers();
          } catch (error) {
            console.error("Failed to create user", error);
            updateStatus(
              formStatus,
              error instanceof Error ? error.message : "Unable to create user.",
              "error",
            );
          }
        }

        if (!state.organizationId) {
          updateStatus(infoLine, "You are not assigned to an organization yet.", "error");
          if (formSection) {
            formSection.hidden = true;
          }
          if (actionsHeader) {
            actionsHeader.hidden = true;
          }
          if (editFormSection) {
            editFormSection.hidden = true;
          }
          if (usersBody) {
            usersBody.innerHTML = "";
          }
          return;
        }

        if (!state.isAdmin) {
          if (formSection) {
            formSection.hidden = true;
          }
          if (actionsHeader) {
            actionsHeader.hidden = true;
          }
          if (editFormSection) {
            editFormSection.hidden = true;
          }
          if (notAdminNote) {
            notAdminNote.hidden = false;
          }
          exitEditMode();
        } else if (notAdminNote) {
          notAdminNote.hidden = true;
        }

        loadUsers();

        if (form instanceof HTMLFormElement) {
          form.addEventListener("submit", handleCreate);
        }

        if (editForm instanceof HTMLFormElement) {
          editForm.addEventListener("submit", handleEditSubmit);
        }

        if (cancelEditButton instanceof HTMLButtonElement) {
          cancelEditButton.addEventListener("click", (event) => {
            event.preventDefault();
            logButton("Cancel edit");
            exitEditMode();
          });
        }
      })();
    </script>
  </body>
</html>`;
}

export async function renderServiceWorkspace(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const serviceId = url.pathname.replace(/^\/services\//, "").replace(/\/+$/, "");

  if (!serviceId) {
    return redirectResponse("/", 303);
  }

  let session = await getAuthenticatedSession(request);
  if (!session) {
    return redirectResponse("/", 303);
  }

  const user = await getUserById(session.user_id);
  if (!user) {
    return redirectResponse("/", 303);
  }

  const selectedOrganizationId =
    session.organization_id ?? (user.organizations.length === 1 ? user.organizations[0].id : null);
  if (!selectedOrganizationId) {
    return redirectResponse("/", 303);
  }

  const selectedOrganization = user.organizations.find(
    (organization) => organization.id === selectedOrganizationId,
  );
  if (!selectedOrganization) {
    return redirectResponse("/", 303);
  }

  if (session.organization_id !== selectedOrganizationId) {
    session = await ensureSessionOrganization(session, selectedOrganizationId);
    logger.info("[UserMgmt] Session organization aligned", {
      userId: session.user_id,
      organizationId: selectedOrganizationId,
    });
  }

  const services = await listServicesForOrganizations([selectedOrganizationId]);
  const service = services.find((entry) => entry.id === serviceId);

  if (!service) {
    return new Response(renderServiceNotFoundHtml(serviceId), {
      status: 404,
      headers: htmlHeaders,
    });
  }

  const organizationName = selectedOrganization.name;

  let html: string;

  if (service.service_type === "user_management") {
    const organization = {
      id: selectedOrganization.id,
      name: selectedOrganization.name,
      isAdmin: user.role === "admin" || user.role === "organization_admin",
    };

    logger.info("[UserMgmt] Rendering service workspace", {
      serviceId,
      organizationId: organization.id,
      userId: session.user_id,
    });

    html = renderUserManagementServiceHtml({
      serviceName: service.name,
      description: service.description ?? "Manage organization users and access.",
      organization,
    });
  } else {
    html = renderGenericServiceHtml({
      serviceName: service.name,
      description: service.description ?? "No description provided yet.",
      status: service.status,
      organizationNames: organizationName,
    });
  }

  return new Response(html, { status: 200, headers: htmlHeaders });
}
