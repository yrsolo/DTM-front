import React from "react";
import { flushSync } from "react-dom";
import { TaskV1 } from "@dtm/schema/snapshot";
import { DesignersBoard } from "../components/DesignersBoard";
import { ErrorBanner } from "../components/ErrorBanner";
import { FiltersBar } from "../components/FiltersBar";
import { LayoutContext } from "../components/Layout";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { UnifiedTimeline } from "../gantt/UnifiedTimeline";
import { RenderTask } from "../gantt/types";
import { readMaskingMode, writeMaskingMode } from "../auth/maskingMode";
import { useElementWidth } from "../utils/useElementWidth";
import { toShortPersonName } from "../utils/personName";

const ZOOM_PRESETS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 6, 8, 10];
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const TIMELINE_PAGE_VIEW_KEY = "dtm.timeline.pageView.v1";
const PAGE_LABEL_TASKS = "\u0417\u0430\u0434\u0430\u0447\u0438";
const PAGE_LABEL_DESIGNERS = "\u0414\u0438\u0437\u0430\u0439\u043d\u0435\u0440\u044b";

type AuthPanelContent = {
  title: string;
  statusLabel: string;
  accessBadge: string;
  helpText: string;
  detailText: string;
  adminHint: string;
  primaryActionLabel: string;
  canOpenAdmin: boolean;
  canToggleMasking: boolean;
  maskingTitle: string;
  maskingHint: string;
};

function formatSessionCountdown(value: string | null, locale: "ru" | "en"): string | null {
  if (!value) return null;
  const expiresAt = new Date(value);
  if (!Number.isFinite(expiresAt.getTime())) return null;
  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) {
    return locale === "ru" ? "Истекла" : "Expired";
  }
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return locale === "ru" ? `${days} д ${hours} ч` : `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return locale === "ru" ? `${hours} ч ${minutes} мин` : `${hours}h ${minutes}m`;
  }
  return locale === "ru" ? `${Math.max(1, minutes)} мин` : `${Math.max(1, minutes)}m`;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M5.25 6V4.85a2.75 2.75 0 1 1 5.5 0V6h.65c.58 0 1.05.47 1.05 1.05v4.7c0 .58-.47 1.05-1.05 1.05H4.6c-.58 0-1.05-.47-1.05-1.05v-4.7C3.55 6.47 4.02 6 4.6 6h.65Zm1.2 0h3.1V4.85a1.55 1.55 0 1 0-3.1 0V6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 8.05a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Zm0 1.2c-2.52 0-4.85 1.19-4.85 2.75 0 .32.26.58.58.58h8.54c.32 0 .58-.26.58-.58 0-1.56-2.33-2.75-4.85-2.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function buildAuthPanelContent(params: {
  locale: "ru" | "en";
  loading: boolean;
  authenticated: boolean;
  accessMode: "masked" | "full";
  user: {
    displayName: string | null;
    email: string | null;
    role: "admin" | "viewer";
    status: "pending" | "approved" | "blocked";
  } | null;
  sessionKind: "yandex" | "telegram" | "temp_link" | null;
  expiresAt: string | null;
  temporaryAccessLabel: string | null;
  maskingForced: boolean;
  maskingLockedByAccess: boolean;
}): AuthPanelContent {
  const { locale, loading, authenticated, accessMode, user, sessionKind, expiresAt, temporaryAccessLabel, maskingForced, maskingLockedByAccess } = params;

  if (loading) {
    return {
      title: locale === "ru" ? "Проверяем доступ" : "Checking access",
      statusLabel: locale === "ru" ? "Проверка статуса" : "Checking status",
      accessBadge: locale === "ru" ? "Статус обновляется" : "Updating status",
      helpText: locale === "ru" ? "Панель покажет ваш статус, как только auth contour ответит." : "The panel will show your status as soon as the auth contour responds.",
      detailText: locale === "ru" ? "Если проверка затянулась, откройте панель ещё раз или обновите страницу." : "If the check takes too long, reopen the panel or refresh the page.",
      adminHint: locale === "ru" ? "Админка станет доступна после проверки роли." : "Admin will become available after role check.",
      primaryActionLabel: locale === "ru" ? "Обновить статус" : "Refresh status",
      canOpenAdmin: false,
      canToggleMasking: false,
      maskingTitle: locale === "ru" ? "Маскирование" : "Masking",
      maskingHint: locale === "ru" ? "Дождитесь завершения проверки доступа." : "Wait for the access check to finish.",
    };
  }

  if (!authenticated || !user) {
    return {
      title: locale === "ru" ? "Гость" : "Guest",
      statusLabel: locale === "ru" ? "Не авторизован" : "Not signed in",
      accessBadge: locale === "ru" ? "Маскирование включено" : "Masking enabled",
      helpText: locale === "ru" ? "Войдите, чтобы запросить или получить доступ." : "Sign in to request or get access.",
      detailText: locale === "ru" ? "Анонимный режим работает с маскированием. После входа статус доступа обновится здесь." : "Anonymous mode works with masking. After sign in your access status will appear here.",
      adminHint: locale === "ru" ? "Админка доступна только пользователям с ролью администратора." : "Admin is available only to administrator accounts.",
      primaryActionLabel: locale === "ru" ? "Войти через Яндекс" : "Sign in with Yandex",
      canOpenAdmin: false,
      canToggleMasking: false,
      maskingTitle: locale === "ru" ? "Маскирование" : "Masking",
      maskingHint: locale === "ru" ? "Маскирование определяется уровнем доступа и включено для гостя." : "Masking is defined by access level and is enabled for guests.",
    };
  }

  if (user.role === "admin") {
    return {
      title: user.displayName || user.email || (locale === "ru" ? "Администратор" : "Administrator"),
      statusLabel: locale === "ru" ? "Администратор" : "Administrator",
      accessBadge: locale === "ru" ? "Полный доступ" : "Full access",
      helpText: locale === "ru" ? "Доступны инструменты управления доступом." : "Access management tools are available.",
      detailText: locale === "ru" ? "Вы вошли как администратор. Отсюда можно открыть админку, управлять доступом и маскированием." : "You are signed in as an administrator. From here you can open admin, manage access and masking.",
      adminHint: locale === "ru" ? "У вас есть права на открытие админки." : "You have permission to open admin.",
      primaryActionLabel: locale === "ru" ? "Выйти" : "Sign out",
      canOpenAdmin: true,
      canToggleMasking: !maskingLockedByAccess,
      maskingTitle: locale === "ru" ? `Принудительная маскировка: ${maskingForced ? "вкл" : "выкл"}` : `Forced masking: ${maskingForced ? "on" : "off"}`,
      maskingHint: maskingLockedByAccess
        ? (locale === "ru" ? "Маскирование определяется уровнем доступа." : "Masking is defined by access level.")
        : (locale === "ru" ? "Во включённом режиме запросы к API отправляются без auth cookie." : "When enabled, API requests are sent without the auth cookie."),
    };
  }

  if (sessionKind === "temp_link") {
    const countdown = formatSessionCountdown(expiresAt, locale);
    const label = temporaryAccessLabel || user.displayName || (locale === "ru" ? "Временный доступ" : "Temporary access");
    return {
      title: label,
      statusLabel: locale === "ru" ? "Временная ссылка" : "Temporary link",
      accessBadge: locale === "ru" ? "Полный доступ" : "Full access",
      helpText: locale === "ru" ? "Сессия выдана временной ссылкой доступа." : "This session was granted by a temporary access link.",
      detailText:
        locale === "ru"
          ? `Ссылка даёт viewer-доступ без admin-прав.${countdown ? ` До окончания: ${countdown}.` : ""}`
          : `This link grants viewer access without admin rights.${countdown ? ` Time remaining: ${countdown}.` : ""}`,
      adminHint: locale === "ru" ? "Временная ссылка никогда не даёт доступ к админке." : "Temporary links never grant admin access.",
      primaryActionLabel: locale === "ru" ? "Выйти" : "Sign out",
      canOpenAdmin: false,
      canToggleMasking: !maskingLockedByAccess,
      maskingTitle: locale === "ru" ? `Принудительная маскировка: ${maskingForced ? "вкл" : "выкл"}` : `Forced masking: ${maskingForced ? "on" : "off"}`,
      maskingHint: maskingLockedByAccess
        ? (locale === "ru" ? "Маскирование определяется уровнем доступа." : "Masking is defined by access level.")
        : (locale === "ru" ? "Во включённом режиме запросы к API отправляются без auth cookie." : "When enabled, API requests are sent without the auth cookie."),
    };
  }

  if (user.status === "pending") {
    return {
      title: user.displayName || user.email || (locale === "ru" ? "Пользователь" : "User"),
      statusLabel: locale === "ru" ? "Ожидает одобрения" : "Pending approval",
      accessBadge: locale === "ru" ? "Маскирование включено" : "Masking enabled",
      helpText: locale === "ru" ? "Ожидается одобрение администратора." : "Administrator approval is pending.",
      detailText: locale === "ru" ? "Вы успешно вошли, но до подтверждения доступны только замаскированные данные." : "You are signed in, but only masked data is available until approval.",
      adminHint: locale === "ru" ? "Админка появится после назначения роли администратора." : "Admin will become available after an administrator role is granted.",
      primaryActionLabel: locale === "ru" ? "Выйти" : "Sign out",
      canOpenAdmin: false,
      canToggleMasking: false,
      maskingTitle: locale === "ru" ? "Маскирование определяется уровнем доступа" : "Masking is defined by access level",
      maskingHint: locale === "ru" ? "До одобрения принудительно доступен только masked mode." : "Until approval only masked mode is available.",
    };
  }

  return {
    title: user.displayName || user.email || (locale === "ru" ? "Пользователь" : "User"),
    statusLabel: locale === "ru" ? "Пользователь" : "User",
    accessBadge: accessMode === "full"
      ? (locale === "ru" ? "Полный доступ" : "Full access")
      : (locale === "ru" ? "Маскирование включено" : "Masking enabled"),
    helpText: locale === "ru" ? "Полный доступ получен, но прав администратора нет." : "Full access is granted, but you do not have administrator rights.",
    detailText: locale === "ru" ? "Вы успешно вошли. Здесь можно увидеть статус доступа, открыть admin-only возможности недоступно." : "You are signed in. This panel shows access status, but admin-only features are unavailable.",
    adminHint: locale === "ru" ? "Кнопка админки видна всегда, но активна только для администратора." : "The admin button is always visible, but active only for administrators.",
    primaryActionLabel: locale === "ru" ? "Выйти" : "Sign out",
    canOpenAdmin: false,
    canToggleMasking: !maskingLockedByAccess,
    maskingTitle: locale === "ru" ? `Принудительная маскировка: ${maskingForced ? "вкл" : "выкл"}` : `Forced masking: ${maskingForced ? "on" : "off"}`,
    maskingHint: maskingLockedByAccess
      ? (locale === "ru" ? "Маскирование определяется уровнем доступа." : "Masking is defined by access level.")
      : (locale === "ru" ? "Во включённом режиме запросы к API отправляются без auth cookie." : "When enabled, API requests are sent without the auth cookie."),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatDdMm(value: Date): string {
  const dd = String(value.getUTCDate()).padStart(2, "0");
  const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}:${mm}`;
}

function makeDefaultWindowMs(): { from: number; to: number } {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 2);
  const to = new Date(now);
  to.setMonth(to.getMonth() + 2);
  return { from: from.getTime(), to: to.getTime() };
}

function dateWindowMs(dateFilter: { enabled: boolean; start: string; end: string }): {
  from: number;
  to: number;
} {
  if (!dateFilter.enabled) return makeDefaultWindowMs();
  const from = Date.parse(dateFilter.start);
  const to = Date.parse(dateFilter.end);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return makeDefaultWindowMs();
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };
}

export function TimelinePage() {
  const ctx = React.useContext(LayoutContext);
  const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [timelineScrollLeft, setTimelineScrollLeft] = React.useState(0);
  const [timelineScrollTop, setTimelineScrollTop] = React.useState(0);
  const [timelineViewportHeight, setTimelineViewportHeight] = React.useState(0);
  const [isDraggingTimeline, setIsDraggingTimeline] = React.useState(false);
  const [isRefreshPanelOpen, setIsRefreshPanelOpen] = React.useState(false);
  const [isDateFilterPanelOpen, setIsDateFilterPanelOpen] = React.useState(false);
  const [isAuthPanelOpen, setIsAuthPanelOpen] = React.useState(false);
  const [maskingMode, setMaskingMode] = React.useState<"auto" | "forced">(() => readMaskingMode());
  const [pageView, setPageView] = React.useState<"tasks" | "designers">(() => {
    try {
      const stored = localStorage.getItem(TIMELINE_PAGE_VIEW_KEY);
      if (stored === "tasks" || stored === "designers") return stored;
    } catch {
      // ignore
    }
    return "tasks";
  });
  const [, setSessionClock] = React.useState(() => Date.now());
  const dateFromInputRef = React.useRef<HTMLInputElement | null>(null);
  const dateToInputRef = React.useRef<HTMLInputElement | null>(null);
  const dragStartRef = React.useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const scaleInfoRef = React.useRef<{ rangeStartMs: number; pxPerDay: number; labelW: number } | null>(null);
  const pendingZoomAnchorRef = React.useRef<{ dateMs: number; clientX: number } | null>(null);
  const pendingDateAnchorRef = React.useRef<number | null>(null);
  const didInitialTodayCenterRef = React.useRef(false);
  const authMenuRef = React.useRef<HTMLDivElement | null>(null);
  const timelineHost = useElementWidth<HTMLDivElement>();

  const applyDateAnchor = (dateMs: number, behavior: ScrollBehavior = "auto") => {
    const host = timelineHost.ref.current;
    const scale = scaleInfoRef.current;
    if (!host || !scale) return;
    const x = scale.labelW + ((dateMs - scale.rangeStartMs) / DAY_MS) * scale.pxPerDay - host.clientWidth * 0.5;
    host.scrollTo({ left: Math.max(0, x), behavior });
  };

  const todayAnchorMs = () => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  };

  const centerTimelineOnToday = (behavior: ScrollBehavior = "smooth") => {
    applyDateAnchor(todayAnchorMs(), behavior);
  };

  const schedulePendingDateAnchorApply = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchor = pendingDateAnchorRef.current;
        if (anchor === null) return;
        applyDateAnchor(anchor);
        pendingDateAnchorRef.current = null;
      });
    });
  };

  React.useEffect(() => {
    try {
      localStorage.setItem(TIMELINE_PAGE_VIEW_KEY, pageView);
    } catch {
      // ignore
    }
  }, [pageView]);

  React.useEffect(() => {
    if (!isAuthPanelOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (authMenuRef.current && target && !authMenuRef.current.contains(target)) {
        setIsAuthPanelOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAuthPanelOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAuthPanelOpen]);

  if (!ctx) return null;
  const {
    viewMode,
    setViewMode,
    sortMode,
    setSortMode,
    filters,
    setFilters,
    snapshotState,
    design,
    setDesign,
    ui,
    locale,
    setLocale,
    authSession,
    workbenchPanelEnabled,
    setWorkbenchPanelEnabled,
    workbenchOpen,
    setFavoritesOpen,
    canUseWorkbench,
  } = ctx;
  const {
    snapshot,
    isLoading,
    status,
    error,
    reloadLocal,
    syncFromApi,
    demoMode,
    toggleDemoMode,
    loadLimit,
    setLoadLimit,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
  } = snapshotState;
  const rowH = design.tableRowHeight;
  const peopleById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of snapshot?.people ?? []) map.set(p.id, p.name);
    return map;
  }, [snapshot]);

  React.useEffect(() => {
    const host = timelineHost.ref.current;
    if (!host) return;
    setTimelineViewportHeight(host.clientHeight);
  }, [timelineHost.width, timelineHost.ref]);

  React.useEffect(() => {
    if (authSession.state.sessionKind !== "temp_link" || !authSession.state.expiresAt) return;
    const timer = window.setInterval(() => {
      setSessionClock(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, [authSession.state.expiresAt, authSession.state.sessionKind]);

  React.useEffect(() => {
    if (pageView !== "tasks" || didInitialTodayCenterRef.current) return;
    const host = timelineHost.ref.current;
    const scale = scaleInfoRef.current;
    if (!host || !scale || timelineHost.width <= 0) return;
    didInitialTodayCenterRef.current = true;
    requestAnimationFrame(() => {
      applyDateAnchor(todayAnchorMs(), "auto");
    });
  }, [pageView, timelineHost.width, snapshot?.meta?.generatedAt, zoom]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragStartRef.current;
      const host = timelineHost.ref.current;
      if (!drag || !host) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      host.scrollLeft = drag.left - dx;
      host.scrollTop = drag.top - dy;
    };
    const onUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setIsDraggingTimeline(false);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [timelineHost.ref]);

  React.useEffect(() => {
    const host = timelineHost.ref.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.altKey) return;
      const topBefore = host.scrollTop;
      e.preventDefault();
      e.stopPropagation();
      const scale = scaleInfoRef.current;
      if (scale) {
        const rect = host.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const timelineX = host.scrollLeft + localX - scale.labelW;
        const dateMs = scale.rangeStartMs + (Math.max(0, timelineX) / Math.max(0.0001, scale.pxPerDay)) * DAY_MS;
        pendingZoomAnchorRef.current = { dateMs, clientX: localX };
      }
      const zoomMul = e.deltaY > 0 ? 0.92 : 1.08;
      setZoom((prev) => clamp(prev * zoomMul, MIN_ZOOM, MAX_ZOOM));
      // Hard lock Y scroll while Alt+wheel zoom is active.
      if (host.scrollTop !== topBefore) host.scrollTop = topBefore;
      requestAnimationFrame(() => {
        if (host.scrollTop !== topBefore) host.scrollTop = topBefore;
      });
    };
    host.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => host.removeEventListener("wheel", onWheel, true);
  }, [snapshot, timelineHost.width, timelineHost.ref]);

  if (!snapshot) {
    return (
      <div className="card" style={{ minHeight: 160 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>
          {isLoading ? ui.common.loadingTitle : ui.common.noDataTitle}
        </h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {isLoading ? ui.common.loadingHint : ui.common.noDataHint}
        </p>
        {error ? (
          <div className="muted" style={{ color: "#ffb8c8", marginBottom: 8 }}>
            {String(error)}
          </div>
        ) : null}
        <div className="row" style={{ marginTop: 10 }}>
          <button onClick={() => { void syncFromApi(); }}>{ui.filters.updateFromApi}</button>
          <button onClick={() => { void reloadLocal(); }}>{ui.filters.updateFromLocal}</button>
        </div>
      </div>
    );
  }

  const statusLabels = snapshot.enums?.status ?? {};

  const tasks = snapshot.tasks.filter((t) => {
    if (filters.ownerId && t.ownerId !== filters.ownerId) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
  const tasksForRender = (() => {
    const allowedStatuses = new Set<string>([
      ...(statusFilter.work ? ["work"] : []),
      ...(statusFilter.preDone ? ["pre_done"] : []),
      ...(statusFilter.done ? ["done"] : []),
      ...(statusFilter.wait ? ["wait"] : []),
    ]);
    const hasStatusFilter = allowedStatuses.size > 0;
    const dateWindow = dateFilter.enabled ? dateWindowMs(dateFilter) : null;

    return tasks.filter((t) => {
      if (hasStatusFilter && !allowedStatuses.has(t.status)) return false;
      if (!dateWindow) return true;
      const startMs = t.start ? Date.parse(t.start) : Number.NaN;
      const endMs = t.end ? Date.parse(t.end) : Number.NaN;
      const safeStart = Number.isFinite(startMs)
        ? startMs
        : Number.isFinite(endMs)
          ? endMs
          : Number.NaN;
      const safeEnd = Number.isFinite(endMs)
        ? endMs
        : Number.isFinite(startMs)
          ? startMs
          : Number.NaN;
      if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd)) return true;
      return safeEnd >= dateWindow.from && safeStart <= dateWindow.to;
    });
  })();
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(filters.displayLimit || 30)));
  const safeLoadLimit = Math.max(1, Math.min(1000, Math.floor(loadLimit || 30)));
  const tasksByFreshEnd = [...tasksForRender].sort((a, b) => {
    const aEnd = a.end ? Date.parse(a.end) : Number.NEGATIVE_INFINITY;
    const bEnd = b.end ? Date.parse(b.end) : Number.NEGATIVE_INFINITY;
    if (aEnd === bEnd) return String(a.id).localeCompare(String(b.id));
    return bEnd - aEnd;
  });
  const limitedTasks = tasksByFreshEnd.slice(0, safeLimit);

  const selectedTask = selectedId ? snapshot.tasks.find((t) => t.id === selectedId) ?? null : null;

  const onHover = (
    e: React.MouseEvent,
    t: RenderTask,
    meta?: { date: Date; milestoneLabel?: string }
  ) => {
    const manager = t.customer ?? "-";
    const history = (t.history ?? "").trim();
    const dateLabel = meta?.date ? formatDdMm(meta.date) : "-";
    const bubbleScale = Math.max(0.6, design.tooltipBubbleScale ?? 1);
    const bubbleStyle: React.CSSProperties = {
      fontSize: `${Math.round(11 * bubbleScale)}px`,
      padding: `${Math.round(3 * bubbleScale)}px ${Math.round(9 * bubbleScale)}px`,
      lineHeight: 1,
    };
    const ownerResolved = t.ownerName?.trim()
      ? t.ownerName.trim()
      : t.ownerId && peopleById.has(t.ownerId)
        ? peopleById.get(t.ownerId) ?? "-"
        : "-";
    const bubbleItems = [
      t.brand ?? "-",
      t.format_?.trim() ? t.format_.trim() : "-",
      t.groupName?.trim() ? t.groupName.trim() : "-",
      ownerResolved !== "-" ? toShortPersonName(ownerResolved) : "-",
    ];

    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div style={{ width: "fit-content", maxWidth: "min(86vw, 560px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="badge">{dateLabel}</span>
            {meta?.milestoneLabel ? (
              <span className="badge" style={bubbleStyle}>{meta.milestoneLabel}</span>
            ) : null}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            {bubbleItems.map((value, idx) => (
              <span key={`tt-bubble-${idx}`} className="badge" style={bubbleStyle}>
                {value}
              </span>
            ))}
          </div>
          <div style={{ opacity: 0.9 }}>{manager}</div>
          <div style={{ margin: "6px 0", borderTop: "1px solid rgba(144,166,223,0.34)" }} />
          <div style={{ whiteSpace: "pre-wrap", opacity: 0.92 }}>
            {history || "-"}
          </div>
        </div>
      ),
    });
  };
  const onLeave = () => setTooltip({ visible: false });
  const maskingForced = maskingMode === "forced";
  const maskingLockedByAccess = authSession.state.accessMode !== "full";
  const maskButtonActive = maskingForced || maskingLockedByAccess;
  const authButtonLabel = authSession.state.authenticated
    ? authSession.state.user?.displayName || authSession.state.user?.email || "Пользователь"
    : authSession.state.loading
      ? (locale === "ru" ? "Проверка доступа" : "Checking access")
      : (locale === "ru" ? "Войти через Яндекс" : "Sign in with Yandex");
  const authPanelContent = buildAuthPanelContent({
    locale,
    loading: authSession.state.loading,
    authenticated: authSession.state.authenticated,
    accessMode: authSession.state.accessMode,
    user: authSession.state.user,
    sessionKind: authSession.state.sessionKind,
    expiresAt: authSession.state.expiresAt,
    temporaryAccessLabel: authSession.state.temporaryAccessLabel,
    maskingForced,
    maskingLockedByAccess,
  });

  const handleMaskToggle = () => {
    if (maskingLockedByAccess) return;
    const nextMode = maskingForced ? "auto" : "forced";
    writeMaskingMode(nextMode);
    setMaskingMode(nextMode);
    void syncFromApi();
  };

  const handleAuthButtonClick = () => {
    setIsAuthPanelOpen((prev) => !prev);
  };

  const handlePrimaryAuthAction = () => {
    if (authSession.state.loading) {
      void authSession.reload();
      return;
    }
    if (!authSession.state.authenticated) {
      void authSession.startLogin();
      return;
    }
    void authSession.logout();
  };

  const onDesignerCardHover = (e: React.MouseEvent, task: TaskV1) => {
    const manager = task.customer?.trim() || "-";
    const history = task.history?.trim() || "-";
    const milestones = [...(task.milestones ?? [])]
      .map((m) => ({
        label: snapshot.enums?.milestoneType?.[m.type] ?? m.type,
        date: m.actual ?? m.planned ?? "",
      }))
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const half = Math.ceil(milestones.length / 2);
    const columns = [milestones.slice(0, half), milestones.slice(half)];

    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div style={{ width: "fit-content", maxWidth: "min(90vw, 760px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {columns.map((column, colIdx) => (
              <div key={`ms-col-${colIdx}`} style={{ display: "grid", gap: 4 }}>
                {column.length ? (
                  column.map((item, idx) => (
                    <div key={`ms-${colIdx}-${idx}`} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8 }}>
                      <span className="badge">{item.date ? item.date.slice(5).replace("-", ".") : "--.--"}</span>
                      <span
                        style={{
                          whiteSpace: "normal",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.25,
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="muted">-</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.78 }}>{manager}</div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.94, whiteSpace: "pre-wrap", lineHeight: 1.25 }}>
            {history}
          </div>
        </div>
      ),
    });
  };

  const timelineWidth = Math.max(timelineHost.width, design.timelineWidth);
  const showMilestoneLabels = design.timelineShowMilestoneLabels >= 0.5;
  const labelEveryDay = design.timelineLabelEveryDay >= 0.5;
  const weekendFillMode = design.timelineWeekendFullDay >= 0.5 ? "full-day" : "legacy";
  const exactZoomPreset = ZOOM_PRESETS.find((z) => Math.abs(z - zoom) < 0.001);
  const zoomPresetValue = exactZoomPreset ? String(exactZoomPreset) : "__custom__";

  const anchorDateFromView = (): number | null => {
    const host = timelineHost.ref.current;
    const scale = scaleInfoRef.current;
    if (!host || !scale) return null;
    const timelineCenterX = host.scrollLeft + host.clientWidth * 0.5 - scale.labelW;
    return scale.rangeStartMs + (Math.max(0, timelineCenterX) / Math.max(0.0001, scale.pxPerDay)) * DAY_MS;
  };

  const toggleStatusFilter = (key: "work" | "preDone" | "done" | "wait") => {
    const anchor = anchorDateFromView();
    if (anchor !== null) pendingDateAnchorRef.current = anchor;
    setStatusFilter({
      ...statusFilter,
      [key]: !statusFilter[key],
    });
    schedulePendingDateAnchorApply();
  };

  return (
    <>
      {status === "stale_error" && error ? (
        <ErrorBanner
          compact
          title={ui.timeline.staleTitle}
          error={error}
          onRetry={reloadLocal}
        />
      ) : null}

      <div
        className="timelineTopControlDock timelineTopControlDockExternal"
        style={{
          transform: `translate(${design.timelineTopControlDockOffsetX}px, ${design.timelineTopControlDockOffsetY}px)`,
        }}
      >
        <div className="timelineTopControlRow">
          <div className="pageSwitchCtl">
            <button
              type="button"
              className={`modeMiniBtn ${pageView === "tasks" ? "active" : ""}`}
              onClick={() => setPageView("tasks")}
            >
              {PAGE_LABEL_TASKS}
            </button>
            <button
              type="button"
              className={`modeMiniBtn ${pageView === "designers" ? "active" : ""}`}
              onClick={() => setPageView("designers")}
            >
              {PAGE_LABEL_DESIGNERS}
            </button>
          </div>
          {pageView === "tasks" ? (
            <>
              <div className="timelineZoomCtl">
                <button
                  type="button"
                  onClick={() => {
                    const idx = ZOOM_PRESETS.findIndex((v) => Math.abs(v - zoom) < 0.001);
                    const nextIdx = idx <= 0 ? 0 : idx - 1;
                    setZoom(ZOOM_PRESETS[nextIdx]);
                  }}
                >
                  -
                </button>
                <select
                  value={zoomPresetValue}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") return;
                    setZoom(clamp(Number(e.target.value), MIN_ZOOM, MAX_ZOOM));
                  }}
                  aria-label={ui.timeline.zoomAria}
                >
                  {zoomPresetValue === "__custom__" ? (
                    <option value="__custom__">{Math.round(zoom * 100)}%</option>
                  ) : null}
                  {ZOOM_PRESETS.map((z) => (
                    <option key={z} value={String(z)}>
                      {Math.round(z * 100)}%
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const idx = ZOOM_PRESETS.findIndex((v) => Math.abs(v - zoom) < 0.001);
                    const nextIdx = idx < 0 ? 2 : Math.min(ZOOM_PRESETS.length - 1, idx + 1);
                    setZoom(ZOOM_PRESETS[nextIdx]);
                  }}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="timelineTodayBtn"
                onClick={() => centerTimelineOnToday("smooth")}
              >
                Сегодня
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={`iconCtlBtn ${demoMode ? "active" : ""}`}
            onClick={() => {
              void toggleDemoMode();
            }}
            title={ui.filters.demoMode}
            aria-label={ui.filters.demoMode}
          >
            {ui.filters.demoMode}
          </button>
          <button
            type="button"
            className={`iconCtlBtn ${design.animEnabled >= 0.5 ? "active" : ""}`}
            onClick={() =>
              setDesign((prev) => ({
                ...prev,
                animEnabled: prev.animEnabled >= 0.5 ? 0 : 1,
              }))
            }
            title={locale === "ru" ? "Анимация" : "Animation"}
            aria-label={locale === "ru" ? "Анимация" : "Animation"}
          >
            {"\u2726"}
          </button>
          {pageView === "tasks" ? (
            <button
              type="button"
              className="iconCtlBtn"
              onClick={() =>
                setSortMode((prev) =>
                  prev === "last_milestone_desc" ? "last_milestone_asc" : "last_milestone_desc"
                )
              }
              title={
                sortMode === "last_milestone_desc"
                  ? ui.filters.sortByLastMilestoneDesc
                  : ui.filters.sortByLastMilestoneAsc
              }
              aria-label={
                sortMode === "last_milestone_desc"
                  ? ui.filters.sortByLastMilestoneDesc
                  : ui.filters.sortByLastMilestoneAsc
              }
            >
              {sortMode === "last_milestone_desc" ? "↑" : "↓"}
            </button>
          ) : null}
          <button
            type="button"
            className={`iconCtlBtn ${isRefreshPanelOpen ? "active" : ""}`}
            onClick={() => setIsRefreshPanelOpen((s) => !s)}
            title={ui.filters.updateFromApi}
            aria-label={ui.filters.updateFromApi}
          >
            {"\u27f3"}
          </button>
          <button
            type="button"
            className={`iconCtlBtn filterCtlBtn ${isDateFilterPanelOpen || dateFilter.enabled ? "active" : ""}`}
            onClick={() => setIsDateFilterPanelOpen((s) => !s)}
            title={ui.filters.dateFilterTitle}
            aria-label={ui.filters.dateFilterTitle}
          >
            {locale === "ru" ? "Ф" : "F"}
          </button>
          <label className="langCtl">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              aria-label={ui.localeLabel}
            >
              <option value="ru">{ui.localeRu}</option>
              <option value="en">{ui.localeEn}</option>
            </select>
          </label>
          <div className="timelineTopControlSpacer" />
          <button
            type="button"
            className={`iconCtlBtn authIconBtn ${maskButtonActive ? "active" : ""}`}
            disabled
            title={
              maskingLockedByAccess
                ? (locale === "ru" ? "Маскирование задаётся уровнем доступа" : "Masking is defined by access level")
                : maskingForced
                  ? (locale === "ru" ? "Выключить принудительную маскировку" : "Disable forced masking")
                  : (locale === "ru" ? "Включить принудительную маскировку" : "Enable forced masking")
            }
            aria-label={locale === "ru" ? "Маскирование" : "Masking"}
          >
            <LockIcon />
          </button>
          <div className="authMenuWrap" ref={authMenuRef}>
            <button
              type="button"
              className={`iconCtlBtn authIconBtn ${isAuthPanelOpen ? "active" : ""}`}
              onClick={handleAuthButtonClick}
              title={authButtonLabel}
              aria-label={authButtonLabel}
            >
              <UserIcon />
            </button>
            {isAuthPanelOpen ? (
              <div className="authMenuPopover">
                <div className="authPanelSection">
                  <div className="authMenuTitle">{authPanelContent.title}</div>
                  <div className="authPanelStatusRow">
                    <span className={`authBadge ${authSession.state.accessMode === "full" ? "isFull" : ""}`}>
                      {authPanelContent.accessBadge}
                    </span>
                    <span className="authPanelStatusLabel">{authPanelContent.statusLabel}</span>
                  </div>
                  {authSession.state.user?.email ? (
                    <div className="authPanelIdentity">{authSession.state.user.email}</div>
                  ) : null}
                  <div className="authPanelHint">{authPanelContent.helpText}</div>
                  <div className="authPanelText">{authPanelContent.detailText}</div>
                </div>

                <div className="authPanelSection">
                  <div className="authPanelLabel">{locale === "ru" ? "Маскирование" : "Masking"}</div>
                  <div className="authPanelText">{authPanelContent.maskingTitle}</div>
                  <div className="authPanelHint">{authPanelContent.maskingHint}</div>
                  <button
                    type="button"
                    className="btn btnGhost authMenuAction"
                    onClick={handleMaskToggle}
                    disabled={!authPanelContent.canToggleMasking}
                  >
                    {maskingForced
                      ? (locale === "ru" ? "Выключить принудительное маскирование" : "Disable forced masking")
                      : (locale === "ru" ? "Включить принудительное маскирование" : "Enable forced masking")}
                  </button>
                </div>

                <div className="authPanelSection">
                  <div className="authPanelLabel">{locale === "ru" ? "Админка" : "Admin"}</div>
                  <div className="authPanelHint">{authPanelContent.adminHint}</div>
                  <button
                    type="button"
                    className="btn btnGhost authMenuAction"
                    onClick={() => {
                      if (!authPanelContent.canOpenAdmin) return;
                      setIsAuthPanelOpen(false);
                      window.location.assign(authSession.adminHref);
                    }}
                    disabled={!authPanelContent.canOpenAdmin}
                  >
                    {locale === "ru" ? "Открыть админку" : "Open admin"}
                  </button>
                </div>

                {canUseWorkbench ? (
                  <div className="authPanelSection">
                    <div className="authPanelLabel">{locale === "ru" ? "Крутилки" : "Workbench"}</div>
                    <div className="authPanelHint">
                      {locale === "ru"
                        ? "Показывает нижнюю кнопку открытия панели крутилок."
                        : "Shows the bottom button that opens the workbench panel."}
                    </div>
                    <button
                      type="button"
                      className="btn btnGhost authMenuAction"
                      onClick={() => {
                        const next = !workbenchPanelEnabled;
                        setWorkbenchPanelEnabled(next);
                        if (!next) {
                          setFavoritesOpen(false);
                        }
                        setIsAuthPanelOpen(false);
                      }}
                    >
                      {workbenchPanelEnabled
                        ? locale === "ru"
                          ? "Выключить крутилки"
                          : "Disable workbench"
                        : locale === "ru"
                          ? "Включить крутилки"
                          : "Enable workbench"}
                    </button>
                  </div>
                ) : null}

                <div className="authPanelSection">
                  <button
                    type="button"
                    className="btn authMenuAction"
                    onClick={handlePrimaryAuthAction}
                  >
                    {authPanelContent.primaryActionLabel}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {isRefreshPanelOpen ? <FiltersBar /> : null}
        {isDateFilterPanelOpen ? (
          <div className="timelineDateFilterPanel">
            <div className="timelineDateFilterLayout">
              <div className="timelineDateFilterLeft">
                <div className="timelineDateFilterRow">
                  {dateFilter.enabled ? (
                    <>
                      <label>
                        <span>{ui.filters.dateFrom}</span>
                        <div className="datePickerField">
                          <input
                            ref={dateFromInputRef}
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) =>
                              setDateFilter({
                                ...dateFilter,
                                start: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            className="datePickerBtn"
                            onClick={() => {
                              const input = dateFromInputRef.current;
                              if (!input) return;
                              const maybeShowPicker = (input as HTMLInputElement & {
                                showPicker?: () => void;
                              }).showPicker;
                              if (typeof maybeShowPicker === "function") {
                                maybeShowPicker.call(input);
                              } else {
                                input.focus();
                              }
                            }}
                            aria-label={`${ui.filters.dateFrom} calendar`}
                          >
                            {"\ud83d\udcc5"}
                          </button>
                        </div>
                      </label>
                      <label>
                        <span>{ui.filters.dateTo}</span>
                        <div className="datePickerField">
                          <input
                            ref={dateToInputRef}
                            type="date"
                            value={dateFilter.end}
                            onChange={(e) =>
                              setDateFilter({
                                ...dateFilter,
                                end: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            className="datePickerBtn"
                            onClick={() => {
                              const input = dateToInputRef.current;
                              if (!input) return;
                              const maybeShowPicker = (input as HTMLInputElement & {
                                showPicker?: () => void;
                              }).showPicker;
                              if (typeof maybeShowPicker === "function") {
                                maybeShowPicker.call(input);
                              } else {
                                input.focus();
                              }
                            }}
                            aria-label={`${ui.filters.dateTo} calendar`}
                          >
                            {"\ud83d\udcc5"}
                          </button>
                        </div>
                      </label>
                    </>
                  ) : null}
                  <label className="timelineLimitCtl">
                    <span>
                      {ui.filters.displayLimitLabel}: {safeLimit}
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={200}
                      step={1}
                      value={safeLimit}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setFilters((prev) => ({
                          ...prev,
                          displayLimit: Number.isFinite(next) && next > 0 ? next : 30,
                        }));
                      }}
                    />
                  </label>
                  <label className="timelineLimitCtl">
                    <span>
                      {ui.filters.loadLimitLabel}: {safeLoadLimit}
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={200}
                      step={1}
                      value={safeLoadLimit}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        const normalized = Number.isFinite(next) && next > 0 ? next : 30;
                        setLoadLimit(normalized);
                        setFilters((prev) => ({ ...prev, loadLimit: normalized }));
                      }}
                    />
                  </label>
                  <div className="limitMeta muted">
                    {snapshot.tasks.length} / {limitedTasks.length}
                  </div>
                </div>
              </div>

              <div className="timelineStatusButtons">
                <button
                  type="button"
                  className={`toggleBtn ${dateFilter.enabled ? "active" : ""}`}
                  onClick={() =>
                    setDateFilter({
                      ...dateFilter,
                      enabled: !dateFilter.enabled,
                    })
                  }
                >
                  {locale === "ru" ? "Дата" : "Date"}
                </button>
                <button
                  type="button"
                  className={`toggleBtn ${statusFilter.work ? "active" : ""}`}
                  onClick={() => toggleStatusFilter("work")}
                >
                  {locale === "ru" ? "В работе" : "Work"}
                </button>
                <button
                  type="button"
                  className={`toggleBtn ${statusFilter.preDone ? "active" : ""}`}
                  onClick={() => toggleStatusFilter("preDone")}
                >
                  {locale === "ru" ? "Почти готово" : "Pre done"}
                </button>
                <button
                  type="button"
                  className={`toggleBtn ${statusFilter.done ? "active" : ""}`}
                  onClick={() => toggleStatusFilter("done")}
                >
                  {locale === "ru" ? "Готово" : "Done"}
                </button>
                <button
                  type="button"
                  className={`toggleBtn ${statusFilter.wait ? "active" : ""}`}
                  onClick={() => toggleStatusFilter("wait")}
                >
                  {locale === "ru" ? "Ждёт" : "Wait"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card">
      <div className="timelineFrame">
        {pageView === "tasks" ? (
          <div
            className="timelineModeDock"
            style={{
              transform: `translate(${design.timelineModeDockOffsetX}px, ${design.timelineModeDockOffsetY}px)`,
              ["--mode-scale" as string]: String(design.timelineModeDockScale),
            }}
          >
            <button
              type="button"
              className={`modeMiniBtn ${viewMode === "designer_brand_show" ? "active" : ""}`}
              onClick={() => setViewMode("designer_brand_show")}
            >
              {ui.modeByDesignerBrandShow}
            </button>
            <button
              type="button"
              className={`modeMiniBtn ${viewMode === "brand_designer_show" ? "active" : ""}`}
              onClick={() => setViewMode("brand_designer_show")}
            >
              {ui.modeByBrandDesignerShow}
            </button>
            <button
              type="button"
              className={`modeMiniBtn ${viewMode === "format_brand_show" ? "active" : ""}`}
              onClick={() => setViewMode("format_brand_show")}
            >
              {ui.modeByFormatBrandShow}
            </button>
            <button
              type="button"
              className={`modeMiniBtn ${viewMode === "show_brand_designer" ? "active" : ""}`}
              onClick={() => setViewMode("show_brand_designer")}
            >
              {ui.modeByShowBrandDesigner}
            </button>
            <button
              type="button"
              className={`modeMiniBtn ${viewMode === "flat_brand_show" ? "active" : ""}`}
              onClick={() => setViewMode("flat_brand_show")}
            >
              {ui.modeFlatBrandShow}
            </button>
          </div>
        ) : null}

        {pageView === "tasks" ? (
          <div
            className="card timelineScroll"
            ref={timelineHost.ref}
            style={{
              overflow: "auto",
              cursor: isDraggingTimeline ? "grabbing" : "grab",
              userSelect: isDraggingTimeline ? "none" : "auto",
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              const el = e.currentTarget;
              e.preventDefault();
              dragStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                left: el.scrollLeft,
                top: el.scrollTop,
              };
              setIsDraggingTimeline(true);
            }}
            onMouseMove={(e) => {
              const drag = dragStartRef.current;
              if (!drag) return;
              const el = e.currentTarget;
              const dx = e.clientX - drag.x;
              const dy = e.clientY - drag.y;
              el.scrollLeft = drag.left - dx;
              el.scrollTop = drag.top - dy;
            }}
            onMouseUp={() => {
              if (!dragStartRef.current) return;
              dragStartRef.current = null;
              setIsDraggingTimeline(false);
            }}
            onMouseLeave={() => {
              if (!dragStartRef.current) return;
              dragStartRef.current = null;
              setIsDraggingTimeline(false);
            }}
            onScroll={(e) => {
              const target = e.currentTarget;
              flushSync(() => {
                setTimelineScrollLeft(target.scrollLeft);
                setTimelineScrollTop(target.scrollTop);
                setTimelineViewportHeight(target.clientHeight);
              });
            }}
          >
            <UnifiedTimeline
              mode={viewMode}
              sortMode={sortMode}
              locale={locale}
              people={snapshot.people}
              groups={snapshot.groups}
              tasks={limitedTasks}
              statusLabels={statusLabels}
              unassignedLabel={ui.common.unassigned}
              width={timelineWidth}
              viewportWidth={timelineHost.width}
              leftPinOffset={timelineScrollLeft}
              rowH={rowH}
              labelW={Math.max(320, design.desktopLeftColWidth)}
              topOffset={design.timelineTopOffset}
              dateLabelY={design.timelineDateLabelY}
              dateFontSize={design.timelineDateFontSize}
              dateIdleOpacity={design.timelineDateIdleOpacity}
              dateHoverOpacity={design.timelineDateHoverOpacity}
              monthFontSize={design.timelineMonthFontSize}
              monthOffsetY={design.timelineMonthOffsetY}
              monthOffsetX={design.timelineMonthOffsetX}
              todayLineOpacity={design.timelineTodayLineOpacity}
              todayLineWidth={design.timelineTodayLineWidth}
              cursorTrailDays={design.timelineCursorTrailDays}
              cursorTrailOpacity={design.timelineCursorTrailOpacity}
              holidayFillOpacity={design.timelineHolidayFillOpacity}
              perfMinWeekPxDetailedX10={design.timelinePerfMinWeekPxDetailedX10}
              leftOwnerFontSize={design.timelineLeftOwnerFontSize}
              leftOwnerXOffset={design.timelineLeftOwnerXOffset}
              leftOwnerTextOffsetY={design.timelineLeftOwnerTextOffsetY}
              leftOwnerCropLeft={design.timelineLeftOwnerCropLeft}
              leftTaskFontSize={design.timelineLeftTaskFontSize}
              leftTaskXOffset={design.timelineLeftTaskXOffset}
              leftTaskTextOffsetY={design.timelineLeftTaskTextOffsetY}
              leftTaskCropLeft={design.timelineLeftTaskCropLeft}
              leftMetaFontSize={design.timelineLeftMetaFontSize}
              leftMetaTextOffsetY={design.timelineLeftMetaTextOffsetY}
              leftPillOffsetY={design.timelineLeftPillOffsetY}
              leftPillXOffset={design.timelineLeftPillXOffset}
              leftPillWidth={design.timelineLeftPillWidth}
              leftPillSizeScale={design.timelineLeftPillSizeScale}
              leftGroupOffsetY={design.timelineLeftGroupOffsetY}
              leftGroupXOffset={design.timelineLeftGroupXOffset}
              leftGroupCropLeft={design.timelineLeftGroupCropLeft}
              leftGroupFontSize={design.timelineLeftGroupFontSize}
              badgeHeight={design.badgeHeight}
              badgeFontSize={design.badgeFontSize}
              textRenderingMode={design.textRenderingMode}
              animEnabled={design.animEnabled >= 0.5}
              reorderDurationMs={design.animReorderDurationMs}
              reorderEasePreset={design.animReorderEasePreset}
              reorderStaggerMs={design.animReorderStaggerMs}
              reorderStaggerCapMs={design.animReorderStaggerCapMs}
              reorderDistanceFactor={design.animReorderDistanceFactor}
              reorderDistanceMaxExtraMs={design.animReorderDistanceMaxExtraMs}
              reorderViewportOnly={design.animReorderViewportOnly >= 0.5}
              reorderViewportBufferPx={design.animReorderViewportBufferPx}
              reorderAutoDisableRows={design.animReorderAutoDisableRows}
              viewportTop={timelineScrollTop}
              viewportHeight={timelineViewportHeight}
              disableReorderAnimation={isDraggingTimeline}
              onScaleChange={({ rangeStartMs, pxPerDay, labelW }) => {
                scaleInfoRef.current = { rangeStartMs, pxPerDay, labelW };
                const host = timelineHost.ref.current;
                if (!host) return;

                const zoomAnchor = pendingZoomAnchorRef.current;
                if (zoomAnchor) {
                  const x =
                    labelW +
                    ((zoomAnchor.dateMs - rangeStartMs) / DAY_MS) * pxPerDay -
                    zoomAnchor.clientX;
                  host.scrollLeft = Math.max(0, x);
                  pendingZoomAnchorRef.current = null;
                }

                const dateAnchor = pendingDateAnchorRef.current;
                if (dateAnchor !== null) {
                  const x =
                    labelW +
                    ((dateAnchor - rangeStartMs) / DAY_MS) * pxPerDay -
                    host.clientWidth * 0.5;
                  host.scrollLeft = Math.max(0, x);
                  pendingDateAnchorRef.current = null;
                }
              }}
              zoom={zoom}
              stripeOpacity={design.timelineStripeOpacity}
              gridOpacity={design.timelineGridOpacity}
              gridLineWidth={design.timelineGridLineWidth}
              barInsetY={design.barInsetY}
              barRadius={design.barRadius}
              labelEveryDay={labelEveryDay}
              weekendFillMode={weekendFillMode}
              weekendFillOpacity={design.timelineWeekendFillOpacity}
              milestoneSizeScale={design.milestoneSizeScale}
              milestoneOpacity={design.milestoneOpacity}
              showMilestoneLabels={showMilestoneLabels}
              taskColorMixPercent={design.taskColorMixPercent}
              onHover={onHover}
              onLeave={onLeave}
              onClick={(t) => setSelectedId(t.id)}
            />
          </div>
        ) : (
          <div className="card timelineScroll" style={{ overflow: "auto", paddingTop: 56 }}>
            <DesignersBoard
              tasks={limitedTasks}
              people={snapshot.people}
              groups={snapshot.groups}
              unassignedLabel={ui.common.unassigned}
              onTaskClick={(task) => setSelectedId(task.id)}
              onTaskHover={onDesignerCardHover}
              onTaskLeave={onLeave}
            />
          </div>
        )}
      </div>
      </div>

      <Tooltip state={tooltip} offsetX={design.tooltipOffsetX} offsetY={design.tooltipOffsetY} />
      <TaskDetailsDrawer
        task={selectedTask}
        people={snapshot.people}
        groups={snapshot.groups}
        statusLabels={snapshot.enums?.status}
        milestoneTypeLabels={snapshot.enums?.milestoneType}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}



