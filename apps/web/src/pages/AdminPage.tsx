import React from "react";

import { LayoutContext } from "../components/Layout";
import { getAuthRequestBase, getTasksRoute } from "../config/runtimeContour";

type AdminUserCard = {
  id: string;
  yandexUid: string;
  email: string | null;
  displayName: string | null;
  status: string;
  role: string;
  requestedAt: string;
  avatarUrl: string | null;
};

type PresetCard = {
  id: string;
  kind: "color" | "layout";
  name: string;
  description: string | null;
  authorDisplayName: string | null;
  storageUrl: string;
  revision: number | null;
  updatedAt: string | null;
  canEdit: boolean;
  isDefault: boolean;
  availability: "ready" | "broken" | "unavailable";
};

function PresetKindBadge(props: { kind: "color" | "layout" }) {
  if (props.kind === "color") {
    return <span className="adminPresetKindBadge isColor" aria-hidden="true" />;
  }
  return (
    <span className="adminPresetKindBadge isLayout" aria-hidden="true">
      ⤢
    </span>
  );
}

type AdminOverview = {
  pendingUsers: AdminUserCard[];
  approvedUsers: AdminUserCard[];
  allowlist: Array<{
    email: string;
    source: string;
    comment: string | null;
    createdAt: string;
  }>;
  presets: {
    color: PresetCard[];
    layout: PresetCard[];
    defaults: {
      color: string | null;
      layout: string | null;
    };
  };
};

function buildAuthUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

