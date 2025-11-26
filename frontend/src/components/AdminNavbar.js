"use client"
import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { signOut } from "firebase/auth"
import { auth } from "../firebase"
import { loadTheme, saveTheme } from "../utils/themeManager"
import "../styles/AdminTheme.css"
import "../styles/AdminNavbar.css"

const AdminNavbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const isDark = loadTheme()
    setIsDarkMode(isDark)
    applyTheme(isDark)
  }, [])

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

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate("/admin@shion")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="admin-navbar">
      <div className="container-fluid">
        <div className="admin-navbar-content">
          <Link to="/admin@shion/dashboard" className="admin-navbar-brand">
            Shion Ideals Admin
          </Link>

          <div className="admin-navbar-menu">
            <Link
              to="/admin@shion/dashboard"
              className={`admin-nav-link ${isActive("/admin@shion/dashboard") ? "active" : ""}`}
            >
              Dashboard
            </Link>
            <Link
              to="/admin@shion/selling"
              className={`admin-nav-link ${isActive("/admin@shion/selling") ? "active" : ""}`}
            >
              Selling
            </Link>
            <Link
              to="/admin@shion/buying"
              className={`admin-nav-link ${isActive("/admin@shion/buying") ? "active" : ""}`}
            >
              Buying
            </Link>
            <Link
              to="/admin@shion/revenue"
              className={`admin-nav-link ${isActive("/admin@shion/revenue") ? "active" : ""}`}
            >
              Revenue
            </Link>
            <Link
              to="/admin@shion/expenses"
              className={`admin-nav-link ${isActive("/admin@shion/expenses") ? "active" : ""}`}
            >
              Expenses
            </Link>
          </div>

          <div className="admin-navbar-actions">
            <button onClick={toggleTheme} className="theme-toggle" title="Toggle dark/light mode">
              {isDarkMode ? "☀️" : "🌙"}
            </button>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default AdminNavbar
