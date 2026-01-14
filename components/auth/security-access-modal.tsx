"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface SecurityAccessModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function SecurityAccessModal({ isOpen, onOpenChange }: SecurityAccessModalProps) {
    const [code, setCode] = useState("")
    const [error, setError] = useState(false)
    const router = useRouter()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (code === "7423") {
            onOpenChange(false)
            router.push("/login")
        } else {
            setError(true)
            setCode("")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Security Access</DialogTitle>
                    <DialogDescription>
                        Enter the security code to proceed.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="password"
                        placeholder="Security Code"
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value)
                            setError(false)
                        }}
                        className="w-full h-10 px-4 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-sans"
                        autoFocus
                    />
                    {error && <p className="text-sm text-red-500">Incorrect code. Please try again.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">Unlock</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
