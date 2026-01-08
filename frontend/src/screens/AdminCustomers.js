"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import AdminNavbar from "../components/AdminNavbar"
import { canManageCustomers } from "../config/adminConfig"
import "../styles/AdminTable.css"

const AdminCustomers = () => {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [currentUser, setCurrentUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
      if (user && canManageCustomers(user.email)) {
        fetchCustomers()
      } else {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, "customers"))
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      // Sort by creation date, newest first
      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return bTime - aTime
      })
      setCustomers(items)
    } catch (error) {
      console.error("Error fetching customers:", error)
      alert("Error fetching customers. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!customerName.trim()) {
      alert("Please enter a customer name")
      return
    }

    try {
      const creatorName = getCreatorName(currentUser.email)
      
      const customerData = {
        name: customerName.trim(),
        createdBy: currentUser.email,
        creatorName: creatorName,
        createdAt: Timestamp.now(),
      }

      await addDoc(collection(db, "customers"), customerData)
      
      alert("Customer added successfully!")
      setShowModal(false)
      setCustomerName("")
      fetchCustomers()
    } catch (error) {
      console.error("Error adding customer:", error)
      alert("Error adding customer. Please try again.")
    }
  }

  const handleDelete = async (customerId) => {
    if (window.confirm("Are you sure you want to delete this customer? This will NOT delete their transaction data.")) {
      try {
        await deleteDoc(doc(db, "customers", customerId))
        alert("Customer deleted successfully!")
        fetchCustomers()
      } catch (error) {
        console.error("Error deleting customer:", error)
        alert("Error deleting customer. Please try again.")
      }
    }
  }

  const getCreatorName = (email) => {
    switch(email) {
      case "imeshiperera18@gmail.com":
        return "imeshi"
      case "vish96san@gmail.com":
        return "vishwa"
      case "dilaheraz1@gmail.com":
        return "dilshan"
      default:
        return "unknown"
    }
  }

  const handleCustomerClick = (customer) => {
    navigate(`/admin@shion/customer/${customer.id}`, { 
      state: { customerName: customer.name } 
    })
  }

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.creatorName.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  if (!currentUser || !canManageCustomers(currentUser.email)) {
    return (
      <>
        <AdminNavbar />
        <div className="admin-table-container">
          <div className="container-fluid py-4">
            <div className="alert alert-warning">
              <h4>Access Denied</h4>
              <p>You don't have permission to access this page.</p>
            </div>
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
            <h2>Customer Management</h2>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              Add New Customer
            </button>
          </div>

          <div className="search-box mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="alert alert-info">
              <p className="mb-0">No customers found. Add your first customer to get started!</p>
            </div>
          ) : (
            <div className="row">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="col-md-6 col-lg-4 mb-3">
                  <div 
                    className="card h-100" 
                    style={{ 
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-5px)"
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = ""
                    }}
                  >
                    <div 
                      className="card-body"
                      onClick={() => handleCustomerClick(customer)}
                    >
                      <h5 className="card-title mb-2">{customer.name}</h5>
                      <p className="card-text text-muted mb-2" style={{ fontSize: "0.85rem" }}>
                        Created by: {customer.creatorName}
                      </p>
                      <p className="card-text text-muted" style={{ fontSize: "0.75rem" }}>
                        {customer.createdAt ? new Date(customer.createdAt.toMillis()).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div className="card-footer bg-transparent border-top-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(customer.id)
                        }}
                        className="btn btn-sm btn-outline-danger w-100"
                      >
                        Delete Customer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Customer</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowModal(false)
                      setCustomerName("")
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label">Customer Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowModal(false)
                          setCustomerName("")
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Add Customer
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

export default AdminCustomers