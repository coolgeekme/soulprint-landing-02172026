"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Settings, Database, Cloud, Zap } from "lucide-react"
// import { toast } from "@/components/ui/toast"

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'critical'
    timestamp: string
    checks: {
        supabase: {
            configured: boolean
            connected: boolean
            error: string | null
        }
        bedrock: {
            configured: boolean
            connected: boolean
            error: string | null
        }
        ollama: {
            available: boolean
            error: string | null
        }
        environment: {
            isServerless: boolean
            nodeEnv: string
        }
    }
    summary: {
        chatWorking: boolean
        databaseWorking: boolean
        llmAvailable: boolean
        configuredCorrectly: boolean
    }
}

export default function ConfigPage() {
    const [health, setHealth] = useState<HealthStatus | null>(null)
    const [loading, setLoading] = useState(true)

    const checkHealth = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/health')
            const data = await response.json()
            setHealth(data)
            
            if (data.status === 'healthy') {
                console.log("System Healthy - All services operational")
            } else if (data.status === 'degraded') {
                console.warn("System Degraded - Some services may not work correctly")
            } else {
                console.error("Critical Issues - System has serious configuration problems")
            }
        } catch (error) {
            console.error("Health Check Failed", "Could not retrieve system status")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        checkHealth()
        // Auto-refresh every 30 seconds
        const interval = setInterval(checkHealth, 30000)
        return () => clearInterval(interval)
    }, [])

    const getStatusColor = (status: boolean) => 
        status ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100"

    const getStatusIcon = (status: boolean) =>
        status ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />

    const getOverallStatusIcon = () => {
        if (!health) return <AlertTriangle className="h-6 w-6 text-yellow-500" />
        switch (health.status) {
            case 'healthy': return <CheckCircle className="h-6 w-6 text-green-500" />
            case 'degraded': return <AlertTriangle className="h-6 w-6 text-yellow-500" />
            case 'critical': return <XCircle className="h-6 w-6 text-red-500" />
        }
    }

    const getOverallStatusText = () => {
        if (!health) return "Loading..."
        switch (health.status) {
            case 'healthy': return "All Systems Operational"
            case 'degraded': return "Partial Functionality"
            case 'critical': return "Critical Issues Detected"
        }
    }

    if (loading && !health) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">Checking system status...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Settings className="h-6 w-6 text-gray-600" />
                    <h1 className="text-3xl font-bold">System Configuration</h1>
                </div>
                
                {/* Overall Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            {getOverallStatusIcon()}
                            <span>{getOverallStatusText()}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                            Last checked: {health ? new Date(health.timestamp).toLocaleString() : 'Never'}
                        </p>
                        <Button onClick={checkHealth} disabled={loading} className="mb-4">
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Status
                        </Button>
                        
                        {/* Quick Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Database className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                                    <div className="text-2xl font-bold mb-1">
                                        {health?.summary.databaseWorking ? '✅' : '❌'}
                                    </div>
                                    <div className="text-sm text-gray-600">Database</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Cloud className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                                    <div className="text-2xl font-bold mb-1">
                                        {health?.summary.llmAvailable ? '✅' : '❌'}
                                    </div>
                                    <div className="text-sm text-gray-600">AI Service</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Zap className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                                    <div className="text-2xl font-bold mb-1">
                                        {health?.summary.chatWorking ? '✅' : '❌'}
                                    </div>
                                    <div className="text-sm text-gray-600">Chat Function</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Settings className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                    <div className="text-2xl font-bold mb-1">
                                        {health?.summary.configuredCorrectly ? '✅' : '❌'}
                                    </div>
                                    <div className="text-sm text-gray-600">Configuration</div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Status */}
            {health && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Supabase Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-blue-500" />
                                Supabase Database
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span>Configuration</span>
                                <Badge className={getStatusColor(health.checks.supabase.configured)}>
                                    {getStatusIcon(health.checks.supabase.configured)}
                                    <span className="ml-2">
                                        {health.checks.supabase.configured ? 'Configured' : 'Missing'}
                                    </span>
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Connection</span>
                                <Badge className={getStatusColor(health.checks.supabase.connected)}>
                                    {getStatusIcon(health.checks.supabase.connected)}
                                    <span className="ml-2">
                                        {health.checks.supabase.connected ? 'Connected' : 'Failed'}
                                    </span>
                                </Badge>
                            </div>
                            {health.checks.supabase.error && (
                                <div className="p-3 bg-red-100 rounded-lg text-red-700 text-sm">
                                    <strong>Error:</strong> {health.checks.supabase.error}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AWS Bedrock Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Cloud className="h-5 w-5 text-purple-500" />
                                AWS Bedrock AI
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span>Configuration</span>
                                <Badge className={getStatusColor(health.checks.bedrock.configured)}>
                                    {getStatusIcon(health.checks.bedrock.configured)}
                                    <span className="ml-2">
                                        {health.checks.bedrock.configured ? 'Configured' : 'Missing Credentials'}
                                    </span>
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Connection</span>
                                <Badge className={getStatusColor(health.checks.bedrock.connected)}>
                                    {getStatusIcon(health.checks.bedrock.connected)}
                                    <span className="ml-2">
                                        {health.checks.bedrock.connected ? 'Connected' : 'Failed'}
                                    </span>
                                </Badge>
                            </div>
                            {health.checks.bedrock.error && (
                                <div className="p-3 bg-red-100 rounded-lg text-red-700 text-sm">
                                    <strong>Error:</strong> {health.checks.bedrock.error}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Environment Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-gray-500" />
                                Environment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span>Environment</span>
                                <Badge variant="outline">
                                    {health.checks.environment.nodeEnv}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Platform</span>
                                <Badge variant="outline">
                                    {health.checks.environment.isServerless ? 'Serverless (Vercel)' : 'Local Server'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ollama Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-orange-500" />
                                Local Ollama
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span>Availability</span>
                                <Badge className={getStatusColor(health.checks.ollama.available)}>
                                    {getStatusIcon(health.checks.ollama.available)}
                                    <span className="ml-2">
                                        {health.checks.ollama.available ? 'Available' : 'Not Running'}
                                    </span>
                                </Badge>
                            </div>
                            {health.checks.ollama.error && (
                                <div className="p-3 bg-yellow-100 rounded-lg text-yellow-700 text-sm">
                                    <strong>Note:</strong> {health.checks.ollama.error}
                                </div>
                            )}
                            {!health.checks.environment.isServerless && (
                                <div className="p-3 bg-blue-100 rounded-lg text-blue-700 text-sm">
                                    <strong>Info:</strong> Ollama is only available in local development
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Action Items */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    {health?.status === 'critical' && (
                        <div className="space-y-3">
                            <div className="p-4 bg-red-100 rounded-lg">
                                <h4 className="font-semibold text-red-800 mb-2">Critical Issues Found</h4>
                                <ul className="list-disc list-inside space-y-1 text-red-700">
                                    <li>Add AWS credentials to Vercel environment variables</li>
                                    <li>Ensure Bedrock model access is enabled in AWS console</li>
                                    <li>Verify Supabase URL and keys are correct</li>
                                </ul>
                            </div>
                        </div>
                    )}
                    
                    {health?.status === 'degraded' && (
                        <div className="p-4 bg-yellow-100 rounded-lg">
                            <h4 className="font-semibold text-yellow-800 mb-2">Partial Functionality</h4>
                            <p className="text-yellow-700">
                                Some services are working but others may have issues. Check the detailed status above for specific problems.
                            </p>
                        </div>
                    )}
                    
                    {health?.status === 'healthy' && (
                        <div className="p-4 bg-green-100 rounded-lg">
                            <h4 className="font-semibold text-green-800 mb-2">All Systems Operational</h4>
                            <p className="text-green-700">
                                Your SoulPrint deployment is working correctly. All services are configured and functional.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}