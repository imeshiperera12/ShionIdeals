// Email notification service for edit/delete approvals
export const sendApprovalRequest = async (action, data, requestingAdmin) => {
  // This function would integrate with SendGrid or Firebase Cloud Functions
  // For now, it stores the request in Firestore for super admins to review
  console.log(`[v0] Approval request created for ${action}:`, data)

  const superAdminEmails = process.env.REACT_APP_SUPER_ADMIN_EMAILS?.split(",") || [
    "imeshiperera18@gmail.com",
    "vish96san@gmail.com",
  ]

  return {
    status: "pending",
    action,
    data,
    requestingAdmin,
    superAdminEmails,
    createdAt: new Date().toISOString(),
  }
}

export const getSuperAdminEmails = () => {
  return process.env.REACT_APP_SUPER_ADMIN_EMAILS?.split(",") || ["imeshiperera18@gmail.com", "vish96san@gmail.com"]
}
