import { API_BASE_URL, createAuthHeaders, handleApiResponse } from "../config"
import type { ApiResponse } from "../types"

export const tagApi = {
  async getTags(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/tags`, {
        method: "GET",
        headers: createAuthHeaders(),
      })

      const data = await handleApiResponse(response)

      return {
        success: true,
        data: data.tags || [],
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch tags",
        data: [],
      }
    }
  },

  async createTag(tag: any): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/tags`, {
        method: "POST",
        headers: createAuthHeaders("POST"),
        body: JSON.stringify({
          normalized_name: tag.normalized_name,
          display_name: tag.display_name,
          color: tag.color,
        }),
      })

      const data = await handleApiResponse(response)

      return {
        success: true,
        data: { id: data.tag_id },
        message: data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create tag",
      }
    }
  },

  async updateTag(id: string, updates: any): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
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
        message: error instanceof Error ? error.message : "Failed to update tag",
      }
    }
  },

  async deleteTag(id: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
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
        message: error instanceof Error ? error.message : "Failed to delete tag",
      }
    }
  },

  async addTagToTask(taskId: string, tagId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/task_tags/tasks/${taskId}/tags/${tagId}`, {
        method: "POST",
        headers: createAuthHeaders("POST"),
      })

      const data = await handleApiResponse(response)

      return {
        success: data.added || false,
        message: data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to add tag to task",
      }
    }
  },

  async removeTagFromTask(taskId: string, tagId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/task_tags/tasks/${taskId}/tags/${tagId}`, {
        method: "DELETE",
        headers: createAuthHeaders("DELETE"),
      })

      const data = await handleApiResponse(response)

      return {
        success: data.removed || false,
        message: data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to remove tag from task",
      }
    }
  },

  async getTaskTags(taskId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/task_tags/tasks/${taskId}/tags`, {
        method: "GET",
        headers: createAuthHeaders(),
      })

      const data = await handleApiResponse(response)

      return {
        success: true,
        data: data.tags || [],
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch task tags",
        data: [],
      }
    }
  },
}
