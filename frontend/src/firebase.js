// Import required Firebase functions
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCI6kMj9Ov5e440BzikqTR5jIViZlLfU0",
  authDomain: "shionideals-74748.firebaseapp.com",
  projectId: "shionideals-74748",
  storageBucket: "shionideals-74748.firebasestorage.app",
  messagingSenderId: "443311999570",
  appId: "1:443311999570:web:7693c5a75430b668daad8b",
  measurementId: "G-6GN6G35DR4",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Export Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
