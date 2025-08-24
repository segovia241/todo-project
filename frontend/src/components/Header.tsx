import { CheckSquare, User, LogOut } from "lucide-react"
import { useState } from "react"
import { authApi } from "../lib/api"
import { createPortal } from "react-dom"

interface UserData {
  id: string
  email: string
  name: string
  profile_id: string
}

const Header = () => {
  const [showUserPopup, setShowUserPopup] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchUserData = async () => {
    setLoading(true)
    try {
      const response = await authApi.getMe()
      if (response.success && response.user) {
        setUserData(response.user)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserIconClick = () => {
    if (!userData && !loading) {
      fetchUserData()
    }
    setShowUserPopup(!showUserPopup)
  }

  const handleLogout = () => {
    localStorage.removeItem("authToken")
    setUserData(null)
    setShowUserPopup(false)
    window.location.reload()
  }

  const renderPopup = () => {
    if (!showUserPopup) return null

    return createPortal(
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: 999999 }}
        onClick={() => setShowUserPopup(false)}
      >
        <div
          className="w-96 max-w-full bg-[#071013] border border-[#37718e]/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-[#0dab76] to-[#37718e] p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="text-white">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-5 bg-white/30 rounded w-28 mb-2"></div>
                    <div className="h-4 bg-white/20 rounded w-36"></div>
                  </div>
                ) : userData ? (
                  <>
                    <h3 className="font-bold text-xl">{userData.name}</h3>
                    <p className="text-white/90 text-sm">{userData.email}</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-xl">Usuario</h3>
                    <p className="text-white/90 text-sm">Cargando...</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <header className="bg-[#071013]/95 backdrop-blur-sm border-b border-[#37718e]/30 shadow-lg relative">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - kept for pages without sidebar */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#0dab76] to-[#37718e] rounded-xl flex items-center justify-center shadow-lg">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-[#0dab76] bg-clip-text text-transparent">
              TaskFlow
            </span>
          </div>

          <div className="relative">
            <button
              onClick={handleUserIconClick}
              className="w-10 h-10 bg-gradient-to-r from-[#37718e] to-[#0dab76] rounded-full flex items-center justify-center hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              <User className="w-5 h-5 text-white" />
            </button>

            {renderPopup()}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
