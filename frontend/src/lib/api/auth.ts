import { API_BASE_URL, handleApiResponse } from "../config"
import type { ApiResponse } from "../types"

export const authApi = {
  async login(email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await handleApiResponse(response)

      if (data.token && data.user_id) {
        return {
          success: true,
          token: data.token,
          user: {
            id: data.user_id,
            email: email,
            name: email.split("@")[0],
          },
        }
      }

      return {
        success: false,
        message: data.message || "Login failed",
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Login failed",
      }
    }
  },

  async register(name: string, email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await handleApiResponse(response)

      if (data.user_id) {
        const loginResponse = await this.login(email, password)
        if (loginResponse.success) {
          return {
            success: true,
            token: loginResponse.token,
            user: loginResponse.user,
            message: data.message || "Registration successful",
          }
        }
      }

      return {
        success: false,
        message: data.message || "Registration failed",
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Registration failed",
      }
    }
  },

  async getMe(): Promise<ApiResponse> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        throw new Error("No auth token found")
      }

      const response = await fetch(`${API_BASE_URL}/me/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await handleApiResponse(response)

      return {
        success: true,
        user: {
          id: data.id,
          email: data.email,
          name: data.profile_name || data.email.split("@")[0],
          profile_id: data.profile_id,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get user data",
      }
    }
  },
}