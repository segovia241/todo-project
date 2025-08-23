"use client"

import type React from "react"

import { useState } from "react"
import { useTask } from "../contexts/TaskContext"
import { Plus, Edit2, Trash2, FolderOpen, X } from "lucide-react"

const ProjectManager = () => {
  const { projects, createProject, updateProject, deleteProject } = useTask()
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    color: "#0dab76",
  })

  const colors = [
    "#0dab76", // Primary green
    "#37718e", // Secondary blue
    "#c33c54", // Accent red
    "#0081a7", // Tertiary blue
    "#f77f00", // Orange
    "#fcbf49", // Yellow
    "#d62828", // Red
    "#003049", // Dark blue
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingProject) {
      await updateProject(editingProject, formData)
      setEditingProject(null)
    } else {
      await createProject(formData)
    }

    setFormData({ name: "", color: "#0dab76" })
    setShowForm(false)
  }

  const handleEdit = (project: any) => {
    setFormData({
      name: project.name,
      color: project.color || "#0dab76",
    })
    setEditingProject(project.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      await deleteProject(id)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProject(null)
    setFormData({ name: "", color: "#0dab76" })
  }

  return (
    <div className="bg-[#071013]/40 backdrop-blur-sm border border-[#37718e]/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-[#0dab76]" />
          <h2 className="text-xl font-semibold text-white">Projects</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0dab76] hover:bg-[#0dab76]/80 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Project Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-[#37718e]/20 backdrop-blur-sm border border-[#37718e]/30 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">{editingProject ? "Edit Project" : "Create New Project"}</h3>
            <button onClick={handleCancel} className="p-1 hover:bg-[#37718e]/30 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-[#071013]/60 border border-[#37718e]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0dab76]/50"
                placeholder="Enter project name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color ? "border-white scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-2 bg-[#0dab76] hover:bg-[#0dab76]/80 text-white rounded-lg transition-colors"
              >
                {editingProject ? "Update Project" : "Create Project"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-[#37718e]/30 hover:bg-[#37718e]/50 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No projects yet. Create your first project to get started!</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 bg-[#37718e]/10 hover:bg-[#37718e]/20 border border-[#37718e]/20 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color || "#0dab76" }} />
                <span className="text-white font-medium">{project.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(project)}
                  className="p-2 hover:bg-[#37718e]/30 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ProjectManager
