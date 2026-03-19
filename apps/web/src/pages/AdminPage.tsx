import React from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { LayoutContext } from "../components/Layout";
import { getAuthRequestBase, getTasksRoute } from "../config/runtimeContour";
import { UI_STYLE_GROUP_LABELS, UI_STYLE_REGISTRY, type UIStyleEntry, type UIStyleGroup } from "../design/uiRegistry";

const MINI_APP_ADMIN_RETURN_KEY = "dtm-miniapp-admin-return-to";
const ADMIN_TOP_TAB_KEY = "dtm-admin-top-tab";
const ADMIN_ACCESS_TAB_KEY = "dtm-admin-access-tab";
const ADMIN_STYLE_TAB_KEY = "dtm-admin-style-tab";
const USER_DROP_ZONE_ID: Record<"pendingUsers" | "approvedUsers", string> = {
  pendingUsers: "admin-drop-pendingUsers",
  approvedUsers: "admin-drop-approvedUsers",
};

type AdminUserCard = {
  id: string;
  yandexUid: string;
  email: string | null;
  displayName: string | null;
  personId: string | null;
  personName: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  canViewAllTasks: boolean;
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

type AccessLinkUsageEvent = {
  id: string;
  usedAt: string;
  ip: string | null;
  city: string | null;
  clientSummary: string | null;
};

type AccessLinkCard = {
  id: string;
  label: string;
  status: "active" | "expired" | "revoked";
  browserUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  useCount: number;
  usageEvents: AccessLinkUsageEvent[];
};

type AccessLinkDraft = {
  label: string;
  expiresAt: string;
};

type DragListKey = "pendingUsers" | "approvedUsers" | "colorPresets" | "layoutPresets";
type AdminTopTab = "access" | "style";
type AdminAccessTab = "people" | "links";
type AdminStyleTab = "presets" | "ui";

type AdminOverview = {
  pendingUsers: AdminUserCard[];
  approvedUsers: AdminUserCard[];
  allowlist: Array<{
    email: string;
    source: string;
    comment: string | null;
    createdAt: string;
  }>;
  accessLinks: AccessLinkCard[];
  presets: {
    color: PresetCard[];
    layout: PresetCard[];
    defaults: {
      color: string | null;
      layout: string | null;
    };
  };
};

type ActiveDrag = {
  list: DragListKey;
  id: string;
};

type SortableCardProps = {
  id: string;
  children: React.ReactNode;
  className: string;
};

const UI_GROUP_ORDER: UIStyleGroup[] = ["button", "bubble", "label", "panel"];

function buildAuthUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

function goToTimeline(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const miniAppRequested = url.searchParams.get("mini_app") === "1";
    const returnTo =
      window.sessionStorage.getItem(MINI_APP_ADMIN_RETURN_KEY)?.trim() ||
      window.localStorage.getItem(MINI_APP_ADMIN_RETURN_KEY)?.trim() ||
      "";
    const isMobileReturn =
      returnTo === "/app" ||
      returnTo.startsWith("/app?") ||
      returnTo === "/test/app" ||
      returnTo.startsWith("/test/app?") ||
      returnTo === "/m" ||
      returnTo.startsWith("/m?") ||
      returnTo === "/test/m" ||
      returnTo.startsWith("/test/m?") ||
      returnTo === "/mobile" ||
      returnTo.startsWith("/mobile?") ||
      returnTo === "/test/mobile" ||
      returnTo.startsWith("/test/mobile?");
    if (isMobileReturn) {
      window.sessionStorage.removeItem(MINI_APP_ADMIN_RETURN_KEY);
      window.localStorage.removeItem(MINI_APP_ADMIN_RETURN_KEY);
      window.location.assign(returnTo);
      return;
    }
    if (miniAppRequested) {
      const fallbackMiniAppRoute = window.location.pathname.startsWith("/test/") ? "/test/m" : "/m";
      window.location.assign(fallbackMiniAppRoute);
      return;
    }
  } catch {
    // ignore and use default route
  }
  window.location.assign(getTasksRoute());
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatRemainingTime(value: string | null): string {
  if (!value) return "Без срока";
  const target = new Date(value);
  if (!Number.isFinite(target.getTime())) return value;
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "Истекла";
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} д ${hours} ч`;
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  return `${minutes} мин`;
}

function readStoredTab<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function statusLabel(status: AccessLinkCard["status"]): string {
  if (status === "active") return "Активна";
  if (status === "expired") return "Истекла";
  return "Отозвана";
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

function PresetKindBadge(props: { kind: "color" | "layout" }) {
  if (props.kind === "color") {
    return <span className="adminPresetKindBadge isColor" aria-hidden="true" />;
  }
  return (
    <span className="adminPresetKindBadge isLayout" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v7" />
        <path d="M12 3l-3 3" />
        <path d="M12 3l3 3" />
        <path d="M21 12h-7" />
        <path d="M21 12l-3-3" />
        <path d="M21 12l-3 3" />
        <path d="M12 21v-7" />
        <path d="M12 21l-3-3" />
        <path d="M12 21l3-3" />
        <path d="M3 12h7" />
        <path d="M3 12l3-3" />
        <path d="M3 12l3 3" />
      </svg>
    </span>
  );
}

function orderItems<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (!order.length) return items;
  const itemById = new Map(items.map((item) => [item.id, item] as const));
  const next: T[] = [];
  const used = new Set<string>();
  for (const id of order) {
    const item = itemById.get(id);
    if (!item || used.has(id)) continue;
    next.push(item);
    used.add(id);
  }
  for (const item of items) {
    if (used.has(item.id)) continue;
    next.push(item);
  }
  return next;
}

async function expectOk(res: Response, message: string): Promise<void> {
  if (res.ok) return;
  throw new Error(`${message} (HTTP ${res.status})`);
}

function idsOf(items: Array<{ id: string }>): string[] {
  return items.map((item) => item.id);
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function SortableCard(props: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  return (
    <div
      ref={setNodeRef}
      className={`${props.className} ${isDragging ? "isDragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      {props.children}
    </div>
  );
}

function DroppableUserColumn(props: { list: "pendingUsers" | "approvedUsers"; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: USER_DROP_ZONE_ID[props.list] });
  return (
    <div ref={setNodeRef} className={`adminUserDropZone ${isOver ? "isOver" : ""}`}>
      {props.children}
    </div>
  );
}

function UserCardContent(props: {
  user: AdminUserCard;
  roleText?: string;
  roleClassName?: string;
  actionClassName?: string;
  actions: React.ReactNode;
}) {
  return (
    <>
      <div className="adminUserHeader">
        <UserAvatar name={props.user.displayName} email={props.user.email} avatarUrl={props.user.avatarUrl} />
        {props.roleText ? <div className={`adminUserRole ${props.roleClassName ?? ""}`}>{props.roleText}</div> : null}
      </div>
      <div className="adminUserBody">
        <div className="adminUserName">{props.user.displayName || props.user.email || props.user.id}</div>
        <div className="muted">{props.user.email || "Email не указан"}</div>
        {props.user.personName ? <div className="muted">Дизайнер: {props.user.personName}</div> : null}
        {props.user.telegramId ? <div className="muted">Telegram ID: {props.user.telegramId}</div> : null}
        {props.user.telegramUsername ? <div className="muted">Telegram: @{props.user.telegramUsername}</div> : null}
        <div className="muted">Заявка: {formatDateTime(props.user.requestedAt)}</div>
      </div>
      <div className={`adminUserActions ${props.actionClassName ?? ""}`.trim()}>{props.actions}</div>
    </>
  );
}

function PresetCardContent(props: { preset: PresetCard; actions: React.ReactNode }) {
  const availabilityText =
    props.preset.isDefault
      ? "По умолчанию"
      : props.preset.availability === "ready"
        ? "Доступен"
        : props.preset.availability === "broken"
          ? "Asset поврежден"
          : "Asset недоступен";

  return (
    <>
      <PresetKindBadge kind={props.preset.kind} />
      <div className="adminUserBody">
        <div className="adminUserName">{props.preset.name}</div>
        <div className="muted adminPresetDescription">{props.preset.description || "Без описания"}</div>
        <div className="muted">Автор: {props.preset.authorDisplayName || "не указан"}</div>
        <div className="muted">Revision: {props.preset.revision ?? "-"}</div>
        <div className="muted">Обновлен: {props.preset.updatedAt ? formatDateTime(props.preset.updatedAt) : "-"}</div>
        <div className={`adminUserRole ${props.preset.isDefault ? "isAdmin" : ""}`}>{availabilityText}</div>
      </div>
      <div className="adminUserActions">{props.actions}</div>
    </>
  );
}

function AdminTabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`adminTabButton ${props.active ? "isActive" : ""}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function uiStatusLabel(entry: UIStyleEntry): string {
  return entry.deprecated ? "Legacy" : "Active";
}

function UIPreviewActionIcon(props: { kind: "preview" | "download" | "delete" }) {
  if (props.kind === "preview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="attachmentActionIconSvg">
        <path
          d="M2.5 12s3.8-6.5 9.5-6.5S21.5 12 21.5 12s-3.8 6.5-9.5 6.5S2.5 12 2.5 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (props.kind === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="attachmentActionIconSvg">
        <path
          d="M12 4.5v9.5m0 0 3.6-3.6M12 14l-3.6-3.6M5 18.5h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="attachmentActionIconSvg">
      <path
        d="M6.5 6.5 17.5 17.5M17.5 6.5l-11 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UIStylePreview(props: { entry: UIStyleEntry }) {
  switch (props.entry.previewKind) {
    case "button-primary":
      return (
        <div className="adminUiPreviewInline">
          <button type="button" className="btn">Открыть</button>
          <button type="button" className="btn btnGhost">Черновик</button>
        </div>
      );
    case "button-ghost":
      return (
        <div className="adminUiPreviewInline">
          <button type="button" className="btn btnGhost">Подробнее</button>
          <button type="button" className="btn btnGhost" disabled>Недоступно</button>
        </div>
      );
    case "miniapp-primary":
      return (
        <div className="adminUiPreviewInline isMobile">
          <button type="button" className="miniAppButton">Войти</button>
          <button type="button" className="miniAppButton miniAppButtonGhost">Обновить</button>
        </div>
      );
    case "miniapp-group-toggle":
      return (
        <div className="adminUiPreviewMiniGroup">
          <button type="button" className="miniAppTaskGroupToggle isOpen">
            <span className="miniAppTaskGroupLabel">Бренд</span>
            <span className="miniAppTaskGroupCount">8</span>
          </button>
        </div>
      );
    case "attachment-actions":
      return (
        <div className="adminUiPreviewInline">
          <button type="button" className="miniAppButton miniAppButtonGhost attachmentActionIconButton isPreview" aria-label="Просмотр">
            <UIPreviewActionIcon kind="preview" />
          </button>
          <button type="button" className="miniAppButton miniAppButtonGhost attachmentActionIconButton isDownload" aria-label="Скачать">
            <UIPreviewActionIcon kind="download" />
          </button>
          <button type="button" className="miniAppButton miniAppButtonGhost attachmentActionIconButton isDelete" aria-label="Удалить">
            <UIPreviewActionIcon kind="delete" />
          </button>
        </div>
      );
    case "admin-tab":
      return (
        <div className="adminUiPreviewInline isTabs">
          <span className="adminTabButton isActive">Доступ</span>
          <span className="adminTabButton">Стиль</span>
        </div>
      );
    case "badge-default":
      return (
        <div className="adminUiPreviewInline">
          <span className="badge">В работе</span>
          <span className="badge">13.04</span>
        </div>
      );
    case "badge-date":
      return (
        <div className="adminUiPreviewInline">
          <span className="badge drawerDateBadge">21.04</span>
          <span className="badge drawerDateBadge">25.04</span>
        </div>
      );
    case "admin-count":
      return (
        <div className="adminUiPreviewInline">
          <span className="adminCountBadge">24</span>
          <span className="adminCountBadge">128</span>
        </div>
      );
    case "admin-link-status":
      return (
        <div className="adminUiPreviewInline">
          <span className="adminLinkStatusBadge isActive">Активна</span>
          <span className="adminLinkStatusBadge isRevoked">Отозвана</span>
        </div>
      );
    case "miniapp-due":
      return (
        <div className="adminUiPreviewInline isMobile">
          <span className="miniAppTaskDueBubble">сегодня</span>
          <span className="miniAppTaskDueBubble">27.03</span>
        </div>
      );
    case "attachment-count":
      return (
        <div className="adminUiPreviewInline">
          <span className="badge attachmentCountBadge">3</span>
          <span className="badge attachmentCountBadge">12</span>
        </div>
      );
    case "label-title":
      return (
        <div className="adminUiPreviewText">
          <div className="pageTitle" style={{ fontSize: 20 }}>Панель доступа</div>
          <div className="muted">Крупный заголовок раздела</div>
        </div>
      );
    case "label-muted":
      return (
        <div className="adminUiPreviewText">
          <div className="muted">Служебная подпись для описаний, статуса и help-copy.</div>
        </div>
      );
    case "label-miniapp-title":
      return (
        <div className="adminUiPreviewText">
          <div className="miniAppTaskTitle">Собрать титры для эфира</div>
          <div className="miniAppProfileMeta">Мобильный strong label</div>
        </div>
      );
    case "label-drawer-section":
      return (
        <div className="adminUiPreviewText">
          <div className="drawerSectionTitle">Вложения</div>
          <div className="muted">Заголовок вложенного блока</div>
        </div>
      );
    case "label-designer-name":
      return (
        <div className="adminUiPreviewText">
          <div className="designerColumnName">
            <span className="designerColumnNameLine">Иванов</span>
            <span className="designerColumnNameLine">Марк</span>
          </div>
        </div>
      );
    case "panel-card":
      return (
        <div className="card adminUiPreviewSurface">
          <div className="pageTitle" style={{ fontSize: 16 }}>Glass card</div>
          <div className="muted">Базовая surface проекта</div>
        </div>
      );
    case "panel-drawer":
      return (
        <div className="card drawerSection adminUiPreviewSurface">
          <div className="drawerSectionTitle">Календарь</div>
          <div className="muted">Вложенная секция drawer</div>
        </div>
      );
    case "panel-designer-task":
      return (
        <button type="button" className="designerTaskCard adminUiPreviewSurfaceButton" title="Карточка дизайнера">
          <div className="designerTaskBrand">Luxe</div>
          <div className="designerTaskMeta">
            <span className="badge">KV</span>
            <span className="designerTaskShow">Весна</span>
          </div>
        </button>
      );
    case "panel-miniapp-task":
      return (
        <button type="button" className="miniAppTaskCard miniAppTaskCardCompact adminUiPreviewSurfaceButton" title="Mini App card">
          <div className="miniAppTaskRowMain">
            <div className="miniAppTaskRowFields">Лента | Анна | KV</div>
            <span className="miniAppTaskDueBubble">25.03</span>
          </div>
        </button>
      );
    case "panel-admin-link":
      return (
        <div className="adminAccessLinkCard adminUiPreviewSurface">
          <div className="adminAccessLinkHeader">
            <div className="adminUserName">Весенний viewer</div>
            <div className="adminLinkStatusBadge isActive">Активна</div>
          </div>
          <div className="adminAccessLinkMeta">
            <span>Осталось: 3 д 5 ч</span>
          </div>
        </div>
      );
    case "panel-workbench":
      return (
        <div className="workbenchBody adminUiPreviewWorkbench">
          <div className="wbToolbar">
            <span className="muted">Workbench surface</span>
          </div>
          <div className="wbGroup">
            <h4>Buttons</h4>
          </div>
        </div>
      );
    default:
      return <div className="adminUiPreviewText"><div className="muted">Preview not configured</div></div>;
  }
}

function UIStyleRow(props: { entry: UIStyleEntry; active: boolean; onSelect: () => void }) {
  return (
    <div
      className={`adminUiRow ${props.active ? "isActive" : ""}`}
      role="button"
      tabIndex={0}
      onClick={props.onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onSelect();
        }
      }}
    >
      <div className="adminUiRowMain">
        <div className="adminUiRowIdentity">
          <div className="adminUiRowTitle">{props.entry.title}</div>
          <div className="adminUiRowId">{props.entry.id}</div>
        </div>
        <div className="adminUiRowDescription">{props.entry.description}</div>
        <div className="adminUiRowUsage">
          {props.entry.usedIn.map((usage) => (
            <span key={usage} className="adminUiUsagePill">{usage}</span>
          ))}
        </div>
        <div className="adminUiRowSource">{props.entry.sourcePath.replace("apps/web/src/", "")}</div>
      </div>
      <div className="adminUiRowPreview">
        <UIStylePreview entry={props.entry} />
      </div>
      <div className={`adminUiCardStatus ${props.entry.deprecated ? "isLegacy" : ""}`}>{uiStatusLabel(props.entry)}</div>
    </div>
  );
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
  const [orderedPendingUsers, setOrderedPendingUsers] = React.useState<AdminUserCard[]>([]);
  const [orderedApprovedUsers, setOrderedApprovedUsers] = React.useState<AdminUserCard[]>([]);
  const [orderedColorPresets, setOrderedColorPresets] = React.useState<PresetCard[]>([]);
  const [orderedLayoutPresets, setOrderedLayoutPresets] = React.useState<PresetCard[]>([]);
  const [activeDrag, setActiveDrag] = React.useState<ActiveDrag | null>(null);
  const [topTab, setTopTab] = React.useState<AdminTopTab>(() => readStoredTab(ADMIN_TOP_TAB_KEY, ["access", "style"], "access"));
  const [accessTab, setAccessTab] = React.useState<AdminAccessTab>(() => readStoredTab(ADMIN_ACCESS_TAB_KEY, ["people", "links"], "people"));
  const [styleTab, setStyleTab] = React.useState<AdminStyleTab>(() => readStoredTab(ADMIN_STYLE_TAB_KEY, ["presets", "ui"], "presets"));
  const [uiGroup, setUiGroup] = React.useState<UIStyleGroup>("button");
  const [uiSurfaceFilter, setUiSurfaceFilter] = React.useState<string>("all");
  const [uiSearch, setUiSearch] = React.useState("");
  const [selectedUiId, setSelectedUiId] = React.useState<string>(() => UI_STYLE_REGISTRY[0]?.id ?? "");
  const [draftLinkLabel, setDraftLinkLabel] = React.useState("");
  const [draftLinkExpiryHours, setDraftLinkExpiryHours] = React.useState("72");
  const [linkDrafts, setLinkDrafts] = React.useState<Record<string, AccessLinkDraft>>({});
  const [, setLinksClock] = React.useState(() => Date.now());
  const importRef = React.useRef<HTMLInputElement | null>(null);
  const dragSnapshotRef = React.useRef<{ list: DragListKey; ids: string[] } | null>(null);

  const authSession = ctx?.authSession;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADMIN_TOP_TAB_KEY, topTab);
  }, [topTab]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADMIN_ACCESS_TAB_KEY, accessTab);
  }, [accessTab]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADMIN_STYLE_TAB_KEY, styleTab);
  }, [styleTab]);

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

  React.useEffect(() => {
    setOrderedPendingUsers(overview?.pendingUsers ?? []);
    setOrderedApprovedUsers(overview?.approvedUsers ?? []);
    setOrderedColorPresets(overview?.presets.color ?? []);
    setOrderedLayoutPresets(overview?.presets.layout ?? []);
    setLinkDrafts(
      Object.fromEntries(
        (overview?.accessLinks ?? []).map((link) => [
          link.id,
          {
            label: link.label,
            expiresAt: toDateTimeInputValue(link.expiresAt),
          },
        ])
      )
    );
  }, [overview]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setLinksClock(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const availableUiSurfaces = React.useMemo(() => {
    return Array.from(new Set(UI_STYLE_REGISTRY.flatMap((entry) => entry.usedIn))).sort((left, right) =>
      left.localeCompare(right, "ru")
    );
  }, []);

  const filteredUiEntries = React.useMemo(() => {
    const query = uiSearch.trim().toLowerCase();
    return UI_STYLE_REGISTRY.filter((entry) => {
      if (entry.group !== uiGroup) return false;
      if (uiSurfaceFilter !== "all" && !entry.usedIn.includes(uiSurfaceFilter)) return false;
      if (!query) return true;
      const haystack = [entry.id, entry.title, entry.description, entry.sourcePath, entry.similarityKey, ...entry.usedIn].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [uiGroup, uiSearch, uiSurfaceFilter]);

  const selectedUiEntry = React.useMemo(() => {
    const direct = filteredUiEntries.find((entry) => entry.id === selectedUiId);
    if (direct) return direct;
    return filteredUiEntries[0] ?? null;
  }, [filteredUiEntries, selectedUiId]);

  React.useEffect(() => {
    if (filteredUiEntries.some((entry) => entry.id === selectedUiId)) return;
    setSelectedUiId(filteredUiEntries[0]?.id ?? "");
  }, [filteredUiEntries, selectedUiId]);

  const getListItems = React.useCallback(
    (list: DragListKey) => {
      if (list === "pendingUsers") return orderedPendingUsers;
      if (list === "approvedUsers") return orderedApprovedUsers;
      if (list === "colorPresets") return orderedColorPresets;
      return orderedLayoutPresets;
    },
    [orderedApprovedUsers, orderedColorPresets, orderedLayoutPresets, orderedPendingUsers]
  );

  const getUserListById = React.useCallback(
    (id: string): "pendingUsers" | "approvedUsers" | null => {
      if (orderedPendingUsers.some((user) => user.id === id)) return "pendingUsers";
      if (orderedApprovedUsers.some((user) => user.id === id)) return "approvedUsers";
      return null;
    },
    [orderedApprovedUsers, orderedPendingUsers]
  );

  const getUserDropListByTargetId = React.useCallback(
    (targetId: string): "pendingUsers" | "approvedUsers" | null => {
      if (targetId === USER_DROP_ZONE_ID.pendingUsers) return "pendingUsers";
      if (targetId === USER_DROP_ZONE_ID.approvedUsers) return "approvedUsers";
      return getUserListById(targetId);
    },
    [getUserListById]
  );

  const setListItems = React.useCallback((list: DragListKey, nextItems: AdminUserCard[] | PresetCard[]) => {
    if (list === "pendingUsers") {
      setOrderedPendingUsers(nextItems as AdminUserCard[]);
      return;
    }
    if (list === "approvedUsers") {
      setOrderedApprovedUsers(nextItems as AdminUserCard[]);
      return;
    }
    if (list === "colorPresets") {
      setOrderedColorPresets(nextItems as PresetCard[]);
      return;
    }
    setOrderedLayoutPresets(nextItems as PresetCard[]);
  }, []);

  const persistListOrder = React.useCallback(async (list: DragListKey, ids: string[]) => {
    const res = await fetch(buildAuthUrl("/admin/layout-order"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ list, ids }),
    });
    await expectOk(res, "Не удалось сохранить порядок карточек");
  }, []);

  const handleDragStart = React.useCallback(
    (list: DragListKey, event: DragStartEvent) => {
      setActiveDrag({ list, id: String(event.active.id) });
      dragSnapshotRef.current = { list, ids: idsOf(getListItems(list) as Array<{ id: string }>) };
    },
    [getListItems]
  );

  const handleDragOver = React.useCallback(
    (list: DragListKey, event: DragOverEvent) => {
      if (!event.over) return;
      const activeId = String(event.active.id);
      const overId = String(event.over.id);
      if (activeId === overId) return;

      const currentItems = getListItems(list);
      const oldIndex = currentItems.findIndex((item) => item.id === activeId);
      const newIndex = currentItems.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      setListItems(list, arrayMove(currentItems as Array<{ id: string }>, oldIndex, newIndex) as AdminUserCard[] | PresetCard[]);
    },
    [getListItems, setListItems]
  );

  const handleDragEnd = React.useCallback(
    async (list: DragListKey, event: DragEndEvent) => {
      setActiveDrag(null);
      const snapshot = dragSnapshotRef.current;
      dragSnapshotRef.current = null;
      if (!event.over || !snapshot || snapshot.list !== list) return;

      const finalIds = idsOf(getListItems(list) as Array<{ id: string }>);
      if (arraysEqual(finalIds, snapshot.ids)) return;

      try {
        setActionError(null);
        await persistListOrder(list, finalIds);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Не удалось сохранить порядок карточек");
        await loadOverview();
      }
    },
    [getListItems, loadOverview, persistListOrder]
  );

  const handlePeopleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const list = getUserListById(String(event.active.id));
      if (!list) return;
      setActiveDrag({ list, id: String(event.active.id) });
      dragSnapshotRef.current = { list, ids: idsOf(getListItems(list) as Array<{ id: string }>) };
    },
    [getListItems, getUserListById]
  );

  const handlePeopleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      if (!event.over || !activeDrag) return;
      const sourceList = activeDrag.list;
      if (sourceList !== "pendingUsers" && sourceList !== "approvedUsers") return;
      const overId = String(event.over.id);
      const targetList = getUserDropListByTargetId(overId);
      if (!targetList || targetList !== sourceList) return;
      const activeId = String(event.active.id);
      if (activeId === overId) return;

      const currentItems = getListItems(sourceList);
      const oldIndex = currentItems.findIndex((item) => item.id === activeId);
      const newIndex = currentItems.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      setListItems(sourceList, arrayMove(currentItems as Array<{ id: string }>, oldIndex, newIndex) as AdminUserCard[]);
    },
    [activeDrag, getListItems, getUserDropListByTargetId, setListItems]
  );

  const handleDragCancel = React.useCallback(() => {
    const snapshot = dragSnapshotRef.current;
    dragSnapshotRef.current = null;
    setActiveDrag(null);
    if (!snapshot) return;
    const currentItems = getListItems(snapshot.list);
    setListItems(snapshot.list, orderItems(currentItems as Array<{ id: string }>, snapshot.ids) as AdminUserCard[] | PresetCard[]);
  }, [getListItems, setListItems]);

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

  const setAllTasks = React.useCallback(
    async (userId: string, enabled: boolean) => {
      const res = await fetch(buildAuthUrl(`/admin/users/${encodeURIComponent(userId)}/all-tasks`), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await expectOk(res, "Не удалось обновить доступ к задачам");
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

  const refreshDesignersDirectory = React.useCallback(async () => {
    const res = await fetch(buildAuthUrl("/admin/designers/refresh"), {
      method: "POST",
      credentials: "include",
    });
    await expectOk(res, "Не удалось обновить базу дизайнеров");
    await loadOverview();
  }, [loadOverview]);

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

  const copyBrowserLink = React.useCallback(async (url: string | null) => {
    if (!url) {
      throw new Error("Ссылка еще не опубликована для браузера.");
    }
    await navigator.clipboard.writeText(url);
  }, []);

  const createAccessLink = React.useCallback(async () => {
    const label = draftLinkLabel.trim();
    const expiresInHours = Number(draftLinkExpiryHours);
    if (!label) {
      throw new Error("Нужно указать название ссылки.");
    }
    if (!Number.isFinite(expiresInHours) || expiresInHours <= 0) {
      throw new Error("Срок действия должен быть положительным числом часов.");
    }
    const res = await fetch(buildAuthUrl("/admin/access-links"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ label, expiresInHours }),
    });
    await expectOk(res, "Не удалось создать временную ссылку");
    const payload = (await res.json()) as { link?: AccessLinkCard | null };
    setDraftLinkLabel("");
    setDraftLinkExpiryHours("72");
    if (payload.link?.browserUrl) {
      await copyBrowserLink(payload.link.browserUrl);
      setActionNotice("Ссылка создана и скопирована");
    }
    await loadOverview();
  }, [copyBrowserLink, draftLinkExpiryHours, draftLinkLabel, loadOverview]);

  const updateAccessLinkDraft = React.useCallback((linkId: string, patch: Partial<AccessLinkDraft>) => {
    setLinkDrafts((prev) => ({
      ...prev,
      [linkId]: {
        label: prev[linkId]?.label ?? "",
        expiresAt: prev[linkId]?.expiresAt ?? "",
        ...patch,
      },
    }));
  }, []);

  const saveAccessLink = React.useCallback(
    async (linkId: string) => {
      const draft = linkDrafts[linkId];
      if (!draft?.label.trim()) {
        throw new Error("Название ссылки не может быть пустым.");
      }
      if (!draft.expiresAt) {
        throw new Error("Укажите дату окончания ссылки.");
      }
      const expiresAt = new Date(draft.expiresAt);
      if (!Number.isFinite(expiresAt.getTime())) {
        throw new Error("Некорректная дата окончания ссылки.");
      }
      const res = await fetch(buildAuthUrl(`/admin/access-links/${encodeURIComponent(linkId)}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ label: draft.label.trim(), expiresAt: expiresAt.toISOString() }),
      });
      await expectOk(res, "Не удалось обновить временную ссылку");
      await loadOverview();
    },
    [linkDrafts, loadOverview]
  );

  const revokeAccessLink = React.useCallback(
    async (linkId: string) => {
      const res = await fetch(buildAuthUrl(`/admin/access-links/${encodeURIComponent(linkId)}/revoke`), {
        method: "POST",
        credentials: "include",
      });
      await expectOk(res, "Не удалось отозвать временную ссылку");
      await loadOverview();
    },
    [loadOverview]
  );

  const activateAccessLink = React.useCallback(
    async (linkId: string) => {
      const res = await fetch(buildAuthUrl(`/admin/access-links/${encodeURIComponent(linkId)}/activate`), {
        method: "POST",
        credentials: "include",
      });
      await expectOk(res, "Не удалось вернуть ссылку в активные");
      await loadOverview();
    },
    [loadOverview]
  );

  const handlePeopleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const snapshot = dragSnapshotRef.current;
      const sourceList = activeDrag?.list;
      setActiveDrag(null);
      dragSnapshotRef.current = null;
      if (!snapshot || !sourceList || (sourceList !== "pendingUsers" && sourceList !== "approvedUsers")) {
        return;
      }

      if (!event.over) {
        const currentItems = getListItems(snapshot.list);
        setListItems(snapshot.list, orderItems(currentItems as Array<{ id: string }>, snapshot.ids) as AdminUserCard[]);
        return;
      }

      const userId = String(event.active.id);
      const overId = String(event.over.id);
      const targetList = getUserDropListByTargetId(overId);
      if (!targetList) return;

      if (targetList === sourceList) {
        const finalIds = idsOf(getListItems(sourceList) as Array<{ id: string }>);
        if (arraysEqual(finalIds, snapshot.ids)) return;
        try {
          setActionError(null);
          await persistListOrder(sourceList, finalIds);
        } catch (err) {
          setActionError(err instanceof Error ? err.message : "Не удалось сохранить порядок карточек");
          await loadOverview();
        }
        return;
      }

      if (sourceList === "pendingUsers" && targetList === "approvedUsers") {
        await runAdminAction(() => approve(userId), "Пользователь одобрен");
        return;
      }

      if (sourceList === "approvedUsers" && targetList === "pendingUsers") {
        if (authSession?.state.user?.id === userId) {
          setActionError("Нельзя удалить самого себя из одобренных перетаскиванием.");
          await loadOverview();
          return;
        }
        await runAdminAction(() => revoke(userId), "Пользователь удален из одобренных");
      }
    },
    [activeDrag, approve, authSession?.state.user?.id, getListItems, getUserDropListByTargetId, loadOverview, persistListOrder, revoke, runAdminAction, setListItems]
  );

  const activeOverlay = React.useMemo(() => {
    if (!activeDrag) return null;
    const items = getListItems(activeDrag.list);
    return items.find((item) => item.id === activeDrag.id) ?? null;
  }, [activeDrag, getListItems]);

  if (!ctx) return null;

  const renderHeader = (
    <div className="pageHeader">
      <h3 className="pageTitle">Админка</h3>
      <button type="button" className="adminCloseButton" onClick={goToTimeline} aria-label="Вернуться на таймлайн" title="Вернуться на таймлайн">
        ×
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="card adminPageRoot">
        {renderHeader}
        <p className="muted">Загружаем доступ, пользователей и каталог пресетов...</p>
      </div>
    );
  }

  if (!authSession?.state.authenticated) {
    return (
      <div className="card adminPageRoot">
        {renderHeader}
        <p className="muted">Войдите через Яндекс, чтобы открыть админку.</p>
      </div>
    );
  }

  if (authSession.state.user?.role !== "admin") {
    return (
      <div className="card adminPageRoot">
        {renderHeader}
        <p className="muted">У вашей учетной записи нет прав администратора.</p>
      </div>
    );
  }

  const links = overview?.accessLinks ?? [];

  return (
    <div className="card adminPageRoot">
      {renderHeader}

      {error ? <p className="muted">{error}</p> : null}
      {actionError ? <p className="muted" style={{ color: "#ffb8c8" }}>{actionError}</p> : null}
      {actionNotice ? <p className="muted" style={{ color: "#9fe8c4" }}>{actionNotice}</p> : null}

      <div className="adminTabPanel">
        <div className="adminTabsRow">
          <AdminTabButton active={topTab === "access"} onClick={() => setTopTab("access")}>Доступ</AdminTabButton>
          <AdminTabButton active={topTab === "style"} onClick={() => setTopTab("style")}>Стиль</AdminTabButton>
        </div>
      </div>

      {topTab === "access" ? (
        <div className="adminSubtabPanel">
          <div className="adminTabsRow isSubtabs">
            <AdminTabButton active={accessTab === "people"} onClick={() => setAccessTab("people")}>Люди</AdminTabButton>
            <AdminTabButton active={accessTab === "links"} onClick={() => setAccessTab("links")}>Ссылки</AdminTabButton>
          </div>

          <div className="adminSubtabBody">
            {accessTab === "people" ? (
              <>
              <div className="adminSectionLead">
                <div className="muted">Одобрение пользователей, admin-роли, allowlist и синхронизация дизайнеров.</div>
              </div>

              <div className="grid2" style={{ alignItems: "start" }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handlePeopleDragStart} onDragOver={handlePeopleDragOver} onDragEnd={(event) => void handlePeopleDragEnd(event)} onDragCancel={handleDragCancel}>
                  <div className="card adminSectionCard">
                    <h4 className="pageTitle" style={{ fontSize: 22 }}>Ожидают одобрения</h4>
                    <SortableContext items={orderedPendingUsers.map((user) => user.id)} strategy={rectSortingStrategy}>
                      <DroppableUserColumn list="pendingUsers">
                        <div className="adminUserGrid adminUserGridTiles">
                          {orderedPendingUsers.map((user) => (
                            <SortableCard key={user.id} id={user.id} className="adminUserCard adminUserBrick">
                              <UserCardContent
                                user={user}
                                actions={
                                  <>
                                    <button type="button" onClick={() => void runAdminAction(() => approve(user.id), "Пользователь одобрен")}>Одобрить</button>
                                    <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => reject(user.id), "Заявка отклонена")}>Отклонить</button>
                                  </>
                                }
                              />
                            </SortableCard>
                          ))}
                          {!orderedPendingUsers.length ? <div className="muted">Нет пользователей, ожидающих одобрения.</div> : null}
                        </div>
                      </DroppableUserColumn>
                    </SortableContext>
                  </div>

                  <div className="card adminSectionCard">
                    <h4 className="pageTitle" style={{ fontSize: 22 }}>Одобренные пользователи</h4>
                    <SortableContext items={orderedApprovedUsers.map((user) => user.id)} strategy={rectSortingStrategy}>
                      <DroppableUserColumn list="approvedUsers">
                        <div className="adminUserGrid adminUserGridTiles">
                          {orderedApprovedUsers.map((user) => {
                            const isSelf = authSession.state.user?.id === user.id;
                            const isAdmin = user.role === "admin";
                            return (
                              <SortableCard key={user.id} id={user.id} className="adminUserCard adminUserBrick">
                                <UserCardContent
                                  user={user}
                                  roleText={isAdmin ? "Администратор" : "Пользователь"}
                                  roleClassName={isAdmin ? "isAdmin" : ""}
                                  actionClassName="adminUserActionsFitDelete"
                                  actions={
                                    <>
                                      <label className="adminUserToggle">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(user.canViewAllTasks)}
                                          onChange={(event) =>
                                            void runAdminAction(
                                              () => setAllTasks(user.id, event.target.checked),
                                              event.target.checked ? "Включён доступ ко всем задачам" : "Доступ к задачам ограничен"
                                            )
                                          }
                                          disabled={isSelf}
                                        />
                                        <span>Все задачи</span>
                                      </label>
                                      <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => revoke(user.id), "Пользователь удален из одобренных")} disabled={isSelf}>Удалить</button>
                                      <button type="button" className={`btn ${isAdmin ? "btnGhost" : ""}`} onClick={() => void runAdminAction(() => toggleAdminRole(user), isAdmin ? "Admin-роль снята" : "Admin-роль назначена")} disabled={isSelf}>
                                        {isAdmin ? "Убрать из админов" : "Сделать админом"}
                                      </button>
                                    </>
                                  }
                                />
                              </SortableCard>
                            );
                          })}
                          {!orderedApprovedUsers.length ? <div className="muted">Нет одобренных пользователей.</div> : null}
                        </div>
                      </DroppableUserColumn>
                    </SortableContext>
                  </div>
                </DndContext>
              </div>

              <div className="card adminSectionCard" style={{ marginTop: 16 }}>
                <div className="adminSectionLead compact">
                  <div>
                    <h4 className="pageTitle adminSectionTitle">Allowlist и синхронизация</h4>
                    <div className="muted">Email-список быстрого допуска и принудительное обновление linkage по designers base.</div>
                  </div>
                </div>
                <div className="adminAllowlistToolbar">
                  <input className="input" type="email" placeholder="email@example.com" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
                  <button type="button" onClick={() => void runAdminAction(addAllowlistEmail, "Email добавлен в allowlist")}>Добавить в allowlist</button>
                  <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(refreshDesignersDirectory, "База дизайнеров обновлена")}>Обновить базу дизайнеров</button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(overview?.allowlist ?? []).map((entry) => (
                    <div key={entry.email} className="tableRowGhost adminAllowlistRow">
                      <div>
                        <div><strong>{entry.email}</strong></div>
                        <div className="muted">{entry.comment || entry.source}</div>
                        <div className="muted">Добавлен: {formatDateTime(entry.createdAt)}</div>
                      </div>
                      <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => removeAllowlistEmail(entry.email), "Email удален из allowlist")}>Удалить</button>
                    </div>
                  ))}
                  {!overview?.allowlist?.length ? <div className="muted">Allowlist пуст.</div> : null}
                </div>
              </div>
              </>
            ) : (
              <>
              <div className="adminSectionLead">
                <div className="muted">Временные ссылки дают full viewer access без admin-прав. Каждое успешное открытие увеличивает useCount и попадает в журнал использования.</div>
              </div>

              <div className="grid2" style={{ alignItems: "start" }}>
                <div className="card adminSectionCard">
                  <h4 className="pageTitle" style={{ fontSize: 22 }}>Создание ссылки</h4>
                  <div className="adminLinkDraftGrid">
                    <label className="adminFieldStack">
                      <span className="muted">Название / оператор</span>
                      <input className="input" value={draftLinkLabel} onChange={(event) => setDraftLinkLabel(event.target.value)} placeholder="Например, Презентация для партнера" />
                    </label>
                    <label className="adminFieldStack">
                      <span className="muted">Срок действия, часы</span>
                      <input className="input" type="number" min={1} step={1} value={draftLinkExpiryHours} onChange={(event) => setDraftLinkExpiryHours(event.target.value)} />
                    </label>
                  </div>
                  <div className="adminLinkDraftActions">
                    <button type="button" onClick={() => void runAdminAction(createAccessLink, "Ссылка создана")}>Создать ссылку</button>
                    <div className="muted">После создания ссылка сразу копируется в буфер обмена.</div>
                  </div>
                </div>

                <div className="card adminSectionCard">
                  <h4 className="pageTitle" style={{ fontSize: 22 }}>Поведение ссылки</h4>
                  <div className="adminLinkChecklist">
                    <div className="tableRowGhost">Reusable viewer link до expiry или revoke.</div>
                    <div className="tableRowGhost">В auth-панели будет countdown до окончания действия ссылки.</div>
                    <div className="tableRowGhost">Ссылка ведёт в обычный web timeline и не даёт admin-права.</div>
                    <div className="tableRowGhost">Для каждой ссылки видны useCount, последний вход и журнал IP / city / client summary.</div>
                  </div>
                </div>
              </div>

              <div className="card adminSectionCard" style={{ marginTop: 16 }}>
                <div className="adminSectionLead compact">
                  <div>
                    <h4 className="pageTitle adminSectionTitle">Список временных ссылок</h4>
                    <div className="muted">Когда runtime включится, здесь будут активные, истекшие и отозванные ссылки с быстрым копированием.</div>
                  </div>
                  <div className="adminLinksSummary">
                    <span className="adminCountBadge">{links.length}</span>
                    <span className="muted">всего ссылок</span>
                  </div>
                </div>

                {links.length ? (
                  <div className="adminAccessLinkList">
                    {links.map((link) => (
                      <div key={link.id} className="adminAccessLinkCard">
                        <div className="adminAccessLinkHeader">
                          <div>
                            <div className="adminUserName">{link.label}</div>
                            <div className="muted">Создана: {formatDateTime(link.createdAt)}{link.createdBy ? ` • ${link.createdBy}` : ""}</div>
                          </div>
                          <div className={`adminLinkStatusBadge is${link.status[0].toUpperCase()}${link.status.slice(1)}`}>{statusLabel(link.status)}</div>
                        </div>
                        <div className="adminAccessLinkMeta">
                          <span>Истекает: {formatDateTime(link.expiresAt)}</span>
                          <span>Осталось: {formatRemainingTime(link.expiresAt)}</span>
                          <span>Использований: {link.useCount}</span>
                          <span>Последний вход: {formatDateTime(link.lastUsedAt)}</span>
                        </div>
                        <div className="adminLinkDraftGrid">
                          <label className="adminFieldStack">
                            <span className="muted">Название</span>
                            <input
                              className="input"
                              value={linkDrafts[link.id]?.label ?? link.label}
                              onChange={(event) => updateAccessLinkDraft(link.id, { label: event.target.value })}
                            />
                          </label>
                          <label className="adminFieldStack">
                            <span className="muted">Действует до</span>
                            <input
                              className="input"
                              type="datetime-local"
                              value={linkDrafts[link.id]?.expiresAt ?? toDateTimeInputValue(link.expiresAt)}
                              onChange={(event) => updateAccessLinkDraft(link.id, { expiresAt: event.target.value })}
                            />
                          </label>
                        </div>
                        <div className="adminAccessLinkActions">
                          <button
                            type="button"
                            className="btn btnGhost"
                            onClick={() =>
                              void runAdminAction(
                                () => (link.status === "revoked" ? activateAccessLink(link.id) : revokeAccessLink(link.id)),
                                link.status === "revoked" ? "Ссылка снова активна" : "Ссылка отозвана"
                              )
                            }
                          >
                            {link.status === "revoked" ? "Вернуть" : "Отозвать"}
                          </button>
                          <button type="button" onClick={() => void runAdminAction(() => copyBrowserLink(link.browserUrl), "Ссылка скопирована")} disabled={!link.browserUrl}>Копировать</button>
                          <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => saveAccessLink(link.id), "Ссылка обновлена")}>Сохранить</button>
                          <button
                            type="button"
                            className="btn btnGhost"
                            onClick={() =>
                              void runAdminAction(
                                async () => {
                                  await fetch(buildAuthUrl(`/admin/access-links/${encodeURIComponent(link.id)}/delete`), {
                                    method: "POST",
                                    credentials: "include",
                                  }).then((res) => expectOk(res, "Не удалось удалить временную ссылку"));
                                  await loadOverview();
                                },
                                "Ссылка удалена"
                              )
                            }
                          >
                            Удалить
                          </button>
                        </div>
                        <details className="adminLinkDetails">
                          <summary>Статистика и журнал</summary>
                          {link.usageEvents.length ? (
                            <div className="adminAccessLinkEvents">
                              {link.usageEvents.map((event) => (
                                <div key={event.id} className="tableRowGhost">
                                  <div><strong>{formatDateTime(event.usedAt)}</strong></div>
                                  <div className="muted">IP: {event.ip || "-"}</div>
                                  <div className="muted">Город: {event.city || "-"}</div>
                                  <div className="muted">{event.clientSummary || "Client summary появится из backend best-effort metadata."}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="muted">Пока нет usage events по этой ссылке.</div>
                          )}
                        </details>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="adminStubEmptyState">
                    <div className="adminStubEmptyIcon" aria-hidden="true">⧉</div>
                    <div>
                      <div className="adminUserName">Временные ссылки еще не заведены</div>
                      <div className="muted">Создай первую reusable viewer ссылку выше. После redemption она даст full unmasked viewer access и покажет usage stats здесь же.</div>
                    </div>
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="adminSubtabPanel">
          <div className="adminTabsRow isSubtabs">
            <AdminTabButton active={styleTab === "presets"} onClick={() => setStyleTab("presets")}>Пресеты</AdminTabButton>
            <AdminTabButton active={styleTab === "ui"} onClick={() => setStyleTab("ui")}>UI</AdminTabButton>
          </div>

          <div className="adminSubtabBody">
            {styleTab === "presets" ? (
              <div className="card adminSectionCard">
                <div className="pageHeader" style={{ marginBottom: 12 }}>
                  <h4 className="pageTitle" style={{ fontSize: 22 }}>Пресеты</h4>
                </div>
                <div className="adminPresetToolbar">
                  <button type="button" className="btn btnGhost" onClick={() => { setPendingImportKind("color"); importRef.current?.click(); }}>Импортировать color preset</button>
                  <button type="button" className="btn btnGhost" onClick={() => { setPendingImportKind("layout"); importRef.current?.click(); }}>Импортировать layout preset</button>
                </div>
                <div className="grid2 adminPresetSplit" style={{ alignItems: "start" }}>
                  <div className="card adminPresetColumn">
                    <h4 className="pageTitle" style={{ fontSize: 20 }}>Цветовые пресеты</h4>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => handleDragStart("colorPresets", event)} onDragOver={(event) => handleDragOver("colorPresets", event)} onDragEnd={(event) => void handleDragEnd("colorPresets", event)} onDragCancel={handleDragCancel}>
                      <SortableContext items={orderedColorPresets.map((preset) => preset.id)} strategy={rectSortingStrategy}>
                        <div className="adminUserGrid adminPresetGrid">
                          {orderedColorPresets.map((preset) => (
                            <SortableCard key={preset.id} id={preset.id} className="adminUserCard adminUserBrick adminPresetBrick">
                              <PresetCardContent
                                preset={preset}
                                actions={
                                  <>
                                    <button type="button" onClick={() => void runAdminAction(() => setDefaultPreset(preset), "Preset по умолчанию обновлён")}>Сделать default</button>
                                    <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => exportPreset(preset), "Preset экспортирован")}>Экспорт</button>
                                    <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => deletePreset(preset.id), "Preset удалён")}>Удалить</button>
                                  </>
                                }
                              />
                            </SortableCard>
                          ))}
                          {!orderedColorPresets.length ? <div className="muted">Пока нет color preset-ов.</div> : null}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>

                  <div className="card adminPresetColumn">
                    <h4 className="pageTitle" style={{ fontSize: 20 }}>UI / Layout пресеты</h4>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => handleDragStart("layoutPresets", event)} onDragOver={(event) => handleDragOver("layoutPresets", event)} onDragEnd={(event) => void handleDragEnd("layoutPresets", event)} onDragCancel={handleDragCancel}>
                      <SortableContext items={orderedLayoutPresets.map((preset) => preset.id)} strategy={rectSortingStrategy}>
                        <div className="adminUserGrid adminPresetGrid">
                          {orderedLayoutPresets.map((preset) => (
                            <SortableCard key={preset.id} id={preset.id} className="adminUserCard adminUserBrick adminPresetBrick">
                              <PresetCardContent
                                preset={preset}
                                actions={
                                  <>
                                    <button type="button" onClick={() => void runAdminAction(() => setDefaultPreset(preset), "Preset по умолчанию обновлён")}>Сделать default</button>
                                    <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => exportPreset(preset), "Preset экспортирован")}>Экспорт</button>
                                    <button type="button" className="btn btnGhost" onClick={() => void runAdminAction(() => deletePreset(preset.id), "Preset удалён")}>Удалить</button>
                                  </>
                                }
                              />
                            </SortableCard>
                          ))}
                          {!orderedLayoutPresets.length ? <div className="muted">Пока нет layout preset-ов.</div> : null}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>

                <input ref={importRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void runAdminAction(() => importPreset(file, pendingImportKind), "Preset импортирован");
                  event.target.value = "";
                }} />
              </div>
            ) : (
              <div className="card adminSectionCard">
                <div className="adminSectionLead">
                  <div className="muted">
                    Реестр собирает реальные элементы проекта из desktop, Mini App, drawer, attachments, admin и workbench.
                    Список нужен для visual-аудита и последующей унификации похожих паттернов.
                  </div>
                </div>
                <div className="adminUiToolbar">
                  <div className="adminUiToolbarPrimary">
                    <div className="adminUiGroupTabs">
                      {UI_GROUP_ORDER.map((group) => (
                        <button key={group} type="button" className={`adminUiGroupTab ${uiGroup === group ? "isActive" : ""}`} onClick={() => setUiGroup(group)}>
                          {UI_STYLE_GROUP_LABELS[group]}
                        </button>
                      ))}
                    </div>
                    <label className="adminUiSearch">
                      <span className="muted">Поиск по id, названию, описанию, usage и source path</span>
                      <input className="input" value={uiSearch} onChange={(event) => setUiSearch(event.target.value)} placeholder="drawer, miniapp, badge, AdminPage.tsx" />
                    </label>
                  </div>
                  <div className="adminUiToolbarSecondary">
                    <label className="adminFieldStack adminUiSurfaceFilter">
                      <span className="muted">Поверхность</span>
                      <select value={uiSurfaceFilter} onChange={(event) => setUiSurfaceFilter(event.target.value)}>
                        <option value="all">Все поверхности</option>
                        {availableUiSurfaces.map((surface) => (
                          <option key={surface} value={surface}>
                            {surface}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="adminUiSummaryRow">
                  <div className="muted">
                    Это read-only inventory: здесь показываются реальные элементы проекта в порядке похожести, без runtime overrides и без генератора.
                  </div>
                  <div className="adminLinksSummary">
                    <span className="adminCountBadge">{filteredUiEntries.length}</span>
                    <span className="muted">элементов</span>
                  </div>
                </div>
                <div className="adminUiSplit">
                  <div className="adminUiRegistryPane">
                    <div className="adminUiRegistryList">
                      {filteredUiEntries.map((entry) => (
                        <UIStyleRow key={entry.id} entry={entry} active={selectedUiEntry?.id === entry.id} onSelect={() => setSelectedUiId(entry.id)} />
                      ))}
                      {!filteredUiEntries.length ? (
                        <div className="adminUiEmptyState">
                          <div className="adminStubEmptyIcon" aria-hidden="true">⌕</div>
                          <div>
                            <div className="adminUserName">Ничего не найдено</div>
                            <div className="muted">Смени группу, поверхность или поисковый запрос, чтобы увидеть другие UI-элементы.</div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="card adminUiInspector">
                    {selectedUiEntry ? (
                      <>
                        <div className="adminUiInspectorHeader">
                          <div>
                            <div className="adminUiInspectorEyebrow">{UI_STYLE_GROUP_LABELS[selectedUiEntry.group]}</div>
                            <h4 className="pageTitle" style={{ fontSize: 22 }}>{selectedUiEntry.title}</h4>
                            <div className="muted adminUiInspectorId">{selectedUiEntry.id}</div>
                          </div>
                          <div className={`adminUiCardStatus ${selectedUiEntry.deprecated ? "isLegacy" : ""}`}>
                            {uiStatusLabel(selectedUiEntry)}
                          </div>
                        </div>
                        <div className="adminUiInspectorPreview">
                          <UIStylePreview entry={selectedUiEntry} />
                        </div>
                        <div className="adminUiInspectorBlock">
                          <div className="adminUiInspectorBlockTitle">Описание</div>
                          <div className="muted">{selectedUiEntry.description}</div>
                        </div>
                        <div className="adminUiInspectorBlock">
                          <div className="adminUiInspectorBlockTitle">Где используется</div>
                          <div className="adminUiUsageList isDetailed">
                            {selectedUiEntry.usedIn.map((usage) => (
                              <span key={usage} className="adminUiUsagePill">{usage}</span>
                            ))}
                          </div>
                        </div>
                        <div className="adminUiInspectorBlock">
                          <div className="adminUiInspectorBlockTitle">Source path</div>
                          <div className="muted adminUiInspectorPath">{selectedUiEntry.sourcePath}</div>
                        </div>
                        <div className="adminUiInspectorBlock">
                          <div className="adminUiInspectorBlockTitle">Similarity key</div>
                          <div className="muted">{selectedUiEntry.similarityKey}</div>
                        </div>
                        <div className="adminUiInspectorBlock">
                          <div className="adminUiInspectorBlockTitle">Ключевые props</div>
                          <div className="adminUiPropsTable">
                            {Object.entries(selectedUiEntry.propsSummary).map(([key, value]) => (
                              <div key={key} className="adminUiPropRow">
                                <span className="adminUiPropKey">{key}</span>
                                <span className="adminUiPropValue">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="adminUiInspectorBlock">
                          <div className="adminUiInspectorBlockTitle">Контекст унификации</div>
                          <div className="muted">
                            Порядок внутри группы курируется вручную по похожести, чтобы рядом лежали почти одинаковые паттерны и их было легче сливать в следующей волне.
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="adminUiEmptyState">
                        <div className="adminStubEmptyIcon" aria-hidden="true">⌕</div>
                        <div>
                          <div className="adminUserName">Выбери UI-элемент</div>
                          <div className="muted">Inspector покажет source path, usage, similarity key и ключевые props выбранного элемента.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {typeof document !== "undefined"
        ? createPortal(
            <DragOverlay>
              {activeDrag && activeOverlay
                ? activeDrag.list === "pendingUsers" || activeDrag.list === "approvedUsers"
                  ? (
                    <div className="adminUserCard adminUserBrick isOverlay">
                      <UserCardContent
                        user={activeOverlay as AdminUserCard}
                        roleText={activeDrag.list === "approvedUsers" ? ((activeOverlay as AdminUserCard).role === "admin" ? "Администратор" : "Пользователь") : undefined}
                        roleClassName={activeDrag.list === "approvedUsers" && (activeOverlay as AdminUserCard).role === "admin" ? "isAdmin" : undefined}
                        actions={null}
                      />
                    </div>
                  )
                  : (
                    <div className="adminUserCard adminUserBrick adminPresetBrick isOverlay">
                      <PresetCardContent preset={activeOverlay as PresetCard} actions={null} />
                    </div>
                  )
                : null}
            </DragOverlay>,
            document.body
          )
        : null}
    </div>
  );
}
