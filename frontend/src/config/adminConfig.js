// Admin credentials configuration
export const ADMIN_CREDENTIALS = [
  {
    email: "imeshiperera18@gmail.com",
    password: "imeshishion321",
  },
  {
    email: "vish96san@gmail.com",
    password: "vishwashion321",
  },
  {
    email: "dilshan@gmail.com",
    password: "dilshanshion321",
  },
]

// Check if an email is an authorized admin
export const isAuthorizedAdmin = (email) => {
  return ADMIN_CREDENTIALS.some((admin) => admin.email === email)
}

// Super admin emails for approvals
export const SUPER_ADMIN_EMAILS = ["imeshiperera18@gmail.com", "vish96san@gmail.com"]

// Check if an email is a super admin
export const isSuperAdmin = (email) => {
  return SUPER_ADMIN_EMAILS.includes(email)
}
