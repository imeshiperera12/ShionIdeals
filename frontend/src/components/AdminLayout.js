import AdminNavbar from "./AdminNavbar"
import "../styles/AdminLayout.css"

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout">
      <div className="admin-main">
        <AdminNavbar />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout