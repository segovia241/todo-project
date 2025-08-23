import { useTask } from "../contexts/TaskContext"
import { CheckCircle2, Clock, Circle, TrendingUp } from "lucide-react"

const TaskStats = () => {
  const { tasks } = useTask()

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    done: tasks.filter((t) => t.status === "done").length,
  }

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="bg-[#37718e]/15 backdrop-blur-md border border-[#37718e]/30 rounded-xl p-4">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Overview
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">To Do</span>
          </div>
          <span className="text-sm font-medium text-white">{stats.todo}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#37718e]" />
            <span className="text-sm text-gray-300">In Progress</span>
          </div>
          <span className="text-sm font-medium text-white">{stats.doing}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0dab76]" />
            <span className="text-sm text-gray-300">Done</span>
          </div>
          <span className="text-sm font-medium text-white">{stats.done}</span>
        </div>

        <div className="border-t border-white/10 pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Completion Rate</span>
            <span className="text-sm font-medium text-[#0dab76]">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#0dab76] to-[#37718e] h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskStats
