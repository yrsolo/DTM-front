import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "../components/Layout";
import { DesignersPage } from "../pages/DesignersPage";
import { TasksPage } from "../pages/TasksPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/designers" replace />} />
        <Route path="/designers" element={<DesignersPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="*" element={<Navigate to="/designers" replace />} />
      </Routes>
    </Layout>
  );
}
