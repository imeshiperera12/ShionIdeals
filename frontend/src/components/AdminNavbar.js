"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { signOut } from "firebase/auth"
import { auth } from "../firebase"
import { loadTheme, saveTheme } from "../utils/themeManager"
import { isSuperAdmin } from "../config/adminConfig"
import { fetchPendingApprovals } from "../utils/approvalService"
import "../styles/AdminSidebar.css"

const AdminNavbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [currentUser, setCurrentUser] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [myRequestsCount, setMyRequestsCount] = useState(0)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
      if (user && isSuperAdmin(user.email)) {
        fetchPendingCount()
      } else if (user) {
        fetchMyRequestsCount()
      }
    })

    const isDark = loadTheme()
    setIsDarkMode(isDark)
    applyTheme(isDark)

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Refresh pending count periodically if super admin
  useEffect(() => {
    if (currentUser && isSuperAdmin(currentUser.email)) {
      const interval = setInterval(fetchPendingCount, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    } else if (currentUser) {
      const interval = setInterval(fetchMyRequestsCount, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [currentUser])

  const fetchPendingCount = async () => {
    try {
      const requests = await fetchPendingApprovals()
      setPendingCount(requests.length)
    } catch (error) {
      console.error("Error fetching pending count:", error)
    }
  }

  const fetchMyRequestsCount = async () => {
    try {
      if (!currentUser) return
      const { fetchMyRequests } = await import("../utils/approvalService")
      const requests = await fetchMyRequests(currentUser.email)
      const pendingRequests = requests.filter(r => r.status === "pending")
      setMyRequestsCount(pendingRequests.length)
    } catch (error) {
      console.error("Error fetching my requests count:", error)
    }
  }

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const isActive = (path) => location.pathname === path

  const menuItems = [
    { label: "Dashboard", path: "/admin@shion/dashboard" },
    { label: "Selling", path: "/admin@shion/selling" },
    { label: "Buying", path: "/admin@shion/buying" },
    { label: "Revenue", path: "/admin@shion/revenue" },
    { label: "Expenses", path: "/admin@shion/expenses" },
  ]

  // Add approval panel for super admin
  if (currentUser && isSuperAdmin(currentUser.email)) {
    menuItems.push({ 
      label: `Approvals ${pendingCount > 0 ? `(${pendingCount})` : ''}`, 
      path: "/admin@shion/approvals",
      badge: pendingCount
    })
  }

  // Add My Requests for regular admins
  if (currentUser && !isSuperAdmin(currentUser.email)) {
    menuItems.push({ 
      label: `My Requests ${myRequestsCount > 0 ? `(${myRequestsCount})` : ''}`, 
      path: "/admin@shion/my-requests",
      badge: myRequestsCount
    })
  }

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="admin-top-nav">
        <button className="sidebar-toggle" onClick={toggleSidebar} title="Toggle sidebar">
          
        </button>
        <div className="nav-brand">Shion Ideals Admin</div>
        <div className="nav-actions">
          <button onClick={toggleTheme} className="theme-toggle" title="Toggle dark/light mode">
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={handleLogout} className="logout-btn" title="Logout">
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h3>Menu</h3>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">
                {item.label}
                {item.badge > 0 && (
                  <span className="badge bg-danger ms-2" style={{ fontSize: '0.7rem' }}>
                    {item.badge}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && isMobile && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </>
  )
}

export default AdminNavbar