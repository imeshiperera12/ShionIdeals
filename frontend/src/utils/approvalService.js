import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where, Timestamp } from "firebase/firestore"
import { db } from "../firebase"

// Create an approval request
export const createApprovalRequest = async (requestData) => {
  try {
    const approvalRequest = {
      ...requestData,
      status: "pending",
      createdAt: Timestamp.now(),
      reviewedAt: null,
      reviewedBy: null,
    }

    const docRef = await addDoc(collection(db, "approvalRequests"), approvalRequest)
    console.log("Approval request created:", docRef.id)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error creating approval request:", error)
    return { success: false, error: error.message }
  }
}

// Fetch all pending approval requests (for super admin)
export const fetchPendingApprovals = async () => {
  try {
    const q = query(collection(db, "approvalRequests"), where("status", "==", "pending"))
    const querySnapshot = await getDocs(q)
    const requests = []
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() })
    })
    return requests
  } catch (error) {
    console.error("Error fetching pending approvals:", error)
    return []
  }
}

// Fetch approval requests for a specific admin
export const fetchMyRequests = async (adminEmail) => {
  try {
    const q = query(collection(db, "approvalRequests"), where("requestedBy", "==", adminEmail))
    const querySnapshot = await getDocs(q)
    const requests = []
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() })
    })
    // Sort by date, newest first
    return requests.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
  } catch (error) {
    console.error("Error fetching my requests:", error)
    return []
  }
}

// Approve a request
export const approveRequest = async (requestId, reviewerEmail) => {
  try {
    const requestRef = doc(db, "approvalRequests", requestId)
    await updateDoc(requestRef, {
      status: "approved",
      reviewedAt: Timestamp.now(),
      reviewedBy: reviewerEmail,
    })
    return { success: true }
  } catch (error) {
    console.error("Error approving request:", error)
    return { success: false, error: error.message }
  }
}

// Reject a request
export const rejectRequest = async (requestId, reviewerEmail, reason = "") => {
  try {
    const requestRef = doc(db, "approvalRequests", requestId)
    await updateDoc(requestRef, {
      status: "rejected",
      reviewedAt: Timestamp.now(),
      reviewedBy: reviewerEmail,
      rejectionReason: reason,
    })
    return { success: true }
  } catch (error) {
    console.error("Error rejecting request:", error)
    return { success: false, error: error.message }
  }
}

// Execute approved delete operation
export const executeDelete = async (collectionName, itemId) => {
  try {
    await deleteDoc(doc(db, collectionName, itemId))
    return { success: true }
  } catch (error) {
    console.error("Error executing delete:", error)
    return { success: false, error: error.message }
  }
}

// Execute approved update operation
export const executeUpdate = async (collectionName, itemId, updateData) => {
  try {
    const docRef = doc(db, collectionName, itemId)
    await updateDoc(docRef, updateData)
    return { success: true }
  } catch (error) {
    console.error("Error executing update:", error)
    return { success: false, error: error.message }
  }
}

// Delete an approval request after it's been processed
export const deleteApprovalRequest = async (requestId) => {
  try {
    await deleteDoc(doc(db, "approvalRequests", requestId))
    return { success: true }
  } catch (error) {
    console.error("Error deleting approval request:", error)
    return { success: false, error: error.message }
  }
}