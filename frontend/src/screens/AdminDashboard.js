"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,  
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
  const [selectedMonth, setSelectedMonth] = useState("all")
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
  const [lineChartData, setLineChartData] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [selectedMonth])

  const filterByMonth = (items) => {
    if (selectedMonth === "all") return items

    return items.filter(item => {
      const itemDate = new Date(item.date)
      const [year, month] = selectedMonth.split("-")
      return itemDate.getFullYear() === parseInt(year) && 
             itemDate.getMonth() + 1 === parseInt(month)
    })
  }

  const generateLineChartData = (sellingItems, buyingItems, revenueItems, expensesItems) => {
    const monthlyData = {}

    // Helper function to add data to monthly totals
    const addToMonth = (item, category) => {
      const date = new Date(item.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          Selling: 0,
          Buying: 0,
          Revenue: 0,
          Expenses: 0,
        }
      }

      if (category === 'selling') {
        monthlyData[monthKey].Selling += Number.parseFloat(item.sellingPrice) || 0
      } else if (category === 'buying') {
        monthlyData[monthKey].Buying += Number.parseFloat(item.price) || 0
      } else if (category === 'revenue') {
        monthlyData[monthKey].Revenue += Number.parseFloat(item.amount) || 0
      } else if (category === 'expenses') {
        monthlyData[monthKey].Expenses += Number.parseFloat(item.amount) || 0
      }
    }

    // Process all items
    sellingItems.forEach(item => addToMonth(item, 'selling'))
    buyingItems.forEach(item => addToMonth(item, 'buying'))
    revenueItems.forEach(item => addToMonth(item, 'revenue'))
    expensesItems.forEach(item => addToMonth(item, 'expenses'))

    // Convert to array and sort by date
    const chartData = Object.values(monthlyData).sort((a, b) => {
      return a.month.localeCompare(b.month)
    })

    // Format month labels
    return chartData.map(item => ({
      ...item,
      month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }))
  }

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

      // Convert to arrays
      const sellingItems = []
      sellingSnap.forEach((doc) => {
        sellingItems.push({ id: doc.id, ...doc.data() })
      })

      const buyingItems = []
      buyingSnap.forEach((doc) => {
        buyingItems.push({ id: doc.id, ...doc.data() })
      })

      const revenueItems = []
      revenueSnap.forEach((doc) => {
        revenueItems.push({ id: doc.id, ...doc.data() })
      })

      const expensesItems = []
      expensesSnap.forEach((doc) => {
        expensesItems.push({ id: doc.id, ...doc.data() })
      })

      // Generate line chart data based on filter
      let chartDataSource = {
        selling: sellingItems,
        buying: buyingItems,
        revenue: revenueItems,
        expenses: expensesItems
      }

      if (selectedMonth !== "all") {
        chartDataSource = {
          selling: filterByMonth(sellingItems),
          buying: filterByMonth(buyingItems),
          revenue: filterByMonth(revenueItems),
          expenses: filterByMonth(expensesItems)
        }
      }

      const lineData = generateLineChartData(
        chartDataSource.selling,
        chartDataSource.buying,
        chartDataSource.revenue,
        chartDataSource.expenses
      )
      setLineChartData(lineData)

      // Filter by selected month for dashboard cards
      const filteredSelling = filterByMonth(sellingItems)
      const filteredBuying = filterByMonth(buyingItems)
      const filteredRevenue = filterByMonth(revenueItems)
      const filteredExpenses = filterByMonth(expensesItems)

      // Calculate selling data
      let sellingProfit = 0
      let totalSelling = 0
      filteredSelling.forEach((data) => {
        const profit = Number.parseFloat(data.profit) || 0
        const selling = Number.parseFloat(data.sellingPrice) || 0
        sellingProfit += profit
        totalSelling += selling
      })

      // Calculate buying data
      let totalBuying = 0
      filteredBuying.forEach((data) => {
        totalBuying += Number.parseFloat(data.price) || 0
      })

      // Calculate revenue data
      let totalRevenue = 0
      filteredRevenue.forEach((data) => {
        totalRevenue += Number.parseFloat(data.amount) || 0
      })

      // Calculate expenses data
      let totalExpenses = 0
      filteredExpenses.forEach((data) => {
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
        sellingCount: filteredSelling.length,
        buyingCount: filteredBuying.length,
        revenueCount: filteredRevenue.length,
        expensesCount: filteredExpenses.length,
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

  // Bar chart data with updated colors
  const barChartData = [
    { name: "Revenue", amount: dashboardData.totalRevenue, fill: "#10b981" },
    { name: "Selling Profit", amount: dashboardData.sellingProfit, fill: "#3b82f6" },
    { name: "Buying", amount: dashboardData.totalBuying, fill: "#f59e0b" },
    { name: "Expenses", amount: dashboardData.totalExpenses, fill: "#ef4444" },
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

          {/* Current Balance Card with Month Filter */}
          <div className="balance-card">
            <div className="balance-content">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <h3>Current Balance</h3>
                <div>
                  <label className="form-label me-2 mb-0" style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                    Filter by Month:
                  </label>
                  <select 
                    className="form-select form-select-sm d-inline-block" 
                    style={{ width: 'auto', paddingRight: '2.5rem' }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    {[...Array(12)].map((_, i) => {
                      const date = new Date()
                      date.setMonth(date.getMonth() - i)
                      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      return <option key={value} value={value}>{label}</option>
                    })}
                  </select>
                </div>
              </div>
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
              <h5>Monthly Trends</h5>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    style={{ fontSize: '0.7rem' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
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
                  <Line 
                    type="monotone" 
                    dataKey="Selling" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Buying" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Expenses" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444' }}
                  />
                </LineChart>
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
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
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