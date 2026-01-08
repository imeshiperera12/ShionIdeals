"use client"

import { useState, useEffect } from "react"
import { useParams, useLocation, Link } from "react-router-dom"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, where } from "firebase/firestore"
import { db, auth } from "../firebase"
import AdminNavbar from "../components/AdminNavbar"
import { generatePDF, generateExcel } from "../utils/reportGenerator"
import "../styles/AdminTable.css"

const CustomerBuying = () => {
  const { customerId } = useParams()
  const location = useLocation()
  const customerName = location.state?.customerName || "Customer"
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("date")
  const [sortDirection, setSortDirection] = useState("desc")
  const [currentUser, setCurrentUser] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [totalBuying, setTotalBuying] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState("all")

  const [formData, setFormData] = useState({
    assist: "Vishwa",
    date: new Date().toISOString().split("T")[0],
    objectType: "Vehicle",
    identifier: "",
    market: "Auction",
    webSubOption: "",
    domesticSeller: "",
    price: "",
  })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
    })
    fetchData()
    return () => unsubscribe()
  }, [customerId])

  useEffect(() => {
    calculateTotal()
  }, [data, selectedMonth])

  const calculateTotal = () => {
    let filtered = data
    if (selectedMonth !== "all") {
      filtered = data.filter(item => {
        const itemDate = new Date(item.date)
        const [year, month] = selectedMonth.split("-")
        return itemDate.getFullYear() === parseInt(year) && 
               itemDate.getMonth() + 1 === parseInt(month)
      })
    }
    const total = filtered.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
    setTotalBuying(total)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, "customerBuying"), where("customerId", "==", customerId))
      const querySnapshot = await getDocs(q)
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setData(items)
    } catch (error) {
      console.error("Error fetching buying data:", error)
      alert("Error fetching data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const dataToSave = {
        customerId,
        customerName,
        ...formData,
        price: Number.parseFloat(formData.price),
        createdAt: Timestamp.now(),
      }

      await addDoc(collection(db, "customerBuying"), dataToSave)

      alert("Buying entry added successfully!")
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error adding buying entry:", error)
      alert("Error adding entry. Please try again.")
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      assist: item.assist,
      date: item.date,
      objectType: item.objectType,
      identifier: item.identifier,
      market: item.market,
      webSubOption: item.webSubOption || "",
      domesticSeller: item.domesticSeller || "",
      price: item.price.toString(),
    })
    setShowEditModal(true)
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()

    const updateData = {
      assist: formData.assist,
      date: formData.date,
      objectType: formData.objectType,
      identifier: formData.identifier,
      market: formData.market,
      webSubOption: formData.webSubOption,
      domesticSeller: formData.domesticSeller,
      price: Number.parseFloat(formData.price),
    }

    try {
      await updateDoc(doc(db, "customerBuying", editingItem.id), updateData)
      alert("Entry updated successfully!")
      setShowEditModal(false)
      setEditingItem(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error updating entry:", error)
      alert("Error updating entry. Please try again.")
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await deleteDoc(doc(db, "customerBuying", id))
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
      date: new Date().toISOString().split("T")[0],
      objectType: "Vehicle",
      identifier: "",
      market: "Auction",
      webSubOption: "",
      domesticSeller: "",
      price: "",
    })
  }

  const getIdentifierLabel = () => {
    switch (formData.objectType) {
      case "Vehicle":
        return "Enter chassis number or model number"
      case "Machinery":
        return "Enter model number"
      case "Parts":
        return "Enter part name"
      default:
        return "Enter identifier"
    }
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
    const headers = ["Date", "Time", "Assist", "Type", "Identifier", "Market", "Web Option", "Domestic Seller", "Price (¥)"]
    const reportData = filteredAndSortedData.map((item) => [
      item.date,
      formatTime(item.createdAt),
      item.assist,
      item.objectType,
      item.identifier,
      item.market,
      item.webSubOption || "-",
      item.domesticSeller || "-",
      `¥${item.price.toLocaleString()}`,
    ])

    const totalPrice = filteredAndSortedData.reduce((sum, item) => sum + item.price, 0)
    const summary = {
      "Customer": customerName,
      "Total Entries": filteredAndSortedData.length,
      "Total Buying Amount": `¥${totalPrice.toLocaleString()}`,
    }

    await generatePDF(`${customerName} - Buying Report`, headers, reportData, summary)
    generateExcel(`${customerName} - Buying Report`, headers, reportData, summary)
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
            <div>
              <h2>{customerName} - Buying Management</h2>
              <Link to={`/admin@shion/customer/${customerId}`} state={{ customerName }} className="btn btn-sm btn-secondary mt-2">
                ← Back to Dashboard
              </Link>
            </div>
            <div className="header-actions">
              <button onClick={handleGenerateReport} className="btn btn-success me-2">
                Generate Report
              </button>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                Add New Purchase
              </button>
            </div>
          </div>

          <div className="alert alert-info mb-3" role="alert">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <strong>Total Buying Amount:</strong>
                <span className="fs-4 fw-bold ms-2">¥{totalBuying.toLocaleString()}</span>
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
                  <th>Type</th>
                  <th>Identifier</th>
                  <th>Market</th>
                  <th>Web Option</th>
                  <th>Domestic Seller</th>
                  <th onClick={() => handleSort("price")} style={{ cursor: "pointer" }}>
                    Price (¥) {sortField === "price" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{formatTime(item.createdAt)}</td>
                      <td>{item.assist}</td>
                      <td>{item.objectType}</td>
                      <td>{item.identifier}</td>
                      <td>{item.market}</td>
                      <td>{item.webSubOption || "-"}</td>
                      <td>{item.domesticSeller || "-"}</td>
                      <td>¥{item.price.toLocaleString()}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button onClick={() => handleEdit(item)} className="btn btn-sm btn-warning">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="btn btn-sm btn-danger">
                            Delete
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
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Purchase for {customerName}</h5>
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
                        <label className="form-label">Object Type</label>
                        <select
                          className="form-select"
                          value={formData.objectType}
                          onChange={(e) => setFormData({ ...formData, objectType: e.target.value, identifier: "" })}
                          required
                        >
                          <option value="Vehicle">Vehicle</option>
                          <option value="Machinery">Machinery</option>
                          <option value="Parts">Parts</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">{getIdentifierLabel()}</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.identifier}
                          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                          placeholder={getIdentifierLabel()}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Market</label>
                        <select
                          className="form-select"
                          value={formData.market}
                          onChange={(e) => setFormData({ ...formData, market: e.target.value, webSubOption: "", domesticSeller: "" })}
                          required
                        >
                          <option value="Auction">Auction</option>
                          <option value="Web">Web</option>
                          <option value="Domestic Seller">Domestic Seller</option>
                        </select>
                      </div>
                      {formData.market === "Web" && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Web Option</label>
                          <select
                            className="form-select"
                            value={formData.webSubOption}
                            onChange={(e) => setFormData({ ...formData, webSubOption: e.target.value })}
                            required
                          >
                            <option value="">Select option</option>
                            <option value="fb">Facebook</option>
                            <option value="yahoo_out">Yahoo Out</option>
                          </select>
                        </div>
                      )}
                      {formData.market === "Domestic Seller" && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Domestic Seller Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.domesticSeller}
                            onChange={(e) => setFormData({ ...formData, domesticSeller: e.target.value })}
                            placeholder="Enter domestic seller name"
                            required
                          />
                        </div>
                      )}
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Price (¥)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          min="0"
                          step="0.01"
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
                        Add Purchase
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Same structure */}
      {showEditModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Purchase for {customerName}</h5>
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
                        <label className="form-label">Object Type</label>
                        <select
                          className="form-select"
                          value={formData.objectType}
                          onChange={(e) => setFormData({ ...formData, objectType: e.target.value })}
                          required
                        >
                          <option value="Vehicle">Vehicle</option>
                          <option value="Machinery">Machinery</option>
                          <option value="Parts">Parts</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">{getIdentifierLabel()}</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.identifier}
                          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                          placeholder={getIdentifierLabel()}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Market</label>
                        <select
                          className="form-select"
                          value={formData.market}
                          onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                          required
                        >
                          <option value="Auction">Auction</option>
                          <option value="Web">Web</option>
                          <option value="Domestic Seller">Domestic Seller</option>
                        </select>
                      </div>
                      {formData.market === "Web" && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Web Option</label>
                          <select
                            className="form-select"
                            value={formData.webSubOption}
                            onChange={(e) => setFormData({ ...formData, webSubOption: e.target.value })}
                            required
                          >
                            <option value="">Select option</option>
                            <option value="fb">Facebook</option>
                            <option value="yahoo_out">Yahoo Out</option>
                          </select>
                        </div>
                      )}
                      {formData.market === "Domestic Seller" && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Domestic Seller Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.domesticSeller}
                            onChange={(e) => setFormData({ ...formData, domesticSeller: e.target.value })}
                            placeholder="Enter domestic seller name"
                            required
                          />
                        </div>
                      )}
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Price (¥)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          min="0"
                          step="0.01"
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
                        Update Purchase
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

export default CustomerBuying