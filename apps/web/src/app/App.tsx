import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Layout } from "../components/Layout";
import { getFrontendBasePath } from "../config/runtimeContour";
import { AdminPage } from "../pages/AdminPage";
import { MiniAppPage, MobileWebPage } from "../pages/MiniAppPage";
import { PromoPage } from "../pages/PromoPage";
import { TimelinePage } from "../pages/TimelinePage";

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
  return <TimelinePage />;
}

export function App() {
  const frontendBasePath = getFrontendBasePath();
  return (
    <BrowserRouter basename={frontendBasePath === "/" ? undefined : frontendBasePath.replace(/\/$/, "")}>
      <Layout>
        <Routes>
          <Route path="/" element={<TimelineEntryPage />} />
          <Route path="/promo" element={<PromoPage />} />
          <Route path="/app" element={<MiniAppPage />} />
          <Route path="/m" element={<MobileWebPage />} />
          <Route path="/mobile" element={<MobileWebPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
