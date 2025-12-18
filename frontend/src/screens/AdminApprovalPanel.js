"use client"

import { useState, useEffect } from "react"
import { auth } from "../firebase"
import AdminNavbar from "../components/AdminNavbar"
import {
  fetchPendingApprovals,
  approveRequest,
  rejectRequest,
  executeDelete,
  executeUpdate,
  deleteApprovalRequest,
} from "../utils/approvalService"
import { isSuperAdmin } from "../config/adminConfig"
import "../styles/AdminTable.css"

const AdminApprovalPanel = () => {
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
      if (user && isSuperAdmin(user.email)) {
        fetchApprovals()
      } else {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const fetchApprovals = async () => {
    try {
      setLoading(true)
      const requests = await fetchPendingApprovals()
      setApprovals(requests)
    } catch (error) {
      console.error("Error fetching approvals:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request) => {
    if (!window.confirm("Are you sure you want to approve this request?")) return

    try {
      // First approve the request
      const approveResult = await approveRequest(request.id, currentUser.email)
      if (!approveResult.success) {
        alert("Error approving request")
        return
      }

      // Then execute the actual operation
      if (request.action === "delete") {
        const deleteResult = await executeDelete(request.collection, request.itemId)
        if (!deleteResult.success) {
          alert("Error executing delete operation")
          return
        }
      } else if (request.action === "update") {
        const updateResult = await executeUpdate(request.collection, request.itemId, request.updateData)
        if (!updateResult.success) {
          alert("Error executing update operation")
          return
        }
      }

      alert("Request approved and executed successfully!")
      fetchApprovals()
    } catch (error) {
      console.error("Error in approval process:", error)
      alert("Error processing approval")
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    try {
      const result = await rejectRequest(selectedRequest.id, currentUser.email, rejectionReason)
      if (result.success) {
        alert("Request rejected successfully!")
        setShowRejectModal(false)
        setSelectedRequest(null)
        setRejectionReason("")
        fetchApprovals()
      } else {
        alert("Error rejecting request")
      }
    } catch (error) {
      console.error("Error rejecting request:", error)
      alert("Error processing rejection")
    }
  }

  const openRejectModal = (request) => {
    setSelectedRequest(request)
    setShowRejectModal(true)
  }

  const getActionBadgeClass = (action) => {
    return action === "delete" ? "badge bg-danger" : "badge bg-warning"
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

  if (!currentUser || !isSuperAdmin(currentUser.email)) {
    return (
      <>
        <AdminNavbar />
        <div className="admin-table-container">
          <div className="container-fluid py-4">
            <div className="alert alert-warning">
              <h4>Access Denied</h4>
              <p>Only super administrators can access this panel.</p>
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
            <h2>Approval Requests</h2>
            <button onClick={fetchApprovals} className="btn btn-primary">
              Refresh
            </button>
          </div>

          {approvals.length === 0 ? (
            <div className="alert alert-info">
              <p className="mb-0">No pending approval requests.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Requested By</th>
                    <th>Action</th>
                    <th>Collection</th>
                    <th>Details</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((request) => (
                    <tr key={request.id}>
                      <td>{formatDate(request.createdAt)}</td>
                      <td>{request.requestedBy}</td>
                      <td>
                        <span className={getActionBadgeClass(request.action)}>
                          {request.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-capitalize">{request.collection}</td>
                      <td>
                        <small>
                          {request.action === "delete" && (
                            <>
                              <strong>Item ID:</strong> {request.itemId}
                              <br />
                              {request.itemDetails && (
                                <>
                                  <strong>Details:</strong> {JSON.stringify(request.itemDetails).substring(0, 100)}...
                                </>
                              )}
                            </>
                          )}
                          {request.action === "update" && (
                            <>
                              <strong>Item ID:</strong> {request.itemId}
                              <br />
                              <strong>Changes:</strong> {Object.keys(request.updateData || {}).join(", ")}
                            </>
                          )}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            onClick={() => handleApprove(request)}
                            className="btn btn-sm btn-success"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(request)}
                            className="btn btn-sm btn-danger"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Reject Request</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowRejectModal(false)
                      setSelectedRequest(null)
                      setRejectionReason("")
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Rejection Reason (Optional)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide a reason for rejection..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowRejectModal(false)
                      setSelectedRequest(null)
                      setRejectionReason("")
                    }}
                  >
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleReject}>
                    Reject Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminApprovalPanel