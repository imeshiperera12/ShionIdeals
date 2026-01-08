// Admin credentials configuration
export const ADMIN_CREDENTIALS = [
  {
    email: "imeshiperera18@gmail.com",
    password: "imeshishion321",
  },
  {
    email: "vish96san@gmail.com",
    password: "vishwa1013",
  },
  {
    email: "samanslk10@gmail.com",
    password: "samanshion321",
  },
  {
    email: "dilaheraz1@gmail.com",
    password: "dilshanshion321",
  },
]

// Check if an email is an authorized admin
export const isAuthorizedAdmin = (email) => {
  return ADMIN_CREDENTIALS.some((admin) => admin.email === email)
}

// Super admin emails (FULL privileges)
export const SUPER_ADMIN_EMAILS = [
  "imeshiperera18@gmail.com",
  "vish96san@gmail.com",
]

// Check if an email is a super admin
export const isSuperAdmin = (email) => {
  return SUPER_ADMIN_EMAILS.includes(email)
}

// Admins who are allowed to manage customers
// (Super admins + Dilshan)
export const CUSTOMER_MANAGEMENT_EMAILS = [
  ...SUPER_ADMIN_EMAILS,
  "dilaheraz1@gmail.com",
]

// Check if admin can manage customers
export const canManageCustomers = (email) => {
  return CUSTOMER_MANAGEMENT_EMAILS.includes(email)
}
