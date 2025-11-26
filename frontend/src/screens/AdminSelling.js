"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "../firebase"
import AdminNavbar from "../components/AdminNavbar"
import { generatePDF, generateExcel } from "../utils/reportGenerator"
import { sendApprovalRequest } from "../utils/emailService"
import { fetchBuyingDetails, getBuyingItemDetails } from "../utils/buyingService"
import "../styles/AdminTable.css"

const AdminSelling = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [buyingItems, setBuyingItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("date")
  const [sortDirection, setSortDirection] = useState("desc")
  const [editingId, setEditingId] = useState(null)
  const [approvalRequests, setApprovalRequests] = useState([])

  const [formData, setFormData] = useState({
    assist: "Vishwa",
    scope: "Domestic",
    objectType: "Vehicle",
    identifier: "",
    buyingPrice: "",
    sellingPrice: "",
    profit: 0,
    customerName: "",
    address: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    buyingSource: "", // Added reference to buying details
  })

  useEffect(() => {
    fetchData()
    loadBuyingItems()
  }, [])

  const loadBuyingItems = async () => {
    const items = await fetchBuyingDetails()
    setBuyingItems(items)
  }

  useEffect(() => {
    // Calculate profit when prices change
    const buying = Number.parseFloat(formData.buyingPrice) || 0
    const selling = Number.parseFloat(formData.sellingPrice) || 0
    const profit = selling - buying
    setFormData((prev) => ({ ...prev, profit }))
  }, [formData.buyingPrice, formData.sellingPrice])

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

  const handleBuyingItemSelect = (buyingId) => {
    if (!buyingId) return

    const details = getBuyingItemDetails(buyingId, buyingItems)
    if (details) {
      console.log("[v0] Auto-populating form with buying details:", details)
      setFormData((prev) => ({
        ...prev,
        objectType: details.objectType,
        identifier: details.identifier,
        buyingPrice: details.buyingPrice.toString(),
        buyingSource: buyingId,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const dataToSave = {
        ...formData,
        buyingPrice: Number.parseFloat(formData.buyingPrice),
        sellingPrice: Number.parseFloat(formData.sellingPrice),
        profit: Number.parseFloat(formData.profit),
        createdAt: Timestamp.now(),
      }

      if (editingId) {
        const approvalRequest = {
          ...sendApprovalRequest("edit", dataToSave, "current-admin"),
          entryId: editingId,
          collection: "selling",
        }

        await addDoc(collection(db, "approvalRequests"), approvalRequest)
        alert("Edit request sent to super admins for approval!")
        console.log("[v0] Edit approval request created")
      } else {
        await addDoc(collection(db, "selling"), dataToSave)
        alert("Selling entry added successfully!")
      }

      setShowModal(false)
      setEditingId(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error adding selling entry:", error)
      alert("Error adding entry. Please try again.")
    }
  }

  const handleDeleteRequest = async (id) => {
    if (window.confirm("This will send a delete request to super admins for approval.")) {
      try {
        const approvalRequest = {
          ...sendApprovalRequest("delete", { id }, "current-admin"),
          entryId: id,
          collection: "selling",
        }

        await addDoc(collection(db, "approvalRequests"), approvalRequest)
        alert("Delete request sent to super admins for approval!")
        console.log("[v0] Delete approval request created for entry:", id)
      } catch (error) {
        console.error("Error creating delete request:", error)
        alert("Error creating delete request. Please try again.")
      }
    }
  }

  const handleEdit = (item) => {
    setFormData({
      assist: item.assist,
      scope: item.scope,
      objectType: item.objectType,
      identifier: item.identifier,
      buyingPrice: item.buyingPrice.toString(),
      sellingPrice: item.sellingPrice.toString(),
      profit: item.profit,
      customerName: item.customerName,
      address: item.address,
      email: item.email,
      date: item.date,
      buyingSource: item.buyingSource || "",
    })
    setEditingId(item.id)
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      assist: "Vishwa",
      scope: "Domestic",
      objectType: "Vehicle",
      identifier: "",
      buyingPrice: "",
      sellingPrice: "",
      profit: 0,
      customerName: "",
      address: "",
      email: "",
      date: new Date().toISOString().split("T")[0],
      buyingSource: "",
    })
  }

  const getIdentifierLabel = () => {
    switch (formData.objectType) {
      case "Vehicle":
        return "Enter chassis number"
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

  const handleGenerateReport = () => {
    const headers = [
      "Date",
      "Assist",
      "Scope",
      "Type",
      "Identifier",
      "Buying Price",
      "Selling Price",
      "Profit",
      "Customer",
      "Email",
    ]
    const reportData = filteredAndSortedData.map((item) => [
      item.date,
      item.assist,
      item.scope,
      item.objectType,
      item.identifier,
      `¥${item.buyingPrice.toLocaleString()}`,
      `¥${item.sellingPrice.toLocaleString()}`,
      `¥${item.profit.toLocaleString()}`,
      item.customerName,
      item.email,
    ])

    const totalProfit = filteredAndSortedData.reduce((sum, item) => sum + item.profit, 0)
    const summary = {
      "Total Entries": filteredAndSortedData.length,
      "Total Profit": `¥${totalProfit.toLocaleString()}`,
    }

    generatePDF("Selling Report", headers, reportData, summary)
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
              <button
                onClick={() => {
                  setEditingId(null)
                  resetForm()
                  setShowModal(true)
                }}
                className="btn btn-primary"
              >
                Add New Sell
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
                  <th>Scope</th>
                  <th>Type</th>
                  <th>Identifier</th>
                  <th onClick={() => handleSort("buyingPrice")} style={{ cursor: "pointer" }}>
                    Buying Price {sortField === "buyingPrice" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("sellingPrice")} style={{ cursor: "pointer" }}>
                    Selling Price {sortField === "sellingPrice" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("profit")} style={{ cursor: "pointer" }}>
                    Profit {sortField === "profit" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Customer</th>
                  <th>Email</th>
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
                      <td>{item.assist}</td>
                      <td>{item.scope}</td>
                      <td>{item.objectType}</td>
                      <td>{item.identifier}</td>
                      <td>¥{item.buyingPrice.toLocaleString()}</td>
                      <td>¥{item.sellingPrice.toLocaleString()}</td>
                      <td className={item.profit >= 0 ? "text-success" : "text-danger"}>
                        ¥{item.profit.toLocaleString()}
                      </td>
                      <td>{item.customerName}</td>
                      <td>{item.email}</td>
                      <td>
                        <button onClick={() => handleEdit(item)} className="btn btn-sm btn-warning me-2">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteRequest(item.id)} className="btn btn-sm btn-danger">
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

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingId ? "Edit Sell" : "Add New Sell"}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowModal(false)
                      setEditingId(null)
                      resetForm()
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Select from Buying Details (Optional)</label>
                        <select
                          className="form-select"
                          value={formData.buyingSource}
                          onChange={(e) => handleBuyingItemSelect(e.target.value)}
                        >
                          <option value="">-- Select to auto-populate --</option>
                          {buyingItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.objectType} - {item.identifier} ({item.domesticSeller})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

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
                        <label className="form-label">Scope</label>
                        <select
                          className="form-select"
                          value={formData.scope}
                          onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                          required
                        >
                          <option value="Domestic">Domestic</option>
                          <option value="International">International</option>
                        </select>
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
                        <label className="form-label">Buying Price (¥)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.buyingPrice}
                          onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                          required
                          min="0"
                          step="0.01"
                        />
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
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Profit (Auto-calculated)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={`¥${formData.profit.toLocaleString()}`}
                          disabled
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Customer/Company Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          required
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
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowModal(false)
                          setEditingId(null)
                          resetForm()
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {editingId ? "Request Edit" : "Add Sell"}
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