function goToTimeline(): void {
  if (typeof window === "undefined") return;
  window.location.assign(getTasksRoute());
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

function UserAvatar(props: { name: string | null; email: string | null; avatarUrl: string | null }) {
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

async function expectOk(res: Response, message: string): Promise<void> {
  if (res.ok) return;
  throw new Error(`${message} (HTTP ${res.status})`);
}

export function AdminPage() {
  const ctx = React.useContext(LayoutContext);
  const [overview, setOverview] = React.useState<AdminOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);
  const [newEmail, setNewEmail] = React.useState("");
  const [pendingImportKind, setPendingImportKind] = React.useState<"color" | "layout">("color");
  const importRef = React.useRef<HTMLInputElement | null>(null);

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
      await expectOk(res, "Не удалось загрузить данные админки");
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

  const runAdminAction = React.useCallback(async (action: () => Promise<void>, notice?: string) => {
    setActionError(null);
    if (notice) setActionNotice(null);
    try {
      await action();
      if (notice) setActionNotice(notice);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Операция не выполнена");
    }
  }, []);

  const approve = React.useCallback(
    async (userId: string) => {
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/approve`), {
        method: "POST",
        credentials: "include",
      });
      await expectOk(res, "Не удалось одобрить пользователя");
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const reject = React.useCallback(
    async (userId: string) => {
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/reject`), {
        method: "POST",
        credentials: "include",
      });
      await expectOk(res, "Не удалось отклонить заявку");
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const revoke = React.useCallback(
    async (userId: string) => {
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/revoke`), {
        method: "POST",
        credentials: "include",
      });
      await expectOk(res, "Не удалось удалить пользователя из одобренных");
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const makeAdmin = React.useCallback(
    async (userId: string) => {
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/make-admin`), {
        method: "POST",
        credentials: "include",
      });
      await expectOk(res, "Не удалось назначить администратора");
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const removeAdmin = React.useCallback(
    async (userId: string) => {
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/remove-admin`), {
        method: "POST",
        credentials: "include",
      });
      await expectOk(res, "Не удалось снять права администратора");
      await loadOverview();
      await authSession?.reload();
    },
    [authSession, loadOverview]
  );

  const addAllowlistEmail = React.useCallback(async () => {
    if (!newEmail.trim()) return;
    const res = await fetch(buildAuthUrl("/admin/allowlist"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    await expectOk(res, "Не удалось добавить email в allowlist");
    setNewEmail("");
    await loadOverview();
  }, [loadOverview, newEmail]);

  const removeAllowlistEmail = React.useCallback(
    async (email: string) => {
      const res = await fetch(`${buildAuthUrl("/admin/allowlist")}?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
        credentials: "include",
      });
      await expectOk(res, "Не удалось удалить email из allowlist");
      await loadOverview();
    },
    [loadOverview]
  );

  const toggleAdminRole = React.useCallback(
    async (user: AdminUserCard) => {
      if (user.role === "admin") {
        await removeAdmin(user.id);
        return;
      }
      await makeAdmin(user.id);
    },
    [makeAdmin, removeAdmin]
  );

  const deletePreset = React.useCallback(
    async (presetId: string) => {
      const res = await fetch(buildAuthUrl(`/presets/${encodeURIComponent(presetId)}`), {
        method: "DELETE",
        credentials: "include",
      });
      await expectOk(res, "Не удалось удалить preset");
      await loadOverview();
    },
    [loadOverview]
  );

  const setDefaultPreset = React.useCallback(
    async (preset: PresetCard) => {
      const res = await fetch(buildAuthUrl(`/presets/${encodeURIComponent(preset.id)}/set-default`), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: preset.kind }),
      });
      await expectOk(res, "Не удалось назначить preset по умолчанию");
      await loadOverview();
    },
    [loadOverview]
  );

  const exportPreset = React.useCallback(async (preset: PresetCard) => {
    const res = await fetch(buildAuthUrl(`/presets/${encodeURIComponent(preset.id)}/export`), {
      credentials: "include",
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    await expectOk(res, "Не удалось экспортировать preset");
    const payload = (await res.json()) as { payload?: unknown };
    const blob = new Blob([JSON.stringify(payload.payload ?? {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${preset.kind}-${preset.name.replace(/\s+/g, "-").toLowerCase() || "preset"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const importPreset = React.useCallback(
    async (file: File, kind: "color" | "layout") => {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const name = window.prompt(
        kind === "color" ? "Название импортируемого цветового пресета" : "Название импортируемого layout-пресета",
        file.name.replace(/\.json$/i, "")
      );
      if (!name?.trim()) return;
      const payload =
        kind === "color"
          ? { keyColors: parsed.keyColors && typeof parsed.keyColors === "object" ? parsed.keyColors : parsed }
          : { design: parsed.design && typeof parsed.design === "object" ? parsed.design : parsed };

      const res = await fetch(buildAuthUrl("/presets/import"), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, name: name.trim(), payload }),
      });
      await expectOk(res, "Не удалось импортировать preset");
      await loadOverview();
    },
    [loadOverview]
  );

  if (!ctx) return null;

  if (loading) {
    return (
      <div className="card">
        <div className="pageHeader">
          <h3 className="pageTitle">Админка</h3>
          <button type="button" className="adminCloseButton" onClick={goToTimeline} aria-label="Вернуться на таймлайн" title="Вернуться на таймлайн">
            ×
          </button>
        </div>
        <p className="muted">Загружаем данные доступа, пользователей и preset catalog...</p>
      </div>
    );
  }

  if (!authSession?.state.authenticated) {
    return (
      <div className="card">
        <div className="pageHeader">
          <h3 className="pageTitle">Админка</h3>
          <button type="button" className="adminCloseButton" onClick={goToTimeline} aria-label="Вернуться на таймлайн" title="Вернуться на таймлайн">
            ×
          </button>
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
          <button type="button" className="adminCloseButton" onClick={goToTimeline} aria-label="Вернуться на таймлайн" title="Вернуться на таймлайн">
            ×
          </button>
        </div>
        <p className="muted">У вашей учётной записи нет прав администратора.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="pageHeader">
        <h3 className="pageTitle">Админка</h3>
        <button type="button" className="adminCloseButton" onClick={goToTimeline} aria-label="Вернуться на таймлайн" title="Вернуться на таймлайн">
          ×
        </button>
      </div>

      {error ? <p className="muted">{error}</p> : null}
      {actionError ? <p className="muted" style={{ color: "#ffb8c8" }}>{actionError}</p> : null}
      {actionNotice ? <p className="muted" style={{ color: "#9fe8c4" }}>{actionNotice}</p> : null}

      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="card">
          <h4 className="pageTitle" style={{ fontSize: 22 }}>Ожидают одобрения</h4>
          <div className="adminUserGrid adminUserGridTiles">
            {(overview?.pendingUsers ?? []).map((user) => (
              <div key={user.id} className="adminUserCard adminUserBrick">
                <UserAvatar name={user.displayName} email={user.email} avatarUrl={user.avatarUrl} />
                <div className="adminUserBody">
                  <div className="adminUserName">{user.displayName || user.email || user.id}</div>
                  <div className="muted">{user.email || "Email не указан"}</div>
                  <div className="muted">Заявка: {formatRequestedAt(user.requestedAt)}</div>
                </div>
                <div className="adminUserActions">
                  <button type="button" onClick={() => void runAdminAction(() => approve(user.id), "Пользователь одобрен")}>
                    Одобрить
                  </button>
                  <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => reject(user.id), "Заявка отклонена")}>
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
            {!overview?.pendingUsers?.length ? <div className="muted">Нет пользователей, ожидающих одобрения.</div> : null}
          </div>
        </div>

        <div className="card">
          <h4 className="pageTitle" style={{ fontSize: 22 }}>Одобренные пользователи</h4>
          <div className="adminUserGrid adminUserGridTiles">
            {(overview?.approvedUsers ?? []).map((user) => {
              const isSelf = authSession.state.user?.id === user.id;
              const isAdmin = user.role === "admin";
              return (
                <div key={user.id} className="adminUserCard adminUserBrick">
                  <UserAvatar name={user.displayName} email={user.email} avatarUrl={user.avatarUrl} />
                  <div className="adminUserBody">
                    <div className="adminUserName">{user.displayName || user.email || user.id}</div>
                    <div className="muted">{user.email || "Email не указан"}</div>
                    <div className="muted">Заявка: {formatRequestedAt(user.requestedAt)}</div>
                    <div className={`adminUserRole ${isAdmin ? "isAdmin" : ""}`}>{isAdmin ? "Администратор" : "Пользователь"}</div>
                  </div>
                  <div className="adminUserActions">
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => void runAdminAction(() => revoke(user.id), "Пользователь удалён из одобренных")}
                      disabled={isSelf}
                    >
                      Удалить
                    </button>
                    <button
                      type="button"
                      className={`btn ${isAdmin ? "btnGhost" : ""}`}
                      onClick={() => void runAdminAction(() => toggleAdminRole(user), isAdmin ? "Админ-роль снята" : "Админ-роль назначена")}
                      disabled={isSelf}
                    >
                      {isAdmin ? "Убрать из админов" : "Сделать админом"}
                    </button>
                  </div>
                </div>
              );
            })}
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
            onChange={(event) => setNewEmail(event.target.value)}
          />
          <button type="button" onClick={() => void runAdminAction(addAllowlistEmail, "Email добавлен в allowlist")}>
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
              <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => removeAllowlistEmail(entry.email), "Email удалён из allowlist")}>
                Удалить
              </button>
            </div>
          ))}
          {!overview?.allowlist?.length ? <div className="muted">Allowlist пуст.</div> : null}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="pageHeader" style={{ marginBottom: 12 }}>
          <h4 className="pageTitle" style={{ fontSize: 22 }}>Пресеты</h4>
        </div>

        <div className="adminPresetToolbar">
          <button
            type="button"
            className="btn btnGhost"
            onClick={() => {
              setPendingImportKind("color");
              importRef.current?.click();
            }}
          >
            Импортировать color preset
          </button>
          <button
            type="button"
            className="btn btnGhost"
            onClick={() => {
              setPendingImportKind("layout");
              importRef.current?.click();
            }}
          >
            Импортировать layout preset
          </button>
        </div>

        <div className="grid2" style={{ alignItems: "start" }}>
          {(["color", "layout"] as const).map((kind) => (
            <div key={kind} className="card">
              <h4 className="pageTitle" style={{ fontSize: 20 }}>
                {kind === "color" ? "Цветовые пресеты" : "UI / Layout пресеты"}
              </h4>
              <div className="adminUserGrid adminPresetGrid">
                {(overview?.presets?.[kind] ?? []).map((preset) => (
                  <div key={preset.id} className="adminUserCard adminUserBrick adminPresetBrick">
                    <PresetKindBadge kind={kind} />
                    <div className="adminUserBody">
                      <div className="adminUserName">{preset.name}</div>
                      <div className="muted">{preset.description || "Без описания"}</div>
                      <div className="muted">Автор: {preset.authorDisplayName || "не указан"}</div>
                      <div className="muted">Revision: {preset.revision ?? "-"}</div>
                      <div className="muted">Обновлён: {preset.updatedAt ? formatRequestedAt(preset.updatedAt) : "-"}</div>
                      <div className={`adminUserRole ${preset.isDefault ? "isAdmin" : ""}`}>
                        {preset.isDefault ? "По умолчанию" : preset.availability === "ready" ? "Доступен" : preset.availability === "broken" ? "Broken asset" : "Asset недоступен"}
                      </div>
                    </div>
                    <div className="adminUserActions">
                      <button type="button" onClick={() => void runAdminAction(() => setDefaultPreset(preset), "Preset по умолчанию обновлён")}>
                        Сделать default
                      </button>
                      <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => exportPreset(preset), "Preset экспортирован")}>
                        Экспорт
                      </button>
                      <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => deletePreset(preset.id), "Preset удалён")}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
                {!overview?.presets?.[kind]?.length ? <div className="muted">Пока нет preset-ов этого типа.</div> : null}
              </div>
            </div>
          ))}
        </div>

        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void runAdminAction(() => importPreset(file, pendingImportKind), "Preset импортирован");
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
