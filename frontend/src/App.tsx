import type React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { TaskProvider } from "./contexts/TaskContext"
import { LoginForm } from "./components/auth/LoginForm"
import { RegisterForm } from "./components/auth/RegisterForm"
import ProtectedRoute from "./components/ProtectedRoute"
import Dashboard from "./components/dashboard/Dashboard"

// Componente para redirigir a dashboard con parámetros por defecto si faltan
const DashboardRedirect: React.FC = () => {
  const location = useLocation();
  
  // Parsear los parámetros de consulta existentes
  const searchParams = new URLSearchParams(location.search);
  const hasPage = searchParams.has('page');
  const hasLimit = searchParams.has('limit');
  
  // Si faltan page o limit, redirigir con los valores por defecto
  if (!hasPage || !hasLimit) {
    // Mantener todos los parámetros existentes
    if (!hasPage) searchParams.set('page', '1');
    if (!hasLimit) searchParams.set('limit', '5');
    
    const newSearch = searchParams.toString();
    return <Navigate to={`/dashboard?${newSearch}`} replace />;
  }
  
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
};

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="bg-background">
      <main className="w-full">{children}</main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <TaskProvider>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard?page=1&limit=5" replace />} />
          </Routes>
        </TaskProvider>
      </AuthProvider>
    </Router>
  )
}

export default App