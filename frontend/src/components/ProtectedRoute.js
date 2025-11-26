"use client"

import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { isAuthorizedAdmin } from "../config/adminConfig"

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const isAuth = isAuthorizedAdmin(currentUser.email)
        setAuthorized(isAuth)
        setUser(currentUser)
      } else {
        setUser(null)
        setAuthorized(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin@shion" replace />
  }

  if (!authorized) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger text-center" role="alert">
          <h4 className="alert-heading">Access Denied</h4>
          <p>You are not authorized to access the admin panel.</p>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
