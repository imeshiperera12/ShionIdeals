"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, Timestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import AdminNavbar from "../components/AdminNavbar"
import { generatePDF, generateExcel } from "../utils/reportGenerator"
import { createApprovalRequest } from "../utils/approvalService"
import { isSuperAdmin } from "../config/adminConfig"
import "../styles/AdminTable.css"

const AdminRevenue = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("date")
  const [sortDirection, setSortDirection] = useState("desc")
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [selectedAssist, setSelectedAssist] = useState("all")

  const [formData, setFormData] = useState({
    country: "Sri Lanka",
    customCountry: "",
    assist: "Vishwa",
    amount: "",
    rate: "",
    date: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
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
    setTotalRevenue(total)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, "revenue"))
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setData(items)
    } catch (error) {
      console.error("Error fetching revenue data:", error)
      alert("Error fetching data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const country = formData.country === "Custom" ? formData.customCountry : formData.country

      const dataToSave = {
        country,
        assist: formData.assist,
        amount: parseFloat(formData.amount),
        rate: parseFloat(formData.rate),
        date: formData.date,
        invoiceNumber: formData.invoiceNumber,
        createdAt: Timestamp.now(),
      }

      await addDoc(collection(db, "revenue"), dataToSave)

      alert("Revenue entry added successfully!")
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error adding revenue entry:", error)
      alert("Error adding entry. Please try again.")
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      country: item.country,
      customCountry: "",
      assist: item.assist,
      amount: item.amount.toString(),
      rate: item.rate.toString(),
      date: item.date,
      invoiceNumber: item.invoiceNumber,
    })
    setShowEditModal(true)
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()

    const country = formData.country === "Custom" ? formData.customCountry : formData.country

    const updateData = {
      country,
      assist: formData.assist,
      amount: parseFloat(formData.amount),
      rate: parseFloat(formData.rate),
      date: formData.date,
      invoiceNumber: formData.invoiceNumber,
    }

    if (currentUser && isSuperAdmin(currentUser.email)) {
      try {
        await updateDoc(doc(db, "revenue", editingItem.id), updateData)
        alert("Entry updated successfully!")
        setShowEditModal(false)
        setEditingItem(null)
        resetForm()
        fetchData()
      } catch (error) {
        console.error("Error updating entry:", error)
        alert("Error updating entry. Please try again.")
      }
    } else {
      try {
        const requestData = {
          action: "update",
          collection: "revenue",
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
      }
    }
  }

  const handleDelete = async (id, item) => {
    if (currentUser && isSuperAdmin(currentUser.email)) {
      if (window.confirm("Are you sure you want to delete this entry?")) {
        try {
          await deleteDoc(doc(db, "revenue", id))
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
            collection: "revenue",
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
      country: "Sri Lanka",
      customCountry: "",
      assist: "Vishwa",
      amount: "",
      rate: "",
      date: new Date().toISOString().split("T")[0],
      invoiceNumber: "",
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
    const headers = ["Date", "Time", "Country", "Assist", "Amount (¥)", "Rate", "Invoice Number"]
    const reportData = filteredAndSortedData.map((item) => [
      item.date,
      formatTime(item.createdAt),
      item.country,
      item.assist,
      `¥${item.amount.toLocaleString()}`,
      item.rate,
      item.invoiceNumber,
    ])

    const summary = {
      "Total Entries": filteredAndSortedData.length,
      "Total Revenue": `¥${totalRevenue.toLocaleString()}`,
    }

    await generatePDF("Revenue Report", headers, reportData, summary)
    generateExcel("Revenue Report", headers, reportData, summary)
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
            <h2>Revenue Management</h2>
            <div className="header-actions">
              <button onClick={handleGenerateReport} className="btn btn-success me-2">
                Generate Report
              </button>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                Add Revenue Entry
              </button>
            </div>
          </div>

          <div className="alert alert-info mb-3" role="alert">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <strong>Total Revenue:</strong>
                <span className="fs-4 fw-bold ms-2">¥{totalRevenue.toLocaleString()}</span>
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
                  <th onClick={() => handleSort("country")} style={{ cursor: "pointer" }}>
                    Country {sortField === "country" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("assist")} style={{ cursor: "pointer" }}>
                    Assist {sortField === "assist" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("amount")} style={{ cursor: "pointer" }}>
                    Amount (¥) {sortField === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Rate</th>
                  <th>Invoice Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{formatTime(item.createdAt)}</td>
                      <td>{item.country}</td>
                      <td>{item.assist}</td>
                      <td className="text-success fw-bold">¥{item.amount.toLocaleString()}</td>
                      <td>{item.rate}</td>
                      <td>{item.invoiceNumber}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button onClick={() => handleEdit(item)} className="btn btn-sm btn-warning">
                            EDIT
                          </button>
                          <button onClick={() => handleDelete(item.id, item)} className="btn btn-sm btn-danger">
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Revenue Entry</h5>
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
                        <label className="form-label">Country</label>
                        <select
                          className="form-select"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          required
                        >
                          <option value="Sri Lanka">Sri Lanka</option>
                          <option value="Japan">Japan</option>
                          <option value="Custom">Other (Type Custom)</option>
                        </select>
                      </div>
                      {formData.country === "Custom" && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Custom Country</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.customCountry}
                            onChange={(e) => setFormData({ ...formData, customCountry: e.target.value })}
                            placeholder="Enter country name"
                            required
                          />
                        </div>
                      )}
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
                        <div className="input-group">
                          <span className="input-group-text">¥</span>
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
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Rate</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.rate}
                          onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
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
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Invoice Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.invoiceNumber}
                          onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                          placeholder="Enter invoice number"
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
                      <button type="submit" className="btn btn-primary">
                        Add Revenue
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {currentUser && !isSuperAdmin(currentUser.email) ? "Request Edit" : "Edit Revenue Entry"}
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
                        <label className="form-label">Country</label>
                        <select
                          className="form-select"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          required
                        >
                          <option value="Sri Lanka">Sri Lanka</option>
                          <option value="Japan">Japan</option>
                          <option value="Custom">Other (Type Custom)</option>
                        </select>
                      </div>
                      {formData.country === "Custom" && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Custom Country</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.customCountry}
                            onChange={(e) => setFormData({ ...formData, customCountry: e.target.value })}
                            placeholder="Enter country name"
                            required
                          />
                        </div>
                      )}
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
                        <div className="input-group">
                          <span className="input-group-text">¥</span>
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
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Rate</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.rate}
                          onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
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
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Invoice Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.invoiceNumber}
                          onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                          placeholder="Enter invoice number"
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
                      <button type="submit" className="btn btn-primary">
                        {currentUser && !isSuperAdmin(currentUser.email) ? "Request Update" : "Update Revenue"}
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

export default AdminRevenue