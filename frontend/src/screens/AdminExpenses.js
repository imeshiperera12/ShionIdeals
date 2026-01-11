"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, Timestamp } from "firebase/firestore"
import AdminNavbar from "../components/AdminNavbar"
import { generatePDF, generateExcel } from "../utils/reportGenerator"
import { db, auth } from "../firebase"
import { createApprovalRequest } from "../utils/approvalService"
import { isSuperAdmin } from "../config/adminConfig"
import "../styles/AdminTable.css"

const AdminExpenses = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("date")
  const [sortDirection, setSortDirection] = useState("desc")
  const [uploading, setUploading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [selectedAssist, setSelectedAssist] = useState("all")

  const [formData, setFormData] = useState({
    assist: "Vishwa",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    billNumber: "",
    reason: "",
  })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
    })
    fetchData()
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    calculateTotal()
  }, [data, selectedMonth, selectedAssist])

  const calculateTotal = () => {
    let filtered = data
    if (selectedMonth !== "all") {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date)
        const [year, month] = selectedMonth.split("-")
        return itemDate.getFullYear() === parseInt(year) && 
               itemDate.getMonth() + 1 === parseInt(month)
      })
    }
    if (selectedAssist !== "all") {
      filtered = filtered.filter(item => item.assist === selectedAssist)
    }
    const total = filtered.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    setTotalExpenses(total)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, "expenses"))
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setData(items)
    } catch (error) {
      console.error("Error fetching expenses data:", error)
      alert("Error fetching data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setUploading(true)

      const dataToSave = {
        assist: formData.assist,
        amount: Number.parseFloat(formData.amount),
        date: formData.date,
        billNumber: formData.billNumber,
        reason: formData.reason,
        createdAt: Timestamp.now(),
      }

      await addDoc(collection(db, "expenses"), dataToSave)

      alert("Expense entry added successfully!")
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error adding expense entry:", error)
      alert(`Error adding entry: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      assist: item.assist,
      amount: item.amount.toString(),
      date: item.date,
      billNumber: item.billNumber,
      reason: item.reason || "",
    })
    setShowEditModal(true)
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()

    const updateData = {
      assist: formData.assist,
      amount: Number.parseFloat(formData.amount),
      date: formData.date,
      billNumber: formData.billNumber,
      reason: formData.reason,
    }

    if (currentUser && isSuperAdmin(currentUser.email)) {
      try {
        setUploading(true)
        await updateDoc(doc(db, "expenses", editingItem.id), updateData)
        alert("Entry updated successfully!")
        setShowEditModal(false)
        setEditingItem(null)
        resetForm()
        fetchData()
      } catch (error) {
        console.error("Error updating entry:", error)
        alert("Error updating entry. Please try again.")
      } finally {
        setUploading(false)
      }
    } else {
      try {
        setUploading(true)
        const requestData = {
          action: "update",
          collection: "expenses",
          itemId: editingItem.id,
          updateData,
          itemDetails: editingItem,
          requestedBy: currentUser?.email || "unknown",
        }

        const result = await createApprovalRequest(requestData)
        if (result.success) {
          alert("Update request sent to super admin for approval!")
          setShowEditModal(false)
          setEditingItem(null)
          resetForm()
        } else {
          alert("Error creating approval request.")
        }
      } catch (error) {
        console.error("Error creating approval request:", error)
        alert("Error sending request. Please try again.")
      } finally {
        setUploading(false)
      }
    }
  }

  const handleDelete = async (id, item) => {
    if (currentUser && isSuperAdmin(currentUser.email)) {
      if (window.confirm("Are you sure you want to delete this entry?")) {
        try {
          await deleteDoc(doc(db, "expenses", id))
          alert("Entry deleted successfully!")
          fetchData()
        } catch (error) {
          console.error("Error deleting entry:", error)
          alert("Error deleting entry. Please try again.")
        }
      }
    } else {
      if (window.confirm("This will send a delete request to the super admin for approval. Continue?")) {
        try {
          const requestData = {
            action: "delete",
            collection: "expenses",
            itemId: id,
            itemDetails: item,
            requestedBy: currentUser?.email || "unknown",
          }

          const result = await createApprovalRequest(requestData)
          if (result.success) {
            alert("Delete request sent to super admin for approval!")
          } else {
            alert("Error creating approval request.")
          }
        } catch (error) {
          console.error("Error creating approval request:", error)
          alert("Error sending request. Please try again.")
        }
      }
    }
  }

  const resetForm = () => {
    setFormData({
      assist: "Vishwa",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      billNumber: "",
      reason: "",
    })
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedData = data
    .filter((item) =>
      Object.values(item).some((value) => value?.toString().toLowerCase().includes(searchTerm.toLowerCase())),
    )
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const modifier = sortDirection === "asc" ? 1 : -1

      if (typeof aVal === "string") {
        return aVal.localeCompare(bVal) * modifier
      }
      return (aVal - bVal) * modifier
    })

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A"
    if (timestamp.toMillis) {
      return new Date(timestamp.toMillis()).toLocaleString()
    }
    return new Date(timestamp).toLocaleString()
  }

  const handleGenerateReport = async () => {
    const headers = ["Date", "Time", "Assist", "Amount (¥)", "Bill Number", "Reason"]
    const reportData = filteredAndSortedData.map((item) => [
      item.date,
      formatTime(item.createdAt),
      item.assist,
      `¥${item.amount.toLocaleString()}`,
      item.billNumber,
      item.reason || "-",
    ])

    const totalExpenses = filteredAndSortedData.reduce((sum, item) => sum + item.amount, 0)
    const summary = {
      "Total Entries": filteredAndSortedData.length,
      "Total Expenses": `¥${totalExpenses.toLocaleString()}`,
    }

    await generatePDF("Expenses Report", headers, reportData, summary)
    generateExcel("Expenses Report", headers, reportData, summary)
  }

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
      <div className="admin-table-container">
        <div className="container-fluid py-4">
          <div className="table-header">
            <h2>Expenses Management</h2>
            <div className="header-actions">
              <button onClick={handleGenerateReport} className="btn btn-success me-2">
                Generate Report
              </button>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                Add New Expense
              </button>
            </div>
          </div>

          <div className="alert alert-info mb-3" role="alert">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <strong>Total Expenses:</strong>
                <span className="fs-4 fw-bold ms-2 text-danger">¥{totalExpenses.toLocaleString()}</span>
              </div>
              <div className="d-flex gap-3 align-items-center">
                <div>
                  <label className="form-label me-2 mb-0" style={{ fontSize: '11px' }}>Filter by Assist:</label>
                  <select 
                    className="form-select form-select-sm d-inline-block" 
                    style={{ width: '150px', paddingRight: '2.2rem' }}
                    value={selectedAssist}
                    onChange={(e) => setSelectedAssist(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="Vishwa">Vishwa</option>
                    <option value="Dilshan">Dilshan</option>
                    <option value="Saman">Saman</option>
                  </select>
                </div>
                <div>
                  <label className="form-label me-2 mb-0" style={{ fontSize: '11px' }}>Filter by Month:</label>
                  <select 
                    className="form-select form-select-sm d-inline-block" 
                    style={{ width: 'auto' }}
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
            </div>
          </div>

          <div className="search-box mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th onClick={() => handleSort("date")} style={{ cursor: "pointer" }}>
                    Date {sortField === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Time</th>
                  <th onClick={() => handleSort("assist")} style={{ cursor: "pointer" }}>
                    Assist {sortField === "assist" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("amount")} style={{ cursor: "pointer" }}>
                    Amount (¥) {sortField === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Bill Number</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{formatTime(item.createdAt)}</td>
                      <td>{item.assist}</td>
                      <td className="text-danger fw-bold">¥{item.amount.toLocaleString()}</td>
                      <td>{item.billNumber}</td>
                      <td>{item.reason || "-"}</td>
                      <td>
                        <button onClick={() => handleEdit(item)} className="btn btn-sm btn-warning me-2">
                          {currentUser && !isSuperAdmin(currentUser.email) ? "Request Edit" : "Edit"}
                        </button>
                        <button onClick={() => handleDelete(item.id, item)} className="btn btn-sm btn-danger">
                          {currentUser && !isSuperAdmin(currentUser.email) ? "Request Delete" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Expense</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Assist</label>
                        <select
                          className="form-select"
                          value={formData.assist}
                          onChange={(e) => setFormData({ ...formData, assist: e.target.value })}
                          required
                        >
                          <option value="Vishwa">Vishwa</option>
                          <option value="Dilshan">Dilshan</option>
                          <option value="Saman">Saman</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Amount (¥)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Bill/Transaction/Tax Payment Number *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.billNumber}
                          onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                          placeholder="Required field"
                          required
                        />
                      </div>
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Reason for Expense</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          placeholder="Enter reason for this expense"
                          required
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowModal(false)
                          resetForm()
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={uploading}>
                        {uploading ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Uploading...
                          </>
                        ) : (
                          "Add Expense"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {currentUser && !isSuperAdmin(currentUser.email) ? "Request Edit" : "Edit Expense"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingItem(null)
                      resetForm()
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleUpdateSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Assist</label>
                        <select
                          className="form-select"
                          value={formData.assist}
                          onChange={(e) => setFormData({ ...formData, assist: e.target.value })}
                          required
                        >
                          <option value="Vishwa">Vishwa</option>
                          <option value="Dilshan">Dilshan</option>
                          <option value="Saman">Saman</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Amount (¥)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Bill/Transaction/Tax Payment Number *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.billNumber}
                          onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                          placeholder="Required field"
                          required
                        />
                      </div>
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Reason for Expense</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          placeholder="Enter reason for this expense"
                          required
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowEditModal(false)
                          setEditingItem(null)
                          resetForm()
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={uploading}>
                        {uploading ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Processing...
                          </>
                        ) : (
                          currentUser && !isSuperAdmin(currentUser.email) ? "Request Update" : "Update Expense"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminExpenses