import { API_BASE_URL, createAuthHeaders, handleApiResponse } from "../config"
import type { ApiResponse } from "../types"

export const projectApi = {
  async getProjects(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "GET",
        headers: createAuthHeaders(),
      })

      const data = await handleApiResponse(response)

      return {
        success: true,
        data: data.projects || [],
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch projects",
        data: [],
      }
    }
  },

  async getProject(id: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: "GET",
        headers: createAuthHeaders(),
      })

      const data = await handleApiResponse(response)

      return {
        success: true,
        data: data.project,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch project",
      }
    }
  },

  async createProject(project: any): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: createAuthHeaders("POST"),
        body: JSON.stringify({
          name: project.name,
          color: project.color,
        }),
      })

      const data = await handleApiResponse(response)

      return {
        success: true,
        data: { id: data.project_id },
        message: data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create project",
      }
    }
  },

  async updateProject(id: string, updates: any): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: "PUT",
        headers: createAuthHeaders("PUT"),
        body: JSON.stringify(updates),
      })

      const data = await handleApiResponse(response)

      return {
        success: data.updated || false,
        message: data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update project",
      }
    }
  },

  async deleteProject(id: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: "DELETE",
        headers: createAuthHeaders("DELETE"),
      })

      const data = await handleApiResponse(response)

      return {
        success: data.deleted || false,
        message: data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete project",
      }
    }
  },
}
