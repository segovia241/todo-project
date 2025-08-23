import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useTask } from "../../contexts/TaskContext"
import { useAuth } from "../../contexts/AuthContext"
import Header from "../Header"
import TaskList from "../TaskList"
import TaskForm from "../TaskForm"
import TaskFilters from "../TaskFilters"
import TaskCalendar from "../TaskCalendar"
import TaskStats from "../TaskStats"
import { Plus, Calendar, List, Menu, X, LogOut } from "lucide-react"

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { setFilters, filters } = useTask()
  const { logout } = useAuth()

  // Sync URL params with filters
  useEffect(() => {
    const urlFilters: any = {}

    if (searchParams.get("status")) urlFilters.status = searchParams.get("status")
    if (searchParams.get("priority")) urlFilters.priority = searchParams.get("priority")
    if (searchParams.get("project_id")) urlFilters.project_id = searchParams.get("project_id")
    if (searchParams.get("search")) urlFilters.search = searchParams.get("search")
    if (searchParams.get("tags")) urlFilters.tags = searchParams.get("tags")?.split(",")
    if (searchParams.get("page")) urlFilters.page = Number.parseInt(searchParams.get("page") || "1")
    if (searchParams.get("sort_by")) urlFilters.sort_by = searchParams.get("sort_by")
    if (searchParams.get("sort_order")) urlFilters.sort_order = searchParams.get("sort_order")

    setFilters(urlFilters)
  }, [searchParams, setFilters])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()

    if (filters.status) params.set("status", filters.status)
    if (filters.priority) params.set("priority", filters.priority)
    if (filters.project_id) params.set("project_id", filters.project_id)
    if (filters.search) params.set("search", filters.search)
    if (filters.tags?.length) params.set("tags", filters.tags.join(","))
    if (filters.page && filters.page > 1) params.set("page", filters.page.toString())
    if (filters.sort_by) params.set("sort_by", filters.sort_by)
    if (filters.sort_order) params.set("sort_order", filters.sort_order)

    setSearchParams(params)
  }, [filters, setSearchParams])

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="h-screen bg-[#071013] flex flex-col overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div
          className={`
            fixed lg:static inset-y-0 left-0 z-40 lg:z-0
            w-80 lg:w-80 xl:w-96
            bg-[#37718e]/10 backdrop-blur-md border border-[#37718e]/20
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            lg:block rounded-r-2xl lg:rounded-none lg:border-r lg:border-t-0 lg:border-b-0 lg:border-l-0
            flex-shrink-0
            lg:h-full
          `}
        >
          <div className="h-full flex flex-col">
            {/* Mobile Close Button */}
            <div className="flex-shrink-0 flex justify-between items-center lg:hidden p-4 border-b border-[#37718e]/20">
              <h2 className="text-lg font-semibold text-white">Dashboard</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-[#37718e]/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                <TaskStats />
                <TaskFilters />
              </div>
            </div>

            {/* Fixed Logout Button */}
            <div className="flex-shrink-0 p-6 border-t border-[#37718e]/20">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-[#37718e]/20 rounded-lg transition-all duration-200 group"
              >
                <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          <div className="flex-1 overflow-hidden p-6">
            <div className="bg-[#37718e]/10 backdrop-blur-md border border-[#37718e]/20 rounded-2xl p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 hover:bg-[#37718e]/20 rounded-lg transition-colors"
                  >
                    <Menu className="w-5 h-5 text-white" />
                  </button>
                  <h1 className="text-2xl font-bold text-white">My Tasks</h1>
                </div>

                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex items-center bg-[#071013]/50 rounded-lg p-1 border border-[#37718e]/30">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-md transition-colors ${viewMode === "list"
                          ? "bg-[#0dab76] text-white shadow-sm"
                          : "text-gray-300 hover:text-white hover:bg-[#37718e]/20"
                        }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("calendar")}
                      disabled // Aquí lo deshabilitamos
                      className={`p-2 rounded-md transition-colors ${viewMode === "calendar"
                          ? "bg-[#0dab76] text-white shadow-sm"
                          : "text-gray-500 cursor-not-allowed" // Cambia el estilo al deshabilitado
                        }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add Task Button */}
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#0dab76] to-[#37718e] text-white px-4 py-2 rounded-lg hover:from-[#0dab76]/90 hover:to-[#37718e]/90 transition-all duration-200 shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Task</span>
                  </button>
                </div>

              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">{viewMode === "list" ? <TaskList /> : <TaskCalendar />}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && <TaskForm onClose={() => setShowTaskForm(false)} />}
    </div>
  )
}

export default Dashboard
