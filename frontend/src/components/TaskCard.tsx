import type React from "react"

import { useState } from "react"
import { useTask } from "../contexts/TaskContext"
import { format } from "date-fns"
import { Calendar, Flag, MoreVertical, Edit, Trash2, CheckCircle2, Circle, Clock, X } from "lucide-react"
import TaskForm from "./TaskForm"
import type { Task } from "../lib/types"

interface TaskCardProps {
  task: Task
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { updateTask, deleteTask, projects } = useTask()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const project = projects.find((p) => p.id === task.project_id)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-[#c33c54] bg-[#c33c54]/10"
      case "med":
        return "text-[#37718e] bg-[#37718e]/10"
      case "low":
        return "text-[#0dab76] bg-[#0dab76]/10"
      default:
        return "text-gray-400 bg-gray-400/10"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="w-5 h-5 text-[#0dab76]" />
      case "doing":
        return <Clock className="w-5 h-5 text-[#37718e]" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const handleStatusChange = async () => {
    const statusOrder = ["todo", "doing", "done"]
    const currentIndex = statusOrder.indexOf(task.status)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length] as Task["status"]
    await updateTask(task.id, { status: nextStatus })
  }

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteTask(task.id)
    }
    setShowMenu(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setShowMenu(false)
    setShowDetails(false)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if ((e.target as HTMLElement).closest("button")) return
    setShowDetails(true)
  }

  if (isEditing) {
    return <TaskForm task={task} onClose={() => setIsEditing(false)} />
  }

  if (showDetails && !isEditing) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-[#37718e]/20 backdrop-blur-md border border-[#37718e]/30 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">{task.title}</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {task.description && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Description</h4>
              <p className="text-gray-300 text-sm leading-relaxed">{task.description}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-1">Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(task.status)}
                  <span className="text-white capitalize">{task.status.replace("_", " ")}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-1">Priority</h4>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}
                >
                  <Flag className="w-3 h-3" />
                  {task.priority}
                </span>
              </div>
            </div>

            {task.due_date && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-1">Due Date</h4>
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(task.due_date), "MMMM dd, yyyy")}
                </div>
              </div>
            )}

            {project && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-1">Project</h4>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || "#0dab76" }} />
                  <span className="text-white">{project.name}</span>
                </div>
              </div>
            )}

            {task.tags && task.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.display_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleEdit}
              className="flex-1 py-2 bg-[#0dab76] hover:bg-[#0dab76]/80 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Task
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-[#c33c54]/20 hover:bg-[#c33c54]/30 text-[#c33c54] rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-[#37718e]/10 backdrop-blur-sm border border-[#37718e]/20 rounded-lg p-4 hover:bg-[#37718e]/15 transition-all duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <button onClick={handleStatusChange} className="mt-1 hover:scale-110 transition-transform">
          {getStatusIcon(task.status)}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium ${task.status === "done" ? "line-through text-gray-400" : "text-white"}`}>
              {task.title}
            </h3>

            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-white p-1 rounded">
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 bg-[#37718e]/20 backdrop-blur-md border border-[#37718e]/30 rounded-lg shadow-lg py-2 w-32 z-10">
                  <button
                    onClick={handleEdit}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm text-[#c33c54] hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {task.description && <p className="text-sm text-gray-400 mt-1">{task.description}</p>}

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}
            >
              <Flag className="w-3 h-3" />
              {task.priority}
            </span>

            {project && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white bg-white/10">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || "#0dab76" }} />
                {project.name}
              </span>
            )}

            {task.due_date && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), "MMM dd")}
              </span>
            )}

            {task.tags &&
              task.tags.length > 0 &&
              task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.display_name}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCard
