import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import "./App.css"
import "bootstrap/dist/css/bootstrap.min.css"
import Navbar from "./components/navbar"
import ContactUs from "./screens/ContactUs"
import Footer from "./components/footer"
import HomePage from "./screens/HomePage"
import "./firebase"

import AdminLogin from "./screens/AdminLogin"
import AdminDashboard from "./screens/AdminDashboard"
import AdminSelling from "./screens/AdminSelling"
import AdminBuying from "./screens/AdminBuying"
import AdminRevenue from "./screens/AdminRevenue"
import AdminExpenses from "./screens/AdminExpenses"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminApprovalPanel from "./screens/AdminApprovalPanel"
import AdminMyRequests from "./screens/AdminMyRequests"

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/admin@shion" element={<AdminLogin />} />
          <Route
            path="/admin@shion/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin@shion/selling"
            element={
              <ProtectedRoute>
                <AdminSelling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin@shion/buying"
            element={
              <ProtectedRoute>
                <AdminBuying />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin@shion/revenue"
            element={
              <ProtectedRoute>
                <AdminRevenue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin@shion/expenses"
            element={
              <ProtectedRoute>
                <AdminExpenses />
              </ProtectedRoute>
            }
          />
          <Route path="/admin@shion/approvals" element={<AdminApprovalPanel />} />
<Route path="/admin@shion/my-requests" element={<AdminMyRequests />} />

          {/* User-side routes with navbar and footer */}
          <Route
            path="/*"
            element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/contactus" element={<ContactUs />} />
                </Routes>
                <Footer />
              </>
            }
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
