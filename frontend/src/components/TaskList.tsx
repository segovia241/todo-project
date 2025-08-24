import { useTask } from "../contexts/TaskContext"
import TaskCard from "./TaskCard"
import Pagination from "./Pagination"
import { usePagination } from "../hooks/usePagination"
import { Loader2, ChevronUp, ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const TaskList = () => {
  const { tasks, isLoading } = useTask()
  const containerRef = useRef<HTMLDivElement>(null)
  const tasksContainerRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<string>("none")
  const [scrollPosition, setScrollPosition] = useState<"top" | "middle" | "bottom">("top")
  const [isScrollable, setIsScrollable] = useState(false)

  const { currentPage, totalPages, paginatedData, goToPage, setItemsPerPage, itemsPerPage } = usePagination({
    data: tasks,
    itemsPerPage: 8, // Default items per page
  })

  // Calcular la altura máxima para el contenedor de tareas
  useEffect(() => {
    const calculateMaxHeight = () => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const spaceAbove = containerRect.top
        const estimatedPaginationHeight = 80 // Altura aproximada de la paginación
        const availableHeight = viewportHeight - spaceAbove - estimatedPaginationHeight - 32 // 32px de margen adicional

        // Establecer altura máxima solo si es menor que la altura disponible
        if (availableHeight > 200) {
          // Mínimo 200px para que sea útil
          setMaxHeight(`${availableHeight}px`)
        } else {
          setMaxHeight("none")
        }
      }
    }

    calculateMaxHeight()

    // Recalcular cuando cambie el tamaño de la ventana
    window.addEventListener("resize", calculateMaxHeight)

    return () => {
      window.removeEventListener("resize", calculateMaxHeight)
    }
  }, [paginatedData.length])

  // Efecto para controlar los indicadores de scroll
  useEffect(() => {
    const checkScroll = () => {
      if (tasksContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = tasksContainerRef.current
        const scrollPosition = scrollTop + clientHeight

        setIsScrollable(scrollHeight > clientHeight)

        // Determinar la posición del scroll
        if (scrollTop === 0) {
          setScrollPosition("top")
        } else if (scrollPosition >= scrollHeight - 10) {
          setScrollPosition("bottom")
        } else {
          setScrollPosition("middle")
        }
      }
    }

    const container = tasksContainerRef.current
    if (container) {
      container.addEventListener("scroll", checkScroll)
      // Verificar estado inicial
      setTimeout(checkScroll, 100)
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScroll)
      }
    }
  }, [paginatedData])

  const scrollToTop = () => {
    if (tasksContainerRef.current) {
      tasksContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }

  const scrollToBottom = () => {
    if (tasksContainerRef.current) {
      tasksContainerRef.current.scrollTo({
        top: tasksContainerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0dab76]" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
        <p className="text-gray-400">Create your first task to get started!</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-sm text-gray-400">
          Showing {paginatedData.length} of {tasks.length} tasks
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Items per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number.parseInt(e.target.value))}
            className="w-20 h-8 bg-[#37718e]/10 border border-[#37718e]/20 text-white rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-[#0dab76]"
          >
            <option value="5">5</option>
            <option value="8">8</option>
            <option value="12">12</option>
            <option value="20">20</option>
          </select>
        </div>
      </div>

      {/* Contenedor relativo para los indicadores de scroll */}
      <div className="relative">
        {scrollPosition !== "top" && isScrollable && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
            <button
              onClick={scrollToTop}
              className="bg-white/10 backdrop-blur-sm border border-white/20 p-2 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 cursor-pointer"
            >
              <ChevronUp className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {scrollPosition !== "bottom" && isScrollable && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
            <button
              onClick={scrollToBottom}
              className="bg-white/10 backdrop-blur-sm border border-white/20 p-2 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Contenedor con scroll cuando es necesario */}
        <div
          ref={tasksContainerRef}
          className="space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-[#37718e] scrollbar-track-[#1e1e2e] pr-1 transition-all duration-300"
          style={{ maxHeight: maxHeight !== "none" ? maxHeight : undefined }}
        >
          {paginatedData.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} className="mt-8" />
    </div>
  )
}

export default TaskList
