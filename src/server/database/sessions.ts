import { fissionRequest } from "./client";

export type SessionRecord = {
  token_hash: string;
  user_id: string;
  organization_id: string | null;
  issued_at: string;
  expires_at: string;
};

export async function createSession(record: SessionRecord) {
  await fissionRequest("/tessaro/sessions", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export async function getSession(tokenHash: string): Promise<SessionRecord | null> {
  const { status, data } = await fissionRequest<SessionRecord>(
    `/tessaro/sessions/${encodeURIComponent(tokenHash)}`,
    { method: "GET", acceptStatuses: [404] },
  );

  return status === 404 ? null : data;
}

export async function replaceSession(record: SessionRecord) {
  await fissionRequest(`/tessaro/sessions/${encodeURIComponent(record.token_hash)}`, {
    method: "PUT",
    body: JSON.stringify(record),
  });
}

export async function deleteSession(tokenHash: string) {
  await fissionRequest(`/tessaro/sessions/${encodeURIComponent(tokenHash)}`, {
    method: "DELETE",
    acceptStatuses: [404],
  });
}
