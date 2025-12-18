"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingDown,
  DollarSign,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import "../styles/AdminSidebar.css"

const AdminSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const menuItems = [
    { path: "/admin@shion/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin@shion/selling", label: "Selling", icon: ShoppingCart },
    { path: "/admin@shion/buying", label: "Buying", icon: TrendingDown },
    { path: "/admin@shion/revenue", label: "Revenue", icon: DollarSign },
    { path: "/admin@shion/expenses", label: "Expenses", icon: CreditCard },
  ]

  return (
    <aside className={`admin-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">SI</div>
          {!isCollapsed && <span className="brand-text">ShionIdeals</span>}
        </div>
        <button className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? "active" : ""}`}
            title={isCollapsed ? item.label : ""}
          >
            <item.icon size={20} className="nav-icon" />
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar