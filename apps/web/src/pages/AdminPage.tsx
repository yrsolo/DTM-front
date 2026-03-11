import React from "react";

import { LayoutContext } from "../components/Layout";
import { getAuthRequestBase } from "../config/runtimeContour";

type AdminOverview = {
  pendingUsers: Array<{
    id: string;
    email: string | null;
    displayName: string | null;
    status: string;
    role: string;
  }>;
  allowlist: Array<{
    email: string;
    source: string;
    comment: string | null;
    createdAt: string;
  }>;
  openRequests: Array<{
    id: string;
    userId: string;
    email: string | null;
    requestedAt: string;
  }>;
};

function buildAuthUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

export function AdminPage() {
  const ctx = React.useContext(LayoutContext);
  const [overview, setOverview] = React.useState<AdminOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [newEmail, setNewEmail] = React.useState("");

  const authSession = ctx?.authSession;

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildAuthUrl("/admin/overview"), {
        credentials: "include",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setOverview((await res.json()) as AdminOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const approve = React.useCallback(
    async (userId: string) => {
      await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/approve`), {
        method: "POST",
        credentials: "include",
      });
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const block = React.useCallback(
    async (userId: string) => {
      await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/block`), {
        method: "POST",
        credentials: "include",
      });
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const addAllowlistEmail = React.useCallback(async () => {
    if (!newEmail.trim()) return;
    await fetch(buildAuthUrl("/admin/allowlist"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    setNewEmail("");
    await loadOverview();
  }, [loadOverview, newEmail]);

  const removeAllowlistEmail = React.useCallback(
    async (email: string) => {
      await fetch(`${buildAuthUrl("/admin/allowlist")}?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
        credentials: "include",
      });
      await loadOverview();
    },
    [loadOverview]
  );

  if (!ctx) return null;

  if (!authSession?.state.authenticated || authSession.state.user?.role !== "admin") {
    return (
      <div className="card">
        <div className="pageHeader">
          <h3 className="pageTitle">Admin</h3>
        </div>
        <p className="muted">????????? ?????? ??????????????.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="pageHeader">
        <h3 className="pageTitle">Admin</h3>
      </div>

      {loading ? <p className="muted">????????...</p> : null}
      {error ? <p className="muted">{error}</p> : null}

      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="card">
          <h4 className="pageTitle" style={{ fontSize: 22 }}>Pending users</h4>
          <div style={{ display: "grid", gap: 10 }}>
            {(overview?.pendingUsers ?? []).map((user) => (
              <div key={user.id} className="tableRowGhost">
                <div><strong>{user.displayName || user.email || user.id}</strong></div>
                <div className="muted">{user.email || "email hidden"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn" type="button" onClick={() => void approve(user.id)}>Approve</button>
                  <button className="btn btnGhost" type="button" onClick={() => void block(user.id)}>Block</button>
                </div>
              </div>
            ))}
            {!overview?.pendingUsers?.length ? <div className="muted">??? ????????? ?????????????.</div> : null}
          </div>
        </div>

        <div className="card">
          <h4 className="pageTitle" style={{ fontSize: 22 }}>Allowlist</h4>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="input"
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <button className="btn" type="button" onClick={() => void addAllowlistEmail()}>
              Add
            </button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {(overview?.allowlist ?? []).map((entry) => (
              <div key={entry.email} className="tableRowGhost" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div><strong>{entry.email}</strong></div>
                  <div className="muted">{entry.comment || entry.source}</div>
                </div>
                <button className="btn btnGhost" type="button" onClick={() => void removeAllowlistEmail(entry.email)}>
                  Remove
                </button>
              </div>
            ))}
            {!overview?.allowlist?.length ? <div className="muted">Allowlist ????.</div> : null}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h4 className="pageTitle" style={{ fontSize: 22 }}>Open requests</h4>
        <div style={{ display: "grid", gap: 10 }}>
          {(overview?.openRequests ?? []).map((request) => (
            <div key={request.id} className="tableRowGhost">
              <div><strong>{request.email || request.userId}</strong></div>
              <div className="muted">{request.requestedAt}</div>
            </div>
          ))}
          {!overview?.openRequests?.length ? <div className="muted">??? ???????? ??????.</div> : null}
        </div>
      </div>
    </div>
  );
}
