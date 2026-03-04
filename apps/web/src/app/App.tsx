import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "../components/Layout";
import { TasksPage } from "../pages/TasksPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </Layout>
  );
}
