'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAllTeamMembers, getTeamMemberStats } from '@/app/actions/referral'
import { Loader2, Users, Link2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface TeamMember {
    id: string
    name: string
    referralCode: string
    totalReferrals: number
}

interface ReferralDetail {
    email: string
    createdAt: string
}

export default function ReferralDashboard() {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)
    const [expandedMember, setExpandedMember] = useState<string | null>(null)
    const [memberDetails, setMemberDetails] = useState<Record<string, ReferralDetail[]>>({})
    const [isDev, setIsDev] = useState(false)

    useEffect(() => {
        // Check if we're in development mode
        if (process.env.NODE_ENV !== 'development') {
            setError('This page is only available in development mode')
            setLoading(false)
            return
        }
        setIsDev(true)

        const fetchData = async () => {
            try {
                const result = await getAllTeamMembers()
                if (result.error) {
                    setError(result.error)
                } else {
                    setMembers(result.members)
                }
            } catch (err) {
                setError('Failed to load team members')
            }
            setLoading(false)
        }

        fetchData()
    }, [])

    const copyToClipboard = async (code: string) => {
        const url = `https://soulprintengine.ai/signup?ref=${code}`
        await navigator.clipboard.writeText(url)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2000)
    }

    const toggleMemberDetails = async (memberId: string) => {
        if (expandedMember === memberId) {
            setExpandedMember(null)
            return
        }

        setExpandedMember(memberId)

        if (!memberDetails[memberId]) {
            const stats = await getTeamMemberStats(memberId)
            if (stats.recentReferrals) {
                setMemberDetails(prev => ({
                    ...prev,
                    [memberId]: stats.recentReferrals
                }))
            }
        }
    }

    if (!isDev && !loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
                    <p className="text-gray-400">This page is only available in development mode.</p>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#EA580C]" />
            </div>
        )
    }

    const totalReferrals = members.reduce((sum, m) => sum + m.totalReferrals, 0)

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-[#EA580C]/20 flex items-center justify-center">
                            <Users className="h-5 w-5 text-[#EA580C]" />
                        </div>
                        <h1 className="text-3xl font-bold">Referral Dashboard</h1>
                    </div>
                    <p className="text-gray-400">Track team member referrals and generate shareable links</p>
                    <div className="mt-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg inline-block">
                        <span className="text-yellow-500 text-sm font-medium">🔒 Localhost Only</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
                        <p className="text-gray-400 text-sm mb-1">Total Team Members</p>
                        <p className="text-3xl font-bold text-white">{members.length}</p>
                    </div>
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
                        <p className="text-gray-400 text-sm mb-1">Total Referrals</p>
                        <p className="text-3xl font-bold text-[#EA580C]">{totalReferrals}</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                        {error}
                    </div>
                )}

                {/* Team Members Table */}
                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="font-semibold text-lg">Team Members</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                        {members.map((member) => (
                            <div key={member.id}>
                                <div
                                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={() => toggleMemberDetails(member.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EA580C] to-[#B91C1C] flex items-center justify-center font-bold">
                                                {member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <Link2 className="h-3 w-3" />
                                                    <code className="bg-white/5 px-2 py-0.5 rounded">
                                                        {member.referralCode}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-[#EA580C]">{member.totalReferrals}</p>
                                                <p className="text-xs text-gray-500">referrals</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    copyToClipboard(member.referralCode)
                                                }}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Copy referral link"
                                            >
                                                {copiedCode === member.referralCode ? (
                                                    <Check className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <Copy className="h-5 w-5 text-gray-400" />
                                                )}
                                            </button>
                                            {expandedMember === member.id ? (
                                                <ChevronUp className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedMember === member.id && (
                                    <div className="px-4 pb-4 bg-white/[0.02]">
                                        <div className="ml-14 p-4 bg-[#0a0a0a] rounded-lg">
                                            <p className="text-sm text-gray-400 mb-2">Referral Link:</p>
                                            <code className="block p-3 bg-white/5 rounded-lg text-sm text-[#EA580C] break-all">
                                                https://soulprintengine.ai/signup?ref={member.referralCode}
                                            </code>

                                            {memberDetails[member.id]?.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-sm text-gray-400 mb-2">Recent Sign-ups:</p>
                                                    <div className="space-y-2">
                                                        {memberDetails[member.id].map((ref, i) => (
                                                            <div key={i} className="flex items-center justify-between text-sm p-2 bg-white/5 rounded">
                                                                <span className="text-white">{ref.email}</span>
                                                                <span className="text-gray-500">
                                                                    {new Date(ref.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {memberDetails[member.id]?.length === 0 && (
                                                <p className="mt-4 text-sm text-gray-500 italic">No referrals yet</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
