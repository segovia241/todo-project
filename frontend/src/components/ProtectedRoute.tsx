"use client"

import type React from "react"

import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0dab76]"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
