import { useState } from "react"

export const useDateValidation = (pastDatesEnabled: boolean | null) => {
  const [dateError, setDateError] = useState("")

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const validateDate = (dateString: string): boolean => {
    if (!dateString) {
      setDateError("")
      return true
    }
    
    const selectedDate = new Date(dateString + 'T00:00:00Z')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (isToday(selectedDate)) {
      setDateError("")
      return true
    }
    
    if (selectedDate < today && pastDatesEnabled === false) {
      setDateError("Past dates are not allowed")
      return false
    }
    
    setDateError("")
    return true
  }

  return { dateError, validateDate }
}