import { useState } from "react"

export const useFormValidation = () => {
  const [titleError, setTitleError] = useState("")

  const validateTitle = (title: string): boolean => {
    const trimmedTitle = title.trim()
    
    if (trimmedTitle.length === 0) {
      setTitleError("Title is required")
      return false
    }
    
    if (trimmedTitle.length < 3) {
      setTitleError("Title must be at least 3 characters long")
      return false
    }
    
    if (trimmedTitle.length > 120) {
      setTitleError("Title must be no more than 120 characters long")
      return false
    }
    
    setTitleError("")
    return true
  }

  return { titleError, validateTitle }
}