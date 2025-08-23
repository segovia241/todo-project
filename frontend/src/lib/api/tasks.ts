import { createAuthHeaders } from "../config"
import { tagApi } from "./tags"

const API_BASE_URL = "http://localhost:8080"

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
      console.log("[v0] Making GET request to /api/v1/tasks")
      const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
        method: "GET",
        headers: createAuthHeaders(),
      })

      console.log("[v0] Response status:", response.status)
      const data = await handleApiResponse(response)

      // Obtener tags para cada tarea
      const tasksWithTags = await Promise.all(
        (data.tasks || []).map(async (task: any) => {
          const tagsResponse = await this.getTaskTags(task.id)
          return {
            ...task,
            tags: tagsResponse.success ? tagsResponse.data : [],
            due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
          }
        })
      )

      return {
        success: true,
        tasks: tasksWithTags,
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
      console.log("[v0] Making GET request to /api/v1/tasks/" + id)
      const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}`, {
        method: "GET",
        headers: createAuthHeaders(),
      })

      console.log("[v0] Response status:", response.status)
      const data = await handleApiResponse(response)

      // Obtener tags de la tarea
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
      console.log("[v0] Making POST request to /api/v1/tasks")

      // construir payload sin project_id vacío
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

      const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
        method: "POST",
        headers: createAuthHeaders("POST"),
        body: JSON.stringify(payload),
      })

      console.log("[v0] Response status:", response.status)
      const data = await handleApiResponse(response)

      // Agregar tags si se proporcionaron
      if (data.task_id && task.tags && task.tags.length > 0) {
        await Promise.all(
          task.tags.map((tagId: string) => 
            this.addTagToTask(data.task_id, tagId)
          )
        )
      }

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
      // Filtrar propiedades vacías, nulas o indefinidas, y especialmente project_id vacío
      const payload: any = Object.fromEntries(
        Object.entries(updates).filter(
          ([key, value]) => 
            value !== undefined && 
            value !== null && 
            value !== "" &&
            // Si es project_id y está vacío, no lo incluimos
            !(key === 'project_id' && (value === "" || value === null || value === undefined)) &&
            // Excluir tags del payload principal ya que se manejan por separado
            key !== 'tags'
        )
      )

      console.log("[v0] Making PUT request to /api/v1/tasks/" + id)
      const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}`, {
        method: "PUT",
        headers: createAuthHeaders("PUT"),
        body: JSON.stringify(payload),
      })

      console.log("[v0] Response status:", response.status)
      const data = await handleApiResponse(response)

      // Manejar actualización de tags si se proporcionaron
      if (updates.tags !== undefined) {
        // Primero obtener los tags actuales
        const currentTagsResponse = await this.getTaskTags(id)
        const currentTagIds = currentTagsResponse.success ? currentTagsResponse.data.map((tag: any) => tag.id) : []
        
        // Determinar tags a agregar y eliminar
        const newTagIds = updates.tags || []
        const tagsToAdd = newTagIds.filter((tagId: string) => !currentTagIds.includes(tagId))
        const tagsToRemove = currentTagIds.filter((tagId: string) => !newTagIds.includes(tagId))

        // Ejecutar operaciones de tags
        await Promise.all([
          ...tagsToAdd.map((tagId: string) => this.addTagToTask(id, tagId)),
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
      console.log("[v0] Making DELETE request to /api/v1/tasks/" + id)
      const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}`, {
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
}