"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase"
import { isAuthorizedAdmin } from "../config/adminConfig"
import { loadTheme, saveTheme } from "../utils/themeManager"
import "../styles/AdminTheme.css"
import "../styles/AdminLogin.css"

const AdminLogin = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && isAuthorizedAdmin(user.email)) {
        navigate("/admin@shion/dashboard")
      }
    })

    const isDark = loadTheme()
    setIsDarkMode(isDark)
    applyTheme(isDark)

    return () => unsubscribe()
  }, [navigate])

  const applyTheme = (isDark) => {
    if (isDark) {
      document.body.classList.add("admin-dark-mode")
    } else {
      document.body.classList.remove("admin-dark-mode")
    }
  }

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    saveTheme(newTheme)
    applyTheme(newTheme)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Check if email is authorized
      if (!isAuthorizedAdmin(email)) {
        setError("Not authorized. Only admin users can access this panel.")
        setLoading(false)
        return
      }

      // Sign in with Firebase
      await signInWithEmailAndPassword(auth, email, password)

      navigate("/admin@shion/dashboard")
    } catch (err) {
      console.error("Login error:", err)
      if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Invalid email or password.")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.")
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.")
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-container">
      <button onClick={toggleTheme} className="login-theme-toggle" title="Toggle dark/light mode">
        {isDarkMode ? "☀️" : "🌙"}
      </button>

      <div className="admin-login-box">
        <div className="admin-login-header">
          <h2>Admin Login</h2>
          <p>Shion Ideals Management</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="admin@shionideals.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
