import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"

// Fetch all buying details for dropdown population
export const fetchBuyingDetails = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "buying"))
    const items = []
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() })
    })
    console.log("[v0] Fetched buying details:", items)
    return items
  } catch (error) {
    console.error("Error fetching buying details:", error)
    return []
  }
}

// Get details for a specific buying item
export const getBuyingItemDetails = (buyingId, buyingItems) => {
  const item = buyingItems.find((b) => b.id === buyingId)
  if (item) {
    console.log("[v0] Retrieved buying item details:", item)
    return {
      objectType: item.objectType,
      identifier: item.identifier,
      buyingPrice: item.price,
      supplier: item.domesticSeller,
    }
  }
  return null
}
