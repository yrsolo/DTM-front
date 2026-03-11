import React from "react";

import { LayoutContext } from "../components/Layout";
import { getAuthRequestBase } from "../config/runtimeContour";

type AdminOverview = {
  pendingUsers: Array<{
    id: string;
    yandexUid: string;
    email: string | null;
    displayName: string | null;
    status: string;
    role: string;
    requestedAt: string;
    avatarUrl: string;
  }>;
  approvedUsers: Array<{
    id: string;
    yandexUid: string;
    email: string | null;
    displayName: string | null;
    status: string;
    role: string;
    requestedAt: string;
    avatarUrl: string;
  }>;
  allowlist: Array<{
    email: string;
    source: string;
    comment: string | null;
    createdAt: string;
  }>;
};

function buildAuthUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

function formatRequestedAt(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${min}`;
}

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function UserAvatar(props: { name: string | null; email: string | null; avatarUrl: string }) {
  const [failed, setFailed] = React.useState(false);

  if (failed || !props.avatarUrl) {
    return <div className="adminUserAvatar adminUserAvatarFallback">{initials(props.name, props.email)}</div>;
  }

  return (
    <img
      className="adminUserAvatar"
      src={props.avatarUrl}
      alt={props.name || props.email || "User avatar"}
      onError={() => setFailed(true)}
    />
  );
}

export function AdminPage() {
  const ctx = React.useContext(LayoutContext);
  const [overview, setOverview] = React.useState<AdminOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [newEmail, setNewEmail] = React.useState("");

  const authSession = ctx?.authSession;

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const res = await fetch(buildAuthUrl("/admin/overview"), {
        credentials: "include",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Не удалось загрузить данные админки (HTTP ${res.status})`);
      }
      setOverview((await res.json()) as AdminOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные админки");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const approve = React.useCallback(
    async (userId: string) => {
      setActionError(null);
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/approve`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Не удалось одобрить пользователя (HTTP ${res.status})`);
      }
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const block = React.useCallback(
    async (userId: string) => {
      setActionError(null);
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/block`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Не удалось заблокировать пользователя (HTTP ${res.status})`);
      }
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const addAllowlistEmail = React.useCallback(async () => {
    if (!newEmail.trim()) return;
    setActionError(null);
    const res = await fetch(buildAuthUrl("/admin/allowlist"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    if (!res.ok) {
      throw new Error(`Не удалось добавить email в allowlist (HTTP ${res.status})`);
    }
    setNewEmail("");
    await loadOverview();
  }, [loadOverview, newEmail]);

  const removeAllowlistEmail = React.useCallback(
    async (email: string) => {
      setActionError(null);
      const res = await fetch(`${buildAuthUrl("/admin/allowlist")}?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Не удалось удалить email из allowlist (HTTP ${res.status})`);
      }
      await loadOverview();
    },
    [loadOverview]
  );

  const reject = React.useCallback(
    async (userId: string) => {
      setActionError(null);
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/reject`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Не удалось отклонить заявку (HTTP ${res.status})`);
      }
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const revoke = React.useCallback(
    async (userId: string) => {
      setActionError(null);
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/revoke`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Не удалось удалить пользователя из одобренных (HTTP ${res.status})`);
      }
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const makeAdmin = React.useCallback(
    async (userId: string) => {
      setActionError(null);
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/make-admin`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Не удалось назначить администратора (HTTP ${res.status})`);
      }
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const removeAdmin = React.useCallback(
    async (userId: string) => {
      setActionError(null);
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/remove-admin`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Не удалось снять права администратора (HTTP ${res.status})`);
      }
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const runAdminAction = React.useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Операция не выполнена");
    }
  }, []);

  if (!ctx) return null;

  if (loading) {
    return (
      <div className="card">
        <div className="pageHeader">
          <h3 className="pageTitle">Админка</h3>
        </div>
        <p className="muted">Загружаем данные доступа и списки пользователей...</p>
      </div>
    );
  }

  if (!authSession?.state.authenticated) {
    return (
      <div className="card">
        <div className="pageHeader">
          <h3 className="pageTitle">Админка</h3>
        </div>
        <p className="muted">Войдите через Яндекс, чтобы открыть админку.</p>
      </div>
    );
  }

  if (authSession.state.user?.role !== "admin") {
    return (
      <div className="card">
        <div className="pageHeader">
          <h3 className="pageTitle">Админка</h3>
        </div>
        <p className="muted">У вашей учётной записи нет прав администратора.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="pageHeader">
        <h3 className="pageTitle">Админка</h3>
      </div>

      {error ? <p className="muted">{error}</p> : null}
      {actionError ? <p className="muted" style={{ color: "#ffb8c8" }}>{actionError}</p> : null}

      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="card">
          <h4 className="pageTitle" style={{ fontSize: 22 }}>Ожидают одобрения</h4>
          <div className="adminUserGrid">
            {(overview?.pendingUsers ?? []).map((user) => (
              <div key={user.id} className="adminUserCard">
                <UserAvatar name={user.displayName} email={user.email} avatarUrl={user.avatarUrl} />
                <div className="adminUserBody">
                  <div className="adminUserName">{user.displayName || user.email || user.id}</div>
                  <div className="muted">{user.email || "Email не указан"}</div>
                  <div className="muted">Заявка: {formatRequestedAt(user.requestedAt)}</div>
                </div>
                <div className="adminUserActions">
                  <button className="btn" type="button" onClick={() => void runAdminAction(() => approve(user.id))}>Одобрить</button>
                  <button className="btn btnGhost" type="button" onClick={() => void runAdminAction(() => reject(user.id))}>Отклонить</button>
                </div>
              </div>
            ))}
            {!overview?.pendingUsers?.length ? <div className="muted">Нет пользователей, ожидающих одобрения.</div> : null}
          </div>
        </div>

        <div className="card">
          <h4 className="pageTitle" style={{ fontSize: 22 }}>Одобренные пользователи</h4>
          <div className="adminUserGrid">
            {(overview?.approvedUsers ?? []).map((user) => (
              <div key={user.id} className="adminUserCard">
                <UserAvatar name={user.displayName} email={user.email} avatarUrl={user.avatarUrl} />
                <div className="adminUserBody">
                  <div className="adminUserName">{user.displayName || user.email || user.id}</div>
                  <div className="muted">{user.email || "Email не указан"}</div>
                  <div className="muted">Заявка: {formatRequestedAt(user.requestedAt)}</div>
                  <div className="adminUserRole">
                    {user.role === "admin" ? "Администратор" : "Пользователь"}
                  </div>
                </div>
                <div className="adminUserActions">
                  <button
                    className="btn btnGhost"
                    type="button"
                    onClick={() => void runAdminAction(() => revoke(user.id))}
                    disabled={authSession.state.user?.id === user.id}
                  >
                    Удалить
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => void runAdminAction(() => makeAdmin(user.id))}
                    disabled={user.role === "admin"}
                  >
                    Сделать админом
                  </button>
                  <button
                    className="btn btnGhost"
                    type="button"
                    onClick={() => void runAdminAction(() => removeAdmin(user.id))}
                    disabled={user.role !== "admin" || authSession.state.user?.id === user.id}
                  >
                    Удалить из админов
                  </button>
                </div>
              </div>
            ))}
            {!overview?.approvedUsers?.length ? <div className="muted">Нет одобренных пользователей.</div> : null}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h4 className="pageTitle" style={{ fontSize: 22 }}>Allowlist</h4>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button className="btn" type="button" onClick={() => void runAdminAction(addAllowlistEmail)}>
            Добавить в allowlist
          </button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {(overview?.allowlist ?? []).map((entry) => (
            <div key={entry.email} className="tableRowGhost" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div><strong>{entry.email}</strong></div>
                <div className="muted">{entry.comment || entry.source}</div>
              </div>
              <button className="btn btnGhost" type="button" onClick={() => void runAdminAction(() => removeAllowlistEmail(entry.email))}>
                Удалить
              </button>
            </div>
          ))}
          {!overview?.allowlist?.length ? <div className="muted">Allowlist пуст.</div> : null}
        </div>
      </div>
    </div>
  );
}
