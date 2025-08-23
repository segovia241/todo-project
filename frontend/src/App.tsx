import type React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { TaskProvider } from "./contexts/TaskContext"
import { LoginForm } from "./components/auth/LoginForm"
import { RegisterForm } from "./components/auth/RegisterForm"
import ProtectedRoute from "./components/ProtectedRoute"
import Dashboard from "./components/dashboard/Dashboard"

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
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </TaskProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
