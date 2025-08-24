import { createAuthHeaders } from "../config"
import { tagApi } from "./tags"
import { API_BASE_URL } from "../config"
import { Task } from "../types"

const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return await response.json()
}

interface ApiResponse {
  success: boolean
  message?: string
  tasks?: any[]
  projects?: any[]
  tags?: any[]
  data?: any
}

export const taskApi = {
  async getTasks(_filters: any = {}): Promise<ApiResponse> {
    try {
      
      const url = new URL(`${API_BASE_URL}/tasks`);
      if (_filters) {
        Object.keys(_filters).forEach(key => {
          if (_filters[key] !== undefined && _filters[key] !== null && _filters[key] !== '') {
            
            url.searchParams.append(key, _filters[key]);
            console.log(url.toString());
          }
        });
      }
      
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: createAuthHeaders(),
      })

      const data = await handleApiResponse(response)

      const tasks = (data.tasks || []).map((task: Task) => ({
        ...task,
        due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
      }))

      return {
        success: true,
        tasks: tasks,
        projects: [],
        tags: [],
      }
    } catch (error) {
      console.log("[v0] Error in getTasks:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch tasks",
        tasks: [],
        projects: [],
        tags: [],
      }
    }
  },

  async getTask(id: string): Promise<ApiResponse> {
    try {
      console.log("[v0] Making GET request to /tasks/" + id)
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "GET",
        headers: createAuthHeaders(),
      })

      console.log("[v0] Response status:", response.status)
      const data = await handleApiResponse(response)

      const tagsResponse = await this.getTaskTags(id)

      const transformedTask = {
        ...data,
        tags: tagsResponse.success ? tagsResponse.data : [],
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      }

      return {
        success: true,
        data: transformedTask,
      }
    } catch (error) {
      console.log("[v0] Error in getTask:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch task",
      }
    }
  },

  async createTask(task: any): Promise<ApiResponse> {
    try {
      console.log("[v0] Making POST request to /tasks")

      const payload: any = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
      }

      if (task.project_id) {
        payload.project_id = task.project_id
      }

      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: createAuthHeaders("POST"),
        body: JSON.stringify(payload),
      })

      console.log("[v0] Response status:", response.status)
      const data = await handleApiResponse(response)

      return {
        success: true,
        data: { id: data.task_id },
        message: data.message,
      }
    } catch (error) {
      console.log("[v0] Error in createTask:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create task",
      }
    }
  },

  async updateTask(id: string, updates: any): Promise<ApiResponse> {
    try {
      const payload: any = Object.fromEntries(
        Object.entries(updates).filter(
          ([key, value]) =>
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !(key === 'project_id' && (value === "" || value === null || value === undefined)) &&
            key !== 'tags'
        )
      )

      console.log("[v0] Making PUT request to /tasks/" + id)
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "PUT",
        headers: createAuthHeaders("PUT"),
        body: JSON.stringify(payload),
      })

      console.log("[v0] Response status:", response.status)
      const data = await handleApiResponse(response)

      if (updates.tags !== undefined) {
        const currentTagsResponse = await this.getTaskTags(id)
        const currentTagIds = currentTagsResponse.success ? currentTagsResponse.data.map((tag: any) => tag.id) : []

        const newTagIds = updates.tags || []
        const tagsToRemove = currentTagIds.filter((tagId: string) => !newTagIds.includes(tagId))

        await Promise.all([
          ...tagsToRemove.map((tagId: string) => tagApi.removeTagFromTask(id, tagId))
        ])
      }

      return {
        success: data.updated || false,
        message: data.message,
      }
    } catch (error) {
      console.log("[v0] Error in updateTask:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update task",
      }
    }
  },

  async deleteTask(id: string): Promise<ApiResponse> {
    try {
      console.log("[v0] Making DELETE request to /tasks/" + id)
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "DELETE",
        headers: createAuthHeaders("DELETE"),
      })

      console.log("[v0] Response status:", response.status)
      const data = await handleApiResponse(response)

      return {
        success: data.deleted || false,
        message: data.message,
      }
    } catch (error) {
      console.log("[v0] Error in deleteTask:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete task",
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