"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import { db } from "../firebase"
import AdminNavbar from "../components/AdminNavbar"
import { generatePDF, generateExcel } from "../utils/reportGenerator"
import "../styles/AdminTable.css"

const AdminBuying = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("date")
  const [sortDirection, setSortDirection] = useState("desc")

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
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, "buying"))
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
        ...formData,
        price: Number.parseFloat(formData.price),
        createdAt: Timestamp.now(),
      }

      await addDoc(collection(db, "buying"), dataToSave)

      alert("Buying entry added successfully!")
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error adding buying entry:", error)
      alert("Error adding entry. Please try again.")
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await deleteDoc(doc(db, "buying", id))
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
    const headers = ["Date", "Assist", "Type", "Identifier", "Market", "Web Option", "Domestic Seller", "Price"]
    const reportData = filteredAndSortedData.map((item) => [
      item.date,
      item.assist,
      item.objectType,
      item.identifier,
      item.market,
      item.webSubOption || "-",
      item.domesticSeller,
      `¥${item.price.toLocaleString()}`,
    ])

    const totalPrice = filteredAndSortedData.reduce((sum, item) => sum + item.price, 0)
    const summary = {
      "Total Entries": filteredAndSortedData.length,
      "Total Buying Amount": `¥${totalPrice.toLocaleString()}`,
    }

    generatePDF("Buying Report", headers, reportData, summary)
    generateExcel("Buying Report", headers, reportData, summary)
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
            <h2>Buying Management</h2>
            <div className="header-actions">
              <button onClick={handleGenerateReport} className="btn btn-success me-2">
                Generate Report
              </button>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                Add New Purchase
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
                  <th>Type</th>
                  <th>Identifier</th>
                  <th>Market</th>
                  <th>Web Option</th>
                  <th>Domestic Seller</th>
                  <th onClick={() => handleSort("price")} style={{ cursor: "pointer" }}>
                    Price {sortField === "price" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.assist}</td>
                      <td>{item.objectType}</td>
                      <td>{item.identifier}</td>
                      <td>{item.market}</td>
                      <td>{item.webSubOption || "-"}</td>
                      <td>{item.domesticSeller}</td>
                      <td>¥{item.price.toLocaleString()}</td>
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

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Purchase</h5>
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
                          onChange={(e) => setFormData({ ...formData, market: e.target.value, webSubOption: "" })}
                          required
                        >
                          <option value="Auction">Auction</option>
                          <option value="Web">Web</option>
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
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Domestic Seller</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.domesticSeller}
                          onChange={(e) => setFormData({ ...formData, domesticSeller: e.target.value })}
                          required
                        />
                      </div>
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
    </>
  )
}

export default AdminBuying
