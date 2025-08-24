import { API_BASE_URL, createAuthHeaders, handleApiResponse } from "../config"
import type { ApiResponse, Tag } from "../types"

const normalizeText = (text: string): string => {
  return text.toLowerCase().trim().replace(/\s+/g, "-")
}

const isTextEmpty = (text: string): boolean => {
  return !text || text.trim().length === 0
}

const checkTagExists = async (normalizedName: string, excludeId?: string): Promise<boolean> => {
  try {
    const response = await tagApi.getTags()
    if (!response.success || !response.data) return false

    return response.data.some((tag: Tag) => tag.normalized_name === normalizedName && tag.id !== excludeId)
  } catch (error) {
    return false
  }
}

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

  async createTag(tag: Tag): Promise<ApiResponse> {
    try {
      if (isTextEmpty(tag.display_name)) {
        return {
          success: false,
          message: "Tag name cannot be empty",
        }
      }

      const normalizedName = normalizeText(tag.display_name)
      const exists = await checkTagExists(normalizedName)
      if (exists) {
        return {
          success: false,
          message: "A tag with this name already exists",
        }
      }

      const response = await fetch(`${API_BASE_URL}/tags`, {
        method: "POST",
        headers: createAuthHeaders("POST"),
        body: JSON.stringify({
          normalized_name: normalizedName,
          display_name: tag.display_name.trim(),
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
      const processedUpdates = { ...updates }

      if (updates.display_name !== undefined) {
        if (isTextEmpty(updates.display_name)) {
          return {
            success: false,
            message: "Tag name cannot be empty",
          }
        }

        const normalizedName = normalizeText(updates.display_name)

        const exists = await checkTagExists(normalizedName, id)
        if (exists) {
          return {
            success: false,
            message: "A tag with this name already exists",
          }
        }

        processedUpdates.normalized_name = normalizedName
        processedUpdates.display_name = updates.display_name.trim()
      }

      const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
        method: "PUT",
        headers: createAuthHeaders("PUT"),
        body: JSON.stringify(processedUpdates),
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

  async getTagNameById(id: string): Promise<ApiResponse> {
    try {
      const response = await this.getTags();

      if (!response.success || !response.data) {
        return {
          success: false,
          message: "Failed to fetch tags",
        };
      }

      const tag = response.data.find((tag: Tag) => tag.id === id);

      if (!tag) {
        return {
          success: false,
          message: "Tag not found",
        };
      }

      return {
        success: true,
        data: tag.display_name || tag.normalized_name,
        message: "Tag name retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get tag name",
      };
    }
  },

  async createMultipleTags(tagNames: string[]): Promise<ApiResponse> {
    try {
      if (!Array.isArray(tagNames)) {
        return {
          success: false,
          message: "Input must be an array of tag names",
        }
      }

      const uniqueNormalizedNames = new Set()
      const processedTags: string[] = []

      for (const name of tagNames) {
        if (isTextEmpty(name)) continue

        const normalizedName = normalizeText(name)

        if (!uniqueNormalizedNames.has(normalizedName)) {
          uniqueNormalizedNames.add(normalizedName)
          processedTags.push(name.trim())
        }
      }

      if (processedTags.length === 0) {
        return {
          success: false,
          message: "No valid tag names provided",
        }
      }

      const createdTags: Tag[] = []
      const errors: string[] = []

      for (const tagName of processedTags) {
        const tagData: Partial<Tag> = {
          display_name: tagName,
          normalized_name: normalizeText(tagName),
          color: "#6B7280"
        }

        const result = await this.createTag(tagData as Tag)

        if (result.success && result.data) {
          createdTags.push({
            id: result.data.id,
            user_id: "",
            normalized_name: tagData.normalized_name!,
            display_name: tagData.display_name!,
            color: tagData.color!,
            created_at: new Date().toISOString()
          })
        } else {
          errors.push(`${tagName}: ${result.message || "Failed to create tag"}`)
        }
      }

      return {
        success: errors.length === 0,
        data: createdTags,
        message: errors.length > 0
          ? `Created ${createdTags.length} tags, failed ${errors.length}: ${errors.join("; ")}`
          : `Successfully created ${createdTags.length} tags`
      }

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create multiple tags",
      }
    }
  },

  async removeAllTagsFromTask(taskId: string): Promise<ApiResponse> {
    try {
      if (!taskId || isTextEmpty(taskId)) {
        return {
          success: false,
          message: "Task ID cannot be empty",
        }
      }

      // Primero obtenemos todos los tags asociados al task
      const tagsResponse = await this.getTaskTags(taskId)

      if (!tagsResponse.success || !tagsResponse.data) {
        return {
          success: false,
          message: "Failed to fetch task tags",
        }
      }

      const tags = tagsResponse.data as Tag[]
      let removedCount = 0
      const errors: string[] = []

      // Removemos cada tag individualmente
      for (const tag of tags) {
        const result = await this.removeTagFromTask(taskId, tag.id)

        if (result.success) {
          removedCount++
        } else {
          errors.push(`${tag.display_name}: ${result.message || "Failed to remove tag"}`)
        }
      }

      return {
        success: errors.length === 0,
        data: { removedCount },
        message: errors.length > 0
          ? `Removed ${removedCount} tags, failed ${errors.length}: ${errors.join("; ")}`
          : `Successfully removed all ${removedCount} tags from task`
      }

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to remove tags from task",
      }
    }
  },

  async getTagIdByName(tagName: string): Promise<ApiResponse> {
  try {
    if (isTextEmpty(tagName)) {
      return {
        success: false,
        message: "Tag name cannot be empty",
      }
    }

    const normalizedName = normalizeText(tagName)
    const response = await this.getTags()
    
    if (!response.success || !response.data) {
      return {
        success: false,
        message: "Failed to fetch tags",
      }
    }
    
    // Buscamos el tag por nombre normalizado
    const tag = response.data.find((tag: Tag) => 
      tag.normalized_name === normalizedName
    )
    
    if (!tag) {
      return {
        success: false,
        message: "Tag not found",
      }
    }
    
    return {
      success: true,
      data: tag.id,
      message: "Tag ID retrieved successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to get tag ID",
    }
  }
}
}
