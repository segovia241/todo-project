import { useTask } from "../contexts/TaskContext"
import { Search, Filter, X, Tag } from "lucide-react"

const TaskFilters = () => {
  const { filters, setFilters, projects, tags } = useTask()

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const queryParams = new URLSearchParams()
    
    Object.entries(newFilters).forEach(([filterKey, filterValue]) => {
      if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
        if (Array.isArray(filterValue)) {
          filterValue.forEach(v => queryParams.append(filterKey, v))
        } else {
          queryParams.append(filterKey, filterValue.toString())
        }
      }
    })
  }

  const toggleTagFilter = (tagName: string) => {
    const currentTags = filters.tags || []
    const updatedTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName]

    updateFilter("tags", updatedTags.length > 0 ? updatedTags : undefined)
  }

  const clearFilters = () => {
    setFilters({})
  }

  const hasActiveFilters = Object.keys(filters).some(
    (key) => key !== "page" && key !== "limit" && filters[key as keyof typeof filters],
  )

  return (
    <div className="bg-[#37718e]/15 backdrop-blur-custom border border-[#37718e]/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#071013]/50 border border-[#37718e]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0dab76] focus:border-transparent"
              placeholder="Search tasks..."
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
          <select
            value={filters.status || ""}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="w-full px-3 py-2 bg-[#071013]/50 border border-[#37718e]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0dab76] focus:border-transparent"
          >
            <option value="">All statuses</option>
            <option value="todo">To Do</option>
            <option value="doing">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
          <select
            value={filters.priority || ""}
            onChange={(e) => updateFilter("priority", e.target.value)}
            className="w-full px-3 py-2 bg-[#071013]/50 border border-[#37718e]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0dab76] focus:border-transparent"
          >
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="med">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
          <select
            value={filters.project_id || ""}
            onChange={(e) => updateFilter("project_id", e.target.value)}
            className="w-full px-3 py-2 bg-[#071013]/50 border border-[#37718e]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0dab76] focus:border-transparent"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Pagination Settings */}
        <div className="grid grid-cols-2 gap-3">
          {/* Page Number */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Page</label>
            <input
              type="number"
              min="1"
              value={filters.page || 1}
              onChange={(e) => updateFilter("page", Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-[#071013]/50 border border-[#37718e]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0dab76] focus:border-transparent"
              placeholder="Page"
            />
          </div>

          {/* Items per Page */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Items per Page</label>
            <select
              value={filters.limit || 10}
              onChange={(e) => updateFilter("limit", parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-[#071013]/50 border border-[#37718e]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0dab76] focus:border-transparent"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
          <select
            value={filters.sort_by || "due_date"}
            onChange={(e) => updateFilter("sort_by", e.target.value)}
            className="w-full px-3 py-2 bg-[#071013]/50 border border-[#37718e]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0dab76] focus:border-transparent"
          >
            <option value="due_date">Due Date</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default TaskFilters