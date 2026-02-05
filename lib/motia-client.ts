// Client for calling Motia backend
const MOTIA_URL = process.env.MOTIA_BACKEND_URL || 'http://localhost:3001'

export interface ImportStatus {
  status: 'idle' | 'processing' | 'complete' | 'failed'
  stage?: string
  progress?: number
  error?: string
  totalChunks?: number
  processedChunks?: number
  startedAt?: number
  completedAt?: number
  durationMs?: number
}

/**
 * Start import process via Motia backend
 */
export async function startMotiaImport(
  userId: string, 
  fileUrl: string, 
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${MOTIA_URL}/api/import/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fileUrl, fileName }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Import failed to start' }
    }

    return { success: true }
  } catch (error) {
    console.error('[MotiaClient] Start import error:', error)
    return { success: false, error: 'Failed to connect to backend' }
  }
}

/**
 * Check import status from Motia backend
 */
export async function getMotiaImportStatus(userId: string): Promise<ImportStatus | null> {
  try {
    const response = await fetch(`${MOTIA_URL}/api/import/status/${userId}`)
    
    if (response.status === 404) {
      return null // No import in progress
    }

    if (!response.ok) {
      console.error('[MotiaClient] Status check failed:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[MotiaClient] Status check error:', error)
    return null
  }
}
