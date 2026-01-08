"use client"

import AdminNavbar from "./AdminNavbar"
import AdminSidebar from "./AdminSidebar"
import "../styles/AdminLayout.css"

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout">
      <AdminNavbar />
      <div className="admin-content-wrapper">
        <AdminSidebar />
        <main className="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout