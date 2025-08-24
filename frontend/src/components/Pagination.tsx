import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

const Pagination = ({ currentPage, totalPages, onPageChange, className = "" }: PaginationProps) => {
  if (totalPages <= 1) return null

  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#37718e]/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center justify-center transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Page numbers - Hidden on mobile, shown on tablet+ */}
      <div className="hidden sm:flex items-center gap-1">
        {visiblePages.map((page, index) => (
          <div key={index}>
            {page === "..." ? (
              <div className="flex h-8 w-8 items-center justify-center">
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`h-8 w-8 p-0 rounded-md flex items-center justify-center transition-colors ${
                  currentPage === page
                    ? "bg-[#0dab76] text-white hover:bg-[#0dab76]/80"
                    : "text-gray-400 hover:text-white hover:bg-[#37718e]/20"
                }`}
              >
                {page}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Mobile page indicator */}
      <div className="sm:hidden flex items-center px-3 py-1 bg-[#37718e]/10 rounded-lg">
        <span className="text-sm text-gray-300">
          {currentPage} / {totalPages}
        </span>
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#37718e]/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center justify-center transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export default Pagination