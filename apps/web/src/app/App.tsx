import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Layout } from "../components/Layout";
import { getFrontendBasePath } from "../config/runtimeContour";
import { InspectorNodeBoundary } from "../inspector-integration/boundary";
import { getWorkbenchInspectorActivation } from "../inspector-integration/activation";
import { AdminPage } from "../pages/AdminPage";
import { MiniAppPage, MobileWebPage } from "../pages/MiniAppPage";
import { TimelinePage } from "../pages/TimelinePage";

const LazyWorkbenchInspectorMount = React.lazy(() =>
  import("../inspector-integration").then((module) => ({ default: module.WorkbenchInspectorMount }))
);

const FormatSortPage = React.lazy(() =>
  import("../pages/FormatSortPage").then((module) => ({ default: module.FormatSortPage }))
);
const DesignerSortPage = React.lazy(() =>
  import("../pages/DesignerSortPage").then((module) => ({ default: module.DesignerSortPage }))
);
const AnalyticsPage = React.lazy(() =>
  import("../pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage }))
);
const PromoPage = React.lazy(() =>
  import("../pages/PromoPage").then((module) => ({ default: module.PromoPage }))
);
const PromoDraftPage = React.lazy(() =>
  import("../pages/PromoDraftPage").then((module) => ({ default: module.PromoDraftPage }))
);

function isTabletUserAgent(userAgent: string): boolean {
  return /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(userAgent);
}

function isPhoneUserAgent(userAgent: string): boolean {
  return /iPhone|iPod|Windows Phone|Android.*Mobile|webOS|BlackBerry|Opera Mini|Mobile/i.test(userAgent);
}

function shouldOpenMobileWeb(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  const shortestSide = Math.min(window.screen.width || window.innerWidth, window.screen.height || window.innerHeight);
  const longestSide = Math.max(window.screen.width || window.innerWidth, window.screen.height || window.innerHeight);
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const tabletByUserAgent = isTabletUserAgent(userAgent);
  const phoneByUserAgent = isPhoneUserAgent(userAgent);
  const tabletByGeometry = coarsePointer && shortestSide >= 768 && longestSide >= 1024;
  if (tabletByUserAgent || tabletByGeometry) return false;
  if (phoneByUserAgent) return true;
  return coarsePointer && shortestSide < 768;
}

function TimelineEntryPage() {
  const location = useLocation();
  if (shouldOpenMobileWeb()) {
    return <Navigate to={`/m${location.search}${location.hash}`} replace />;
  }
  return (
    <InspectorNodeBoundary label="Timeline route" kind="content" sourcePath="apps/web/src/app/App.tsx">
      <TimelinePage />
    </InspectorNodeBoundary>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TimelineEntryPage />} />
      <Route
        path="/promo"
        element={
          <React.Suspense fallback={<div className="card">Loading promo...</div>}>
            <PromoPage />
          </React.Suspense>
        }
      />
      <Route
        path="/promo-draft"
        element={
          <React.Suspense fallback={<div className="card">Loading promo draft...</div>}>
            <PromoDraftPage />
          </React.Suspense>
        }
      />
      <Route
        path="/format-sort"
        element={
          <React.Suspense fallback={<div className="card">Loading format lab...</div>}>
            <FormatSortPage />
          </React.Suspense>
        }
      />
      <Route
        path="/designer-sort"
        element={
          <React.Suspense fallback={<div className="card">Loading designer lab...</div>}>
            <DesignerSortPage />
          </React.Suspense>
        }
      />
      <Route
        path="/analytics"
        element={
          <React.Suspense fallback={<div className="card">Loading analytics...</div>}>
            <AnalyticsPage />
          </React.Suspense>
        }
      />
      <Route path="/app" element={<MiniAppPage />} />
      <Route path="/m" element={<MobileWebPage />} />
      <Route path="/mobile" element={<MobileWebPage />} />
      <Route
        path="/admin"
        element={
          <InspectorNodeBoundary label="Admin route" kind="content" sourcePath="apps/web/src/app/App.tsx">
            <AdminPage />
          </InspectorNodeBoundary>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  const frontendBasePath = getFrontendBasePath();
  const inspectorActivation = React.useMemo(() => getWorkbenchInspectorActivation(), []);
  return (
    <BrowserRouter basename={frontendBasePath === "/" ? undefined : frontendBasePath.replace(/\/$/, "")}>
      <Layout
        inspectorMount={
          inspectorActivation.enabled ? (
            <React.Suspense fallback={null}>
              <LazyWorkbenchInspectorMount />
            </React.Suspense>
          ) : null
        }
      >
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  );
}
