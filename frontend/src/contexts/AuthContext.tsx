"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authApi } from "../lib/api"
import { useNavigate } from 'react-router-dom'

interface User {
  id: string
  email: string
  name: string
  profile_id?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const validateToken = async (_token: string): Promise<boolean> => {
    try {
      const response = await authApi.getMe()

      if (response && response.success && response.user) {
        setUser(response.user)
        return true
      }
      
      return false
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("authToken")
        return false
      }
      
      return false
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("authToken")

      if (token) {
        await validateToken(token)
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const response = await authApi.login(email, password)

      if (response && response.success && response.token && response.user) {
        localStorage.setItem("authToken", response.token)
        setUser(response.user)
        setIsLoading(false)
        return true
      }
      
      setIsLoading(false)
      return false
    } catch (error: any) {
      setIsLoading(false)
      return false
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const response = await authApi.register(name, email, password)

      if (response && response.success && response.token && response.user) {
        localStorage.setItem("authToken", response.token)
        setUser(response.user)
        setIsLoading(false)
        navigate("/dashboard")
        return true
      }
      
      setIsLoading(false)
      return false
    } catch (error: any) {
      setIsLoading(false)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("authToken")
    setUser(null)
    navigate("/login")
  }

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isLoading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}