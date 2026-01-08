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
import AdminCustomers from "./screens/AdminCustomers"
import CustomerDashboard from "./screens/CustomerDashboard"
import CustomerSelling from "./screens/CustomerSelling"
import CustomerBuying from "./screens/CustomerBuying"
import CustomerRevenue from "./screens/CustomerRevenue"
import CustomerExpenses from "./screens/CustomerExpenses"

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Admin Login */}
          <Route path="/admin@shion" element={<AdminLogin />} />
          
          {/* Admin Main Routes */}
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
          
          {/* Approval and Request Routes */}
          <Route 
            path="/admin@shion/approvals" 
            element={
              <ProtectedRoute>
                <AdminApprovalPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin@shion/my-requests" 
            element={
              <ProtectedRoute>
                <AdminMyRequests />
              </ProtectedRoute>
            } 
          />

          {/* Customer Management Routes */}
          <Route 
            path="/admin@shion/customers" 
            element={
              <ProtectedRoute>
                <AdminCustomers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin@shion/customer/:customerId" 
            element={
              <ProtectedRoute>
                <CustomerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin@shion/customer/:customerId/selling" 
            element={
              <ProtectedRoute>
                <CustomerSelling />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin@shion/customer/:customerId/buying" 
            element={
              <ProtectedRoute>
                <CustomerBuying />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin@shion/customer/:customerId/revenue" 
            element={
              <ProtectedRoute>
                <CustomerRevenue />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin@shion/customer/:customerId/expenses" 
            element={
              <ProtectedRoute>
                <CustomerExpenses />
              </ProtectedRoute>
            } 
          />

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