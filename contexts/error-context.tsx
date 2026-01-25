/**
 * Global Error Context
 * 
 * Provides centralized error handling with automatic toast notifications
 * Includes retry mechanisms and user-friendly error messages
 */

"use client"

import * as React from "react"
import { toast } from "@/components/ui/toast"

export type ErrorType = 
  | "network" 
  | "validation" 
  | "permission" 
  | "server" 
  | "timeout"
  | "unknown"

export interface AppError {
  id: string
  type: ErrorType
  title: string
  description: string
  originalError?: Error | unknown
  retryAction?: () => Promise<void> | (() => void)
  timestamp: Date
}

interface ErrorContextValue {
  errors: AppError[]
  addError: (error: AppError) => void
  clearError: (id: string) => void
  clearAllErrors: () => void
  retryError: (id: string) => void
  isLoading: boolean
}

const ErrorContext = React.createContext<ErrorContextValue | undefined>(undefined)

export function useError() {
  const context = React.useContext(ErrorContext)
  if (context === undefined) {
    throw new Error("useError must be used within an ErrorProvider")
  }
  return context
}

const errorMessages = {
  network: {
    title: "Connection Error",
    description: "Please check your internet connection and try again."
  },
  validation: {
    title: "Validation Error", 
    description: "Please check your input and try again."
  },
  permission: {
    title: "Permission Denied",
    description: "You don't have permission to perform this action."
  },
  server: {
    title: "Server Error",
    description: "Something went wrong on our end. Please try again."
  },
  timeout: {
    title: "Request Timeout",
    description: "The request took too long. Please try again."
  },
  unknown: {
    title: "An Error Occurred",
    description: "Something went wrong. Please try again."
  }
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = React.useState<AppError[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const addError = React.useCallback((error: AppError) => {
    setErrors(prev => [...prev.filter(e => e.id !== error.id), error])
    
    // Show toast notification
    switch (error.type) {
      case "network":
      case "server":
        toast.error(error.title, error.description)
        break
      case "validation":
        toast.warning(error.title, error.description)
        break
      case "permission":
        toast.error(error.title, error.description)
        break
      case "timeout":
        toast.warning(error.title, error.description)
        break
      default:
        toast.info(error.title, error.description)
    }
  }, [])

  const clearError = React.useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id))
  }, [])

  const clearAllErrors = React.useCallback(() => {
    setErrors([])
  }, [])

  const retryError = React.useCallback(async (id: string) => {
    const error = errors.find(e => e.id === id)
    if (!error?.retryAction) return

    setIsLoading(true)
    clearError(id)
    
    try {
      await error.retryAction()
      toast.success("Retry Successful", "The operation completed successfully.")
    } catch (err) {
      const newError: AppError = {
        id: Math.random().toString(36).substring(2, 9),
        type: "server",
        title: "Retry Failed",
        description: "The retry attempt failed. Please try again later.",
        originalError: err,
        timestamp: new Date()
      }
      addError(newError)
    } finally {
      setIsLoading(false)
    }
  }, [errors, addError, clearError])

  // Helper function to create standardized errors
  const createError = React.useCallback((
    type: ErrorType,
    originalError?: Error | unknown,
    customMessage?: string
  ): AppError => {
    const messages = errorMessages[type]
    let title = messages.title
    let description = messages.description

    // Try to extract meaningful message from original error
    if (originalError) {
      if (typeof originalError === 'string') {
        description = originalError
      } else if (originalError instanceof Error) {
        description = originalError.message || description
      }
    }

    if (customMessage) {
      description = customMessage
    }

    return {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      description,
      originalError,
      timestamp: new Date()
    }
  }, [])

  const value: ErrorContextValue = {
    errors,
    addError,
    clearError,
    clearAllErrors,
    retryError,
    isLoading
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
      
      {/* Error Sidebar (visible when there are errors) */}
      {errors.length > 0 && (
        <div className="fixed bottom-4 left-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">Error Center</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {errors.length} error{errors.length !== 1 ? 's' : ''} occurred
              </div>
            </div>
            <button
              onClick={clearAllErrors}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {errors.map(error => (
              <div key={error.id} className="border-t border-gray-200 dark:border-gray-600 pt-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {error.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {error.description}
                    </div>
                  </div>
                  {error.retryAction && (
                    <button
                      onClick={() => retryError(error.id)}
                      disabled={isLoading}
                      className="text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-2 py-1 rounded disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  )
}

// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Add to error context if available
    const errorContext = (window as any).__ERROR_CONTEXT
    if (errorContext?.addError) {
      errorContext.addError({
        id: Math.random().toString(36).substring(2, 9),
        type: "server",
        title: "Component Error",
        description: error.message || "An unexpected error occurred.",
        originalError: error,
        timestamp: new Date()
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-400 mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              An unexpected error occurred. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Make error context globally available
if (typeof window !== 'undefined') {
  (window as any).__ERROR_CONTEXT = null
}