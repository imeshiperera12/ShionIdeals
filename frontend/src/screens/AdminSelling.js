import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import AdminNavbar from "../components/AdminNavbar"
import { generatePDF, generateExcel, generateProformaInvoice } from "../utils/reportGenerator"
import { createApprovalRequest } from "../utils/approvalService"
import { fetchBuyingDetails } from "../utils/buyingService"
import { isSuperAdmin } from "../config/adminConfig"
import "../styles/AdminTable.css"

const AdminSelling = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("date")
  const [sortDirection, setSortDirection] = useState("desc")
  const [buyingItems, setBuyingItems] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [totalProfit, setTotalProfit] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [selectedAssist, setSelectedAssist] = useState("all")

  const [formData, setFormData] = useState({
    assist: "Vishwa",
    date: new Date().toISOString().split("T")[0],
    buyingId: "",
    sellingPrice: "",
    profit: "",
    country: "Sri Lanka",
    customCountry: "",
    invoiceNumber: "",
    customerName: "",
    customerEmail: "",
    customerAddress: "",
  })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
    })
    fetchData()
    fetchBuyingData()
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    calculateTotal()
  }, [data, selectedMonth, selectedAssist])

  useEffect(() => {
    if (formData.buyingId && formData.sellingPrice) {
      const selectedBuying = buyingItems.find(item => item.id === formData.buyingId)
      if (selectedBuying) {
        const buyingPrice = Number.parseFloat(selectedBuying.price) || 0
        const sellingPrice = Number.parseFloat(formData.sellingPrice) || 0
        const calculatedProfit = sellingPrice - buyingPrice
        setFormData(prev => ({ ...prev, profit: calculatedProfit.toFixed(2) }))
      }
    }
  }, [formData.buyingId, formData.sellingPrice, buyingItems])

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
      // Fixed: case-insensitive comparison with trim
      filtered = filtered.filter(item => 
        item.assist?.trim().toLowerCase() === selectedAssist.toLowerCase()
      )
    }
    
    const total = filtered.reduce((sum, item) => sum + (parseFloat(item.profit) || 0), 0)
    setTotalProfit(total)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, "selling"))
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setData(items)
    } catch (error) {
      console.error("Error fetching selling data:", error)
      alert("Error fetching data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchBuyingData = async () => {
    const items = await fetchBuyingDetails()
    setBuyingItems(items)
  }

  const handleGenerateInvoice = async (item) => {
    const buyingData = buyingItems.find(b => b.id === item.buyingId)
    await generateProformaInvoice(item, buyingData)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const country = formData.country === "Custom" ? formData.customCountry : formData.country

      const dataToSave = {
        assist: formData.assist,
        date: formData.date,
        buyingId: formData.buyingId,
        sellingPrice: Number.parseFloat(formData.sellingPrice),
        profit: Number.parseFloat(formData.profit),
        country,
        invoiceNumber: formData.invoiceNumber,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        createdAt: Timestamp.now(),
      }

      await addDoc(collection(db, "selling"), dataToSave)

      alert("Selling entry added successfully!")
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error adding selling entry:", error)
      alert("Error adding entry. Please try again.")
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      assist: item.assist,
      date: item.date,
      buyingId: item.buyingId,
      sellingPrice: item.sellingPrice.toString(),
      profit: item.profit.toString(),
      country: item.country,
      customCountry: "",
      invoiceNumber: item.invoiceNumber,
      customerName: item.customerName || "",
      customerEmail: item.customerEmail || "",
      customerAddress: item.customerAddress || "",
    })
    setShowEditModal(true)
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()

    const country = formData.country === "Custom" ? formData.customCountry : formData.country

    const updateData = {
      assist: formData.assist,
      date: formData.date,
      buyingId: formData.buyingId,
      sellingPrice: Number.parseFloat(formData.sellingPrice),
      profit: Number.parseFloat(formData.profit),
      country,
      invoiceNumber: formData.invoiceNumber,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerAddress: formData.customerAddress,
    }

    if (currentUser && isSuperAdmin(currentUser.email)) {
      try {
        await updateDoc(doc(db, "selling", editingItem.id), updateData)
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
          collection: "selling",
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
          await deleteDoc(doc(db, "selling", id))
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
            collection: "selling",
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
      date: new Date().toISOString().split("T")[0],
      buyingId: "",
      sellingPrice: "",
      profit: "",
      country: "Sri Lanka",
      customCountry: "",
      invoiceNumber: "",
      customerName: "",
      customerEmail: "",
      customerAddress: "",
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
    .filter((item) => {
      // Apply assist filter first
      let matchesAssist = true
      if (selectedAssist !== "all") {
        matchesAssist = item.assist?.trim().toLowerCase() === selectedAssist.toLowerCase()
      }
      
      // Apply month filter
      let matchesMonth = true
      if (selectedMonth !== "all") {
        const itemDate = new Date(item.date)
        const [year, month] = selectedMonth.split("-")
        matchesMonth = itemDate.getFullYear() === parseInt(year) && 
                      itemDate.getMonth() + 1 === parseInt(month)
      }
      
      // Apply search filter
      const matchesSearch = searchTerm === "" || Object.values(item).some((value) => 
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      return matchesSearch && matchesMonth && matchesAssist
    })
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
    const headers = ["Date", "Time", "Assist", "Buying ID", "Selling Price (¥)", "Profit (¥)", "Country", "Customer Name", "Customer Email", "Customer Address", "Invoice Number"]
    const reportData = filteredAndSortedData.map((item) => [
      item.date,
      formatTime(item.createdAt),
      item.assist,
      item.buyingId,
      `¥${item.sellingPrice.toLocaleString()}`,
      `¥${item.profit.toLocaleString()}`,
      item.country,
      item.customerName || "-",
      item.customerEmail || "-",
      item.customerAddress || "-",
      item.invoiceNumber,
    ])

    const totalProfit = filteredAndSortedData.reduce((sum, item) => sum + item.profit, 0)
    const summary = {
      "Total Entries": filteredAndSortedData.length,
      "Total Profit": `¥${totalProfit.toLocaleString()}`,
    }

    await generatePDF("Selling Report", headers, reportData, summary)
    generateExcel("Selling Report", headers, reportData, summary)
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
            <h2>Selling Management</h2>
            <div className="header-actions">
              <button onClick={handleGenerateReport} className="btn btn-success me-2">
                Generate Report
              </button>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                Add New Sale
              </button>
            </div>
          </div>

          <div className="alert alert-info mb-3" role="alert">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <strong>Total Profit:</strong>
                <span className="fs-4 fw-bold ms-2 text-success">¥{totalProfit.toLocaleString()}</span>
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
                  <th>Buying ID</th>
                  <th onClick={() => handleSort("sellingPrice")} style={{ cursor: "pointer" }}>
                    Selling Price (¥) {sortField === "sellingPrice" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("profit")} style={{ cursor: "pointer" }}>
                    Profit (¥) {sortField === "profit" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Country</th>
                  <th>Customer Name</th>
                  <th>Customer Address</th>
                  <th>Invoice Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{formatTime(item.createdAt)}</td>
                      <td>{item.assist}</td>
                      <td>{item.buyingId}</td>
                      <td>¥{item.sellingPrice.toLocaleString()}</td>
                      <td className="text-success fw-bold">¥{item.profit.toLocaleString()}</td>
                      <td>{item.country}</td>
                      <td>{item.customerName || "-"}</td>
                      <td>{item.customerAddress || "-"}</td>
                      <td>{item.invoiceNumber}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button onClick={() => handleGenerateInvoice(item)} className="btn btn-sm btn-info" title="Generate Invoice">
                            📄
                          </button>
                          <button onClick={() => handleEdit(item)} className="btn btn-sm btn-warning">
                            {currentUser && !isSuperAdmin(currentUser.email) ? "Request Edit" : "Edit"}
                          </button>
                          <button onClick={() => handleDelete(item.id, item)} className="btn btn-sm btn-danger">
                            {currentUser && !isSuperAdmin(currentUser.email) ? "Request Delete" : "Delete"}
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
                  <h5 className="modal-title">Add New Sale</h5>
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
                        <label className="form-label">Buying ID</label>
                        <select
                          className="form-select"
                          value={formData.buyingId}
                          onChange={(e) => setFormData({ ...formData, buyingId: e.target.value })}
                          required
                        >
                          <option value="">Select buying entry</option>
                          {buyingItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.identifier} - {item.objectType} (¥{item.price})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Selling Price (¥)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.sellingPrice}
                          onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Profit (¥) - Auto Calculated</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.profit}
                          readOnly
                          style={{ backgroundColor: '#e9ecef' }}
                          step="0.01"
                        />
                        <small className="text-muted">Automatically calculated: Selling Price - Buying Price</small>
                      </div>
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
                        <label className="form-label">Customer Name / Company Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          placeholder="Enter customer or company name"
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Customer Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.customerEmail}
                          onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                          placeholder="Enter customer email"
                          required
                        />
                      </div>
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Customer Address</label>
                        <textarea
                          className="form-control"
                          value={formData.customerAddress}
                          onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                          placeholder="Enter customer address"
                          rows="3"
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
                        Add Sale
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
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {currentUser && !isSuperAdmin(currentUser.email) ? "Request Edit" : "Edit Sale"}
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
                        <label className="form-label">Buying ID</label>
                        <select
                          className="form-select"
                          value={formData.buyingId}
                          onChange={(e) => setFormData({ ...formData, buyingId: e.target.value })}
                          required
                        >
                          <option value="">Select buying entry</option>
                          {buyingItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.identifier} - {item.objectType} (¥{item.price})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Selling Price (¥)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.sellingPrice}
                          onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Profit (¥) - Auto Calculated</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.profit}
                          readOnly
                          style={{ backgroundColor: '#e9ecef' }}
                          step="0.01"
                        />
                        <small className="text-muted">Automatically calculated: Selling Price - Buying Price</small>
                      </div>
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
                        <label className="form-label">Customer Name / Company Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          placeholder="Enter customer or company name"
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Customer Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.customerEmail}
                          onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                          placeholder="Enter customer email"
                          required
                        />
                      </div>
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Customer Address</label>
                        <textarea
                          className="form-control"
                          value={formData.customerAddress}
                          onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                          placeholder="Enter customer address"
                          rows="3"
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
                        Add Sale
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
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {currentUser && !isSuperAdmin(currentUser.email) ? "Request Edit" : "Edit Sale"}
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
              {/* All form fields here */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditModal(false)  // ← FIXED: was setShowModal
                    setEditingItem(null)
                    resetForm()
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {currentUser && !isSuperAdmin(currentUser.email) ? "Request Update" : "Update Sale"}
                  {/* ← FIXED: was "Add Sale" */}
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

export default AdminSelling