"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import AdminNavbar from "../components/AdminNavbar"
import { generateDashboardReport } from "../utils/reportGenerator"
import "../styles/AdminDashboard.css"

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalSelling: 0,
    totalBuying: 0,
    totalExpenses: 0,
    sellingProfit: 0,
    balance: 0,
    sellingCount: 0,
    buyingCount: 0,
    revenueCount: 0,
    expensesCount: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch all collections
      const [sellingSnap, buyingSnap, revenueSnap, expensesSnap] = await Promise.all([
        getDocs(collection(db, "selling")),
        getDocs(collection(db, "buying")),
        getDocs(collection(db, "revenue")),
        getDocs(collection(db, "expenses")),
      ])

      // Calculate selling data
      let sellingProfit = 0
      let totalSelling = 0
      sellingSnap.forEach((doc) => {
        const data = doc.data()
        const profit = Number.parseFloat(data.profit) || 0
        const selling = Number.parseFloat(data.sellingPrice) || 0
        sellingProfit += profit
        totalSelling += selling
      })

      // Calculate buying data
      let totalBuying = 0
      buyingSnap.forEach((doc) => {
        const data = doc.data()
        totalBuying += Number.parseFloat(data.price) || 0
      })

      // Calculate revenue data
      let totalRevenue = 0
      revenueSnap.forEach((doc) => {
        const data = doc.data()
        totalRevenue += Number.parseFloat(data.amount) || 0
      })

      // Calculate expenses data
      let totalExpenses = 0
      expensesSnap.forEach((doc) => {
        const data = doc.data()
        totalExpenses += Number.parseFloat(data.amount) || 0
      })

      // Calculate balance: (Revenue + Selling Profit) - (Buying + Expenses)
      const balance = totalRevenue + sellingProfit - (totalBuying + totalExpenses)

      setDashboardData({
        totalRevenue,
        totalSelling,
        totalBuying,
        totalExpenses,
        sellingProfit,
        balance,
        sellingCount: sellingSnap.size,
        buyingCount: buyingSnap.size,
        revenueCount: revenueSnap.size,
        expensesCount: expensesSnap.size,
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

 const handleGenerateReport = async () => {
  await generateDashboardReport(dashboardData)
}

  // Pie chart data
  const pieChartData = [
    { name: "Selling Profit", value: dashboardData.sellingProfit, color: "#10b981" },
    { name: "Buying", value: dashboardData.totalBuying, color: "#f59e0b" },
    { name: "Expenses", value: dashboardData.totalExpenses, color: "#ef4444" },
  ]

  // Bar chart data
  const barChartData = [
    { name: "Revenue", amount: dashboardData.totalRevenue },
    { name: "Selling Profit", amount: dashboardData.sellingProfit },
    { name: "Buying", amount: dashboardData.totalBuying },
    { name: "Expenses", amount: dashboardData.totalExpenses },
  ]

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "calc(100vh - 70px)" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavbar />
      <div className="admin-dashboard">
        <div className="container-fluid py-4">
          <div className="dashboard-header">
            <h2>Admin Dashboard</h2>
            <button onClick={handleGenerateReport} className="btn btn-success">
              Generate Full Report
            </button>
          </div>

          {/* Current Balance Card */}
          <div className="balance-card">
            <div className="balance-content">
              <h3>Current Balance</h3>
              <div className={`balance-amount ${dashboardData.balance >= 0 ? "positive" : "negative"}`}>
                ¥{dashboardData.balance.toLocaleString()}
              </div>
              <p className="balance-formula">(Revenue + Selling Profit) - (Buying + Expenses)</p>
            </div>
          </div>

          {/* Main Action Cards */}
          <div className="dashboard-grid">
            <Link to="/admin@shion/selling" className="dashboard-card selling-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>
              <h4>Selling</h4>
              <p className="card-count">{dashboardData.sellingCount} transactions</p>
              <p className="card-amount">¥{dashboardData.totalSelling.toLocaleString()}</p>
            </Link>

            <Link to="/admin@shion/buying" className="dashboard-card buying-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h4>Buying</h4>
              <p className="card-count">{dashboardData.buyingCount} purchases</p>
              <p className="card-amount">¥{dashboardData.totalBuying.toLocaleString()}</p>
            </Link>

            <Link to="/admin@shion/revenue" className="dashboard-card revenue-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h4>Revenue</h4>
              <p className="card-count">{dashboardData.revenueCount} entries</p>
              <p className="card-amount">¥{dashboardData.totalRevenue.toLocaleString()}</p>
            </Link>

            <Link to="/admin@shion/expenses" className="dashboard-card expenses-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h4>Expenses</h4>
              <p className="card-count">{dashboardData.expensesCount} expenses</p>
              <p className="card-amount">¥{dashboardData.totalExpenses.toLocaleString()}</p>
            </Link>
          </div>

          {/* Analytics Section */}
          <div className="charts-grid">
            <div className="chart-card">
              <h5>Financial Distribution</h5>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h5>Financial Overview</h5>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '0.7rem' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '0.7rem' }} />
                  <Tooltip 
                    formatter={(value) => `¥${value.toLocaleString()}`}
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminDashboard