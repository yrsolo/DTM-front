import React from "react";

export type MiniAppTab = "tasks" | "timeline" | "profile";

export function MiniAppShell(props: {
  currentTab: MiniAppTab;
  onTabChange: (tab: MiniAppTab) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="miniAppShell">
      <main className="miniAppMain">{props.children}</main>
      <nav className="miniAppBottomNav" aria-label="Mini app navigation">
        <button
          type="button"
          className={`miniAppNavButton ${props.currentTab === "tasks" ? "isActive" : ""}`}
          onClick={() => props.onTabChange("tasks")}
        >
          Задачи
        </button>
        <button
          type="button"
          className={`miniAppNavButton ${props.currentTab === "timeline" ? "isActive" : ""}`}
          onClick={() => props.onTabChange("timeline")}
        >
          Таймлайн
        </button>
        <button
          type="button"
          className={`miniAppNavButton ${props.currentTab === "profile" ? "isActive" : ""}`}
          onClick={() => props.onTabChange("profile")}
        >
          Профиль
        </button>
      </nav>
    </div>
  );
}
