"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import AdminNavbar from "../components/AdminNavbar"
import { generatePDF, generateExcel } from "../utils/reportGenerator"
import { db } from "../firebase" // Import the db variable from firebase
import "../styles/AdminTable.css"

const AdminExpenses = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("date")
  const [sortDirection, setSortDirection] = useState("desc")
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    assist: "Vishwa",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    billNumber: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

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

  const handleDelete = async (id) => {
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
  }

  const resetForm = () => {
    setFormData({
      assist: "Vishwa",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      billNumber: "",
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

  const handleGenerateReport = () => {
    const headers = ["Date", "Assist", "Amount (¥)", "Bill Number"]
    const reportData = filteredAndSortedData.map((item) => [
      item.date,
      item.assist,
      `¥${item.amount.toLocaleString()}`,
      item.billNumber,
    ])

    const totalExpenses = filteredAndSortedData.reduce((sum, item) => sum + item.amount, 0)
    const summary = {
      "Total Entries": filteredAndSortedData.length,
      "Total Expenses": `¥${totalExpenses.toLocaleString()}`,
    }

    generatePDF("Expenses Report", headers, reportData, summary)
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
                  <th onClick={() => handleSort("assist")} style={{ cursor: "pointer" }}>
                    Assist {sortField === "assist" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("amount")} style={{ cursor: "pointer" }}>
                    Amount (¥) {sortField === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Bill Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.assist}</td>
                      <td className="text-danger fw-bold">¥{item.amount.toLocaleString()}</td>
                      <td>{item.billNumber}</td>
                      <td>
                        <button onClick={() => handleDelete(item.id)} className="btn btn-sm btn-danger">
                          Delete
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
    </>
  )
}

export default AdminExpenses
