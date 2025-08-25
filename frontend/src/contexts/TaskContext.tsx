"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { taskApi, projectApi, tagApi, type Task } from "../lib/api"

export interface Project {
  id: string
  user_id: string
  name: string
  color?: string
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  normalized_name: string
  display_name: string
  color?: string
  created_at: string
}

interface TaskContextType {
  tasks: Task[]
  filteredTasks: Task[]
  projects: Project[]
  tags: Tag[]
  filters: TaskFilters
  setFilters: (filters: TaskFilters) => void
  createTask: (task: Omit<Task, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>
  updateTask: (id: string, task: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  createProject: (project: Omit<Project, "id" | "user_id" | "created_at">) => Promise<void>
  updateProject: (id: string, project: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  refreshTasks: () => Promise<void>
  refreshProjects: () => Promise<void>
  refreshTags: () => Promise<void>
  isLoading: boolean
}

export interface TaskFilters {
  status?: string
  priority?: string
  project_id?: string
  tags?: string[]
  search?: string
  due_date_from?: string
  due_date_to?: string
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: "asc" | "desc"
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export const useTask = () => {
  const context = useContext(TaskContext)
  if (context === undefined) {
    throw new Error("useTask must be used within a TaskProvider")
  }
  return context
}

interface TaskProviderProps {
  children: ReactNode
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [filters, setFilters] = useState<TaskFilters>({})
  const [isLoading, setIsLoading] = useState(false)
  const [taskTags, setTaskTags] = useState<Record<string, string[]>>({})

  const getTaskTags = useCallback(async (taskId: string): Promise<string[]> => {
    try {
      const response = await tagApi.getTaskTags(taskId)
      if (response.success && Array.isArray(response.data)) {
        return response.data.map((tag: any) => tag.id)
      }
      return []
    } catch (error) {
      console.error("Error fetching task tags:", error)
      return []
    }
  }, [])

  useEffect(() => {
    const fetchMissingTaskTags = async () => {
      const missingTasks = tasks.filter((task) => !taskTags[task.id])
      if (missingTasks.length === 0) return

      const tagsMap: Record<string, string[]> = { ...taskTags }
      for (const task of missingTasks) {
        const tags = await getTaskTags(task.id)
        tagsMap[task.id] = tags
      }
      setTaskTags(tagsMap)
    }

    if (tasks.length > 0) {
      fetchMissingTaskTags()
    }
  }, [tasks, taskTags, getTaskTags])

  const filteredTasks = useMemo(() => {
    
    let filtered = [...tasks]

    if (filters.status) {
      filtered = filtered.filter((task: Task) => task.status === filters.status)
    }

    if (filters.priority) {
      filtered = filtered.filter((task: Task) => task.priority === filters.priority)
    }

    if (filters.project_id) {
      filtered = filtered.filter((task: Task) => task.project_id === filters.project_id)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (task: Task) =>
          task.title?.toLowerCase().includes(searchLower) || task.description?.toLowerCase().includes(searchLower),
      )
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((task: Task) => {
        const taskTagIds = taskTags[task.id] || []
        return filters.tags!.some((filterTag) => taskTagIds.includes(filterTag))
      })
    }

    if (filters.due_date_from) {
      const fromDate = new Date(filters.due_date_from)
      filtered = filtered.filter((task: Task) => task.due_date && new Date(task.due_date) >= fromDate)
    }

    if (filters.due_date_to) {
      const toDate = new Date(filters.due_date_to)
      filtered = filtered.filter((task: Task) => task.due_date && new Date(task.due_date) <= toDate)
    }

    return filtered
  }, [tasks, filters, taskTags])

  const refreshTasks = async () => {
    setIsLoading(true)
    try {
    
      const response = await taskApi.getTasks(filters)
      if (response.success) {
        setTasks(response.tasks || [])
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshProjects = async () => {
    try {
      const response = await projectApi.getProjects()
      if (response.success) {
        setProjects(response.data || [])
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const refreshTags = async () => {
    try {
      const response = await tagApi.getTags()
      if (response.success) {
        setTags(response.data || [])
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    }
  }

  const createTask = useCallback(async (task: Omit<Task, "id" | "user_id" | "created_at" | "updated_at">) => {
    try {
      const response = await taskApi.createTask(task)
      console.log("GA-DEBUG", task)

      if (response.success && response.data && response.data.id) {
        const taskId = response.data.id

        if (task.tags && task.tags.length > 0) {
          await tagApi.createMultipleTags(task.tags as unknown as string[])
          // Asociar cada tag al task
          for (const tagName of task.tags as unknown as string[]) {
            const tagResponse = await tagApi.getTagIdByName(tagName)
            console.log("LOLCITO", tagResponse)
            if (tagResponse.success && tagResponse.data) {
              await tagApi.addTagToTask(taskId, tagResponse.data)
            }
          }
        }
        console.log("FITROS DESPUES DE CREATE",filters)
        await refreshTasks()
      }
    } catch (error) {
      console.error("Error creating task:", error)
    }
  }, [])

  const updateTask = useCallback(async (id: string, taskUpdates: Partial<Task>) => {
    // Optimistic update - update UI immediately
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, ...taskUpdates, updated_at: new Date().toISOString() } : task,
      ),
    )

    // Sync with API in background
    try {
      const response = await taskApi.updateTask(id, taskUpdates)
      if (!response.success) {
        // Revert optimistic update on failure
        console.error("Failed to update task, reverting changes")
        await refreshTasks()
      }
    } catch (error) {
      console.error("Error updating task:", error)
      // Revert optimistic update on error
      await refreshTasks()
    }
  }, [])

  const deleteTask = useCallback(
    async (id: string) => {
      // Store original task for potential rollback
      const originalTask = tasks.find((task) => task.id === id)

      // Optimistic delete - remove from UI immediately
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id))

      // Remove from taskTags as well
      setTaskTags((prevTags) => {
        const newTags = { ...prevTags }
        delete newTags[id]
        return newTags
      })

      // Sync with API in background
      try {
        const response = await taskApi.deleteTask(id)
        if (!response.success) {
          // Revert optimistic delete on failure
          console.error("Failed to delete task, reverting changes")
          if (originalTask) {
            setTasks((prevTasks) => [...prevTasks, originalTask])
          }
        }
      } catch (error) {
        console.error("Error deleting task:", error)
        // Revert optimistic delete on error
        if (originalTask) {
          setTasks((prevTasks) => [...prevTasks, originalTask])
        }
      }
    },
    [tasks],
  )

  const updateProject = useCallback(async (id: string, project: Partial<Project>) => {
    try {
      const response = await projectApi.updateProject(id, project)
      if (response.success) {
        await refreshProjects()
      }
    } catch (error) {
      console.error("Error updating project:", error)
    }
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    try {
      const response = await projectApi.deleteProject(id)
      if (response.success) {
        await refreshProjects()
        await refreshTasks()
      } else {
        alert(response.message || "Error deleting project")
      }
    } catch (error) {
      console.error("Error deleting project:", error)
    }
  }, [])

  const createProject = useCallback(async (project: Omit<Project, "id" | "user_id" | "created_at">) => {
    try {
      const response = await projectApi.createProject(project)
      if (response.success) {
        await refreshProjects()
      }
    } catch (error) {
      console.error("Error creating project:", error)
    }
  }, [])

  useEffect(() => {
    refreshTasks()
  }, [filters])

  useEffect(() => {
    refreshProjects()
    refreshTags()
  }, [])

  return (
    <TaskContext.Provider
      value={{
        tasks,
        filteredTasks,
        projects,
        tags,
        filters,
        setFilters,
        createTask,
        updateTask,
        deleteTask,
        createProject,
        updateProject,
        deleteProject,
        refreshTasks,
        refreshProjects,
        refreshTags,
        isLoading,
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}
