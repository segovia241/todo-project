import type React from "react"
import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { LogIn, Mail, Lock, Shield, Sparkles, Users, Zap } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

interface LoginFormProps {
  onSuccess?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const success = await login(email, password)
    if (success) {
      console.log("[v0] Login successful, navigating to dashboard")
      navigate("/dashboard")
      onSuccess?.()
    } else {
      setError("Invalid credentials")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="glass rounded-2xl w-full max-w-6xl mx-auto shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Left Column - Branding */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0dab76] to-[#37718e] p-8 lg:p-12 flex-col justify-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-4">Welcome Back!</h1>
                <p className="text-xl lg:text-2xl text-white/90 mb-8">Sign in to continue your journey</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Join thousands of users</h3>
                    <p className="text-white/80">Who trust our platform daily</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Lightning fast</h3>
                    <p className="text-white/80">Optimized for speed and performance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#0dab76] to-[#37718e] rounded-full mb-6 shadow-lg">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
                <p className="text-gray-300">Access your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 glass-dark rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0dab76] transition-all duration-200"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 glass-dark rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0dab76] transition-all duration-200"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-[#c33c54] text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <Shield className="w-4 h-4 inline mr-2" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#0dab76] to-[#37718e] text-white py-3 rounded-lg font-medium hover:from-[#0dab76]/90 hover:to-[#37718e]/90 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-300 text-sm">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-[#0dab76] hover:text-[#0dab76]/80 font-medium underline decoration-transparent hover:decoration-current transition-all duration-200"
                  >
                    Sign up here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
