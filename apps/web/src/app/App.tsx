import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "../components/Layout";
import { getFrontendBasePath } from "../config/runtimeContour";
import { AdminPage } from "../pages/AdminPage";
import { TimelinePage } from "../pages/TimelinePage";

export function App() {
  const frontendBasePath = getFrontendBasePath();
  return (
    <BrowserRouter basename={frontendBasePath === "/" ? undefined : frontendBasePath.replace(/\/$/, "")}>
      <Layout>
        <Routes>
          <Route path="/" element={<TimelinePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
