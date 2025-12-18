"use client"

import { useState, useEffect } from "react"
import { auth } from "../firebase"
import AdminNavbar from "../components/AdminNavbar"
import { fetchMyRequests } from "../utils/approvalService"
import "../styles/AdminTable.css"

const AdminMyRequests = () => {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
      if (user) {
        fetchRequests(user.email)
      } else {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const fetchRequests = async (email) => {
    try {
      setLoading(true)
      const myRequests = await fetchMyRequests(email)
      setRequests(myRequests)
    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to clear this request from your history?")) return

    try {
      setDeletingId(requestId)
      const { deleteApprovalRequest } = await import("../utils/approvalService")
      const result = await deleteApprovalRequest(requestId)
      
      if (result.success) {
        // Remove the request from the local state
        setRequests(requests.filter(r => r.id !== requestId))
      } else {
        alert("Error clearing request. Please try again.")
      }
    } catch (error) {
      console.error("Error clearing request:", error)
      alert("Error clearing request. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAllCompleted = async () => {
    const completedRequests = requests.filter(r => r.status !== "pending")
    
    if (completedRequests.length === 0) {
      alert("No completed requests to clear.")
      return
    }

    if (!window.confirm(`Are you sure you want to clear all ${completedRequests.length} completed requests?`)) return

    try {
      setLoading(true)
      const { deleteApprovalRequest } = await import("../utils/approvalService")
      
      // Delete all completed requests
      const deletePromises = completedRequests.map(req => deleteApprovalRequest(req.id))
      await Promise.all(deletePromises)
      
      // Update local state to show only pending requests
      setRequests(requests.filter(r => r.status === "pending"))
      alert("All completed requests cleared successfully!")
    } catch (error) {
      console.error("Error clearing completed requests:", error)
      alert("Error clearing requests. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="badge bg-warning">Pending</span>
      case "approved":
        return <span className="badge bg-success">Approved</span>
      case "rejected":
        return <span className="badge bg-danger">Rejected</span>
      default:
        return <span className="badge bg-secondary">Unknown</span>
    }
  }

  const getActionBadge = (action) => {
    return action === "delete" 
      ? <span className="badge bg-danger">Delete</span> 
      : <span className="badge bg-warning">Update</span>
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A"
    // Handle both Firestore Timestamp objects and regular dates
    if (timestamp.toMillis) {
      return new Date(timestamp.toMillis()).toLocaleString()
    }
    // Handle regular Date objects or timestamp strings
    return new Date(timestamp).toLocaleString()
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
            <h2>My Requests</h2>
            <div className="d-flex gap-2">
              <button 
                onClick={handleClearAllCompleted} 
                className="btn btn-outline-danger"
                disabled={requests.filter(r => r.status !== "pending").length === 0}
              >
                Clear Completed
              </button>
              <button onClick={() => currentUser && fetchRequests(currentUser.email)} className="btn btn-primary">
                Refresh
              </button>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="alert alert-info">
              <p className="mb-0">You have no requests yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Date Requested</th>
                    <th>Action</th>
                    <th>Collection</th>
                    <th>Status</th>
                    <th>Reviewed By</th>
                    <th>Reviewed Date</th>
                    <th>Details</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>{formatDate(request.createdAt)}</td>
                      <td>{getActionBadge(request.action)}</td>
                      <td className="text-capitalize">{request.collection}</td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td>{request.reviewedBy || "-"}</td>
                      <td>{request.reviewedAt ? formatDate(request.reviewedAt) : "-"}</td>
                      <td>
                        <small>
                          {request.action === "delete" && (
                            <>
                              <strong>Item:</strong> {request.itemId}
                            </>
                          )}
                          {request.action === "update" && (
                            <>
                              <strong>Changes:</strong> {Object.keys(request.updateData || {}).join(", ")}
                            </>
                          )}
                          {request.status === "rejected" && request.rejectionReason && (
                            <>
                              <br />
                              <strong className="text-danger">Reason:</strong> {request.rejectionReason}
                            </>
                          )}
                        </small>
                      </td>
                      <td>
                        <button
                          onClick={() => handleClearRequest(request.id)}
                          className="btn btn-sm btn-outline-danger"
                          disabled={deletingId === request.id}
                          title="Clear this request from history"
                        >
                          {deletingId === request.id ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                                style={{ marginRight: '4px' }}
                              >
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                              </svg>
                              Clear
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default AdminMyRequests