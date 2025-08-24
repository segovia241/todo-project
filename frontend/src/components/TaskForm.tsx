import type React from "react"

import { useState } from "react"
import { useTask } from "../contexts/TaskContext"
import { X, Calendar, Flag, Folder, Tag, Plus } from "lucide-react"
import type { Task } from "../lib/types"

interface TaskFormProps {
  onClose: () => void
  task?: Task
}

const TaskForm: React.FC<TaskFormProps> = ({ onClose, task }) => {
  const { createTask, updateTask, projects } = useTask()
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: (task?.priority || "med") as "low" | "med" | "high",
    due_date: task?.due_date ? task.due_date.split("T")[0] : "",
    project_id: task?.project_id || "",
    tags: task?.tags ? task.tags.map((tag: any) => tag.display_name || tag.name || tag) : ([] as string[]),
    status: (task?.status || "todo") as "todo" | "doing" | "done",
  })
  const [newTag, setNewTag] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return ""
    const date = new Date(dateString)
    date.setHours(15, 0, 0, 0)
    return date.toISOString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    console.log("Tags implementados:", formData.tags)

    setIsLoading(true)
    try {
      const formattedData = {
        ...formData,
        due_date: formatDateForAPI(formData.due_date),
        project_id: formData.project_id || "",
        tags: formData.tags || [],
      }

      const apiPayload = formattedData

      if (task) {
        await updateTask(task.id, apiPayload)
      } else {
        await createTask(apiPayload)
      }
      onClose()
    } catch (error) {
      console.error(`Error ${task ? "updating" : "creating"} task:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    const tagName = newTag.trim()
    if (tagName && !formData.tags.includes(tagName)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagName],
      })
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-custom flex items-center justify-center p-4 z-50">
      <div className="glass-dark rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {task ? "Edit Task" : "Create New Task"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-custom"
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none backdrop-blur-custom"
              rows={3}
              placeholder="Enter task description..."
            />
          </div>

          {/* Status */}
          {task && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-custom"
              >
                <option value="todo">To Do</option>
                <option value="doing">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Flag className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-custom"
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-custom"
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Folder className="w-4 h-4 inline mr-1" />
              Project
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-custom"
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags*/}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags
            </label>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-full text-xs border border-primary/30"
                  >
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary/70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-custom"
                placeholder="Add tag name..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className={`flex-1 text-white py-2 rounded-lg font-medium transition-all duration-200 shadow-sm
      ${isLoading || !formData.title.trim()
                  ? "bg-secondary opacity-50 cursor-not-allowed"
                  : "bg-primary hover:opacity-90"
                }`}
            >
              {isLoading
                ? task
                  ? "Updating..."
                  : "Creating..."
                : task
                  ? "Update Task"
                  : "Create Task"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/20 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default TaskForm
