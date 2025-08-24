export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  token?: string
  user?: any
  tasks?: any[]
  projects?: any[]
  tags?: any[]
}

export interface User {
  id: string
  email: string
  name: string
  profile_id?: string
  profile_created_at?: string
  profile_user_id?: string
  created_at?: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  normalized_name: string
  display_name: string
  color: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id?: string
  title: string
  description?: string
  status: "todo" | "doing" | "done"
  priority: "low" | "med" | "high"
  due_date?: string
  tags: Tag[]
  created_at: string
  updated_at: string
}