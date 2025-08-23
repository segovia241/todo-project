"use client"

import { useState } from "react"
import { useTask } from "../contexts/TaskContext"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  addYears,
  subYears,
} from "date-fns"
import { ChevronLeft, ChevronRight, Calendar, X, Flag, Tag } from "lucide-react"
import type { Task } from "../lib/api" // Added Task type import

const TaskCalendar = () => {
  const { tasks, filteredTasks } = useTask()
  const safeTasks = filteredTasks || tasks || []

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week" | "year">("month")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayTasks, setShowDayTasks] = useState(false)
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]) // Added proper Task type

  const getDateRange = () => {
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return { start: weekStart, end: weekEnd, days: eachDayOfInterval({ start: weekStart, end: weekEnd }) }
    } else if (viewMode === "year") {
      const yearStart = startOfYear(currentDate)
      const yearEnd = endOfYear(currentDate)
      return { start: yearStart, end: yearEnd, months: eachMonthOfInterval({ start: yearStart, end: yearEnd }) }
    } else {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      return { start: monthStart, end: monthEnd, days: eachDayOfInterval({ start: monthStart, end: monthEnd }) }
    }
  }

  const { days, months } = getDateRange()

  const getTasksForDay = (date: Date) => {
    return safeTasks.filter((task: Task) => task && task.due_date && isSameDay(new Date(task.due_date), date)) // Added Task type annotation
  }

  const getTasksForMonth = (date: Date) => {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    return safeTasks.filter((task: Task) => {
      // Added Task type annotation
      if (!task || !task.due_date) return false
      const taskDate = new Date(task.due_date)
      return taskDate >= monthStart && taskDate <= monthEnd
    })
  }

  const navigate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      if (viewMode === "week") {
        return direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1)
      } else if (viewMode === "year") {
        return direction === "prev" ? subYears(prev, 1) : addYears(prev, 1)
      } else {
        const newDate = new Date(prev)
        if (direction === "prev") {
          newDate.setMonth(prev.getMonth() - 1)
        } else {
          newDate.setMonth(prev.getMonth() + 1)
        }
        return newDate
      }
    })
  }

  const getTitle = () => {
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    } else if (viewMode === "year") {
      return format(currentDate, "yyyy")
    }
    return format(currentDate, "MMMM yyyy")
  }

  const handleDateClick = (date: Date) => {
    const dayTasks = getTasksForDay(date)
    if (dayTasks.length > 0) {
      setSelectedDayTasks(dayTasks)
      setShowDayTasks(true)
      setSelectedDate(date)
    } else {
      setSelectedDate(date)
      setCurrentDate(date)
      setViewMode("week")
    }
  }

  const handleMonthClick = (month: Date) => {
    setCurrentDate(month)
    setViewMode("month")
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {getTitle()}
        </h3>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-1">
            <button
              onClick={() => setViewMode("year")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === "year"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === "month"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === "week"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate("prev")} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-300" />
            </button>
            <button onClick={() => navigate("next")} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-dark rounded-lg p-4 border border-white/20">
        {viewMode === "year" ? (
          /* Year View - Show months */
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            {months?.map((month) => {
              const monthTasks = getTasksForMonth(month)
              const isCurrentMonth = isSameDay(startOfMonth(new Date()), startOfMonth(month))

              return (
                <div
                  key={month.toISOString()}
                  onClick={() => handleMonthClick(month)}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    isCurrentMonth ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className={`text-sm font-medium mb-2 ${isCurrentMonth ? "text-primary" : "text-white"}`}>
                    {format(month, "MMM yyyy")}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">{monthTasks.length} tasks</div>
                    {monthTasks.slice(0, 3).map(
                      (
                        task: Task, // Added Task type annotation
                      ) => (
                        <div
                          key={task.id}
                          className={`text-xs p-1 rounded truncate ${
                            task.priority === "high"
                              ? "bg-destructive/20 text-destructive border border-destructive/30"
                              : task.priority === "med"
                                ? "bg-secondary/20 text-secondary border border-secondary/30"
                                : "bg-primary/20 text-primary border border-primary/30"
                          }`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ),
                    )}
                    {monthTasks.length > 3 && (
                      <div className="text-xs text-gray-400">+{monthTasks.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            {/* Weekday Headers */}
            <div className={`grid gap-1 mb-4 ${viewMode === "week" ? "grid-cols-7" : "grid-cols-7"}`}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-300 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className={`grid gap-1 ${viewMode === "week" ? "grid-cols-7" : "grid-cols-7"}`}>
              {days?.map((day) => {
                const dayTasks = getTasksForDay(day)
                const isCurrentDay = isToday(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={`min-h-[100px] p-2 rounded-lg border transition-colors cursor-pointer ${
                      isCurrentDay
                        ? "bg-primary/20 border-primary"
                        : isSelected
                          ? "bg-secondary/20 border-secondary"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isCurrentDay ? "text-primary" : isSelected ? "text-secondary" : "text-white"
                      }`}
                    >
                      {format(day, "d")}
                    </div>

                    {/* Tasks for this day */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, viewMode === "week" ? 5 : 3).map(
                        (
                          task: Task, // Added Task type annotation
                        ) => (
                          <div
                            key={task.id}
                            className={`text-xs p-1 rounded truncate ${
                              task.priority === "high"
                                ? "bg-destructive/20 text-destructive border border-destructive/30"
                                : task.priority === "med"
                                  ? "bg-secondary/20 text-secondary border border-secondary/30"
                                  : "bg-primary/20 text-primary border border-primary/30"
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        ),
                      )}
                      {dayTasks.length > (viewMode === "week" ? 5 : 3) && (
                        <div className="text-xs text-gray-400">
                          +{dayTasks.length - (viewMode === "week" ? 5 : 3)} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Day Tasks Modal */}
      {showDayTasks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#37718e]/20 backdrop-blur-md border border-[#37718e]/30 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                Tasks for {selectedDate && format(selectedDate, "MMMM dd, yyyy")}
              </h3>
              <button
                onClick={() => setShowDayTasks(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedDayTasks
                .filter((task: Task) => task && task.title) // Added Task type annotation
                .map(
                  (
                    task: Task, // Added Task type annotation
                  ) => (
                    <div key={task.id} className="bg-[#071013]/40 rounded-lg p-4 border border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">{task.title}</h4>
                          {task.description && <p className="text-sm text-gray-400 mb-2">{task.description}</p>}
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                task.priority === "high"
                                  ? "text-[#c33c54] bg-[#c33c54]/10"
                                  : task.priority === "med"
                                    ? "text-[#37718e] bg-[#37718e]/10"
                                    : "text-[#0dab76] bg-[#0dab76]/10"
                              }`}
                            >
                              <Flag className="w-3 h-3" />
                              {task.priority}
                            </span>
                            <span className="text-xs text-gray-400 capitalize">{task.status.replace("_", " ")}</span>
                            {task.tags &&
                              task.tags.map(
                                (
                                  tag: string, // Added string type annotation
                                ) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-[#0081a7] bg-[#0081a7]/10"
                                  >
                                    <Tag className="w-3 h-3" />
                                    {tag}
                                  </span>
                                ),
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-destructive/30 border border-destructive/50 rounded"></div>
          <span className="text-gray-300">High Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-secondary/30 border border-secondary/50 rounded"></div>
          <span className="text-gray-300">Medium Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary/30 border border-primary/50 rounded"></div>
          <span className="text-gray-300">Low Priority</span>
        </div>
      </div>
    </div>
  )
}

export default TaskCalendar
