'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUpDown, RefreshCw, Users, MessageSquare, Calendar, Clock } from 'lucide-react'

// Types for the referral data
interface UserSignup {
  user_id: string
  signup_date: string
  messages: number
  active_days: number
  last_active: string | null
}

interface TeamStats {
  team_member: string
  codes: string[]
  total_signups: number
  total_messages: number
  unique_active_days: number
  last_active: string | null
  users: UserSignup[]
}

type SortKey = 'team_member' | 'total_signups' | 'total_messages' | 'unique_active_days' | 'last_active'
type SortDir = 'asc' | 'desc'

export default function ReferralDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<TeamStats[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('total_signups')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/referrals')
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(data.error || 'Failed to fetch stats')
      }

      setStats(data.stats || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check auth first
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      fetchStats()
    }
    checkAuth()
  }, [router])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedStats = [...stats].sort((a, b) => {
    let aVal: number | string = a[sortKey] ?? ''
    let bVal: number | string = b[sortKey] ?? ''

    if (sortKey === 'last_active') {
      aVal = a.last_active ? new Date(a.last_active).getTime() : 0
      bVal = b.last_active ? new Date(b.last_active).getTime() : 0
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    }

    return sortDir === 'asc' 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal))
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatRelative = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateStr)
  }

  // Calculate totals
  const totals = stats.reduce(
    (acc, s) => ({
      signups: acc.signups + s.total_signups,
      messages: acc.messages + s.total_messages,
      days: acc.days + s.unique_active_days,
    }),
    { signups: 0, messages: 0, days: 0 }
  )

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button
      onClick={() => handleSort(sortKeyName)}
      className="flex items-center gap-1 font-semibold hover:text-orange-600 transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-4 h-4 ${sortKey === sortKeyName ? 'text-orange-600' : 'text-gray-400'}`} />
    </button>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading referral stats...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error Loading Stats</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/chat" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Referral Analytics</h1>
            </div>
            <button
              onClick={fetchStats}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Total Signups</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totals.signups}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Total Messages</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totals.messages.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Total Active Days</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totals.days}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">Team Members</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.length}</p>
          </div>
        </div>

        {/* Stats Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm">
                    <SortHeader label="Team Member" sortKeyName="team_member" />
                  </th>
                  <th className="px-6 py-4 text-left text-sm">Codes</th>
                  <th className="px-6 py-4 text-right text-sm">
                    <SortHeader label="Signups" sortKeyName="total_signups" />
                  </th>
                  <th className="px-6 py-4 text-right text-sm">
                    <SortHeader label="Messages" sortKeyName="total_messages" />
                  </th>
                  <th className="px-6 py-4 text-right text-sm">
                    <SortHeader label="Active Days" sortKeyName="unique_active_days" />
                  </th>
                  <th className="px-6 py-4 text-right text-sm">
                    <SortHeader label="Last Active" sortKeyName="last_active" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No referral data yet. Share your referral codes to get started!
                    </td>
                  </tr>
                ) : (
                  sortedStats.map((stat) => (
                    <>
                      <tr
                        key={stat.team_member}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          expandedRow === stat.team_member ? 'bg-orange-50' : ''
                        }`}
                        onClick={() => setExpandedRow(expandedRow === stat.team_member ? null : stat.team_member)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                              {stat.team_member.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{stat.team_member}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {stat.codes.map((code) => (
                              <span
                                key={code}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold ${stat.total_signups > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                            {stat.total_signups}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold ${stat.total_messages > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {stat.total_messages.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold ${stat.unique_active_days > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {stat.unique_active_days}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                          {formatRelative(stat.last_active)}
                        </td>
                      </tr>

                      {/* Expanded user details */}
                      {expandedRow === stat.team_member && stat.users.length > 0 && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 px-6 py-4">
                            <div className="text-sm text-gray-500 mb-2">Users referred by {stat.team_member}:</div>
                            <div className="grid gap-2">
                              {stat.users.map((user, idx) => (
                                <div
                                  key={user.user_id || idx}
                                  className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-gray-200"
                                >
                                  <div className="flex items-center gap-4">
                                    <span className="text-gray-400 text-xs font-mono">
                                      {user.user_id?.slice(0, 8)}...
                                    </span>
                                    <span className="text-gray-500 text-sm">
                                      Signed up {formatDate(user.signup_date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-6 text-sm">
                                    <span className="text-blue-600">{user.messages} msgs</span>
                                    <span className="text-green-600">{user.active_days} days</span>
                                    <span className="text-gray-400">Last: {formatRelative(user.last_active)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Click on a row to see individual user activity
        </div>
      </main>
    </div>
  )
}
