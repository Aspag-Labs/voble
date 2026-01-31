'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle, Wallet, Shield, ArrowRight, User } from 'lucide-react'
import { useWallets } from '@privy-io/react-auth/solana'
import { useInitializeProfile } from '@/hooks'

interface CreateProfileFormProps {
    onSuccess?: () => void
}

export function CreateProfileForm({ onSuccess }: CreateProfileFormProps) {
    const { wallets } = useWallets()
    const { initializeProfile, isLoading, error } = useInitializeProfile()

    const [username, setUsername] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [referralCode, setReferralCode] = useState<string | null>(null)

    useEffect(() => {
        // Check for stored referral code
        const storedCode = localStorage.getItem('referralCode')
        if (storedCode) {
            setReferralCode(storedCode)
        }
    }, [])

    const wallet = wallets[0]

    const validateUsername = (value: string): boolean => {
        setValidationError(null)

        if (!value || value.trim().length === 0) {
            setValidationError('Username is required')
            return false
        }

        if (value.length > 10) {
            setValidationError('maximum 10 characters')
            return false
        }

        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            setValidationError('Username can only contain letters and numbers')
            return false
        }

        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateUsername(username)) {
            return
        }

        const result = await initializeProfile(username.trim())

        if (result.success) {
            setSuccess(true)
            // Wait for blockchain state to update, then call onSuccess
            setTimeout(() => {
                onSuccess?.()
            }, 2500)
        } else {
            console.error('❌ [CreateProfile] Profile creation failed:', result.error)
        }
    }

    // SUCCESS STATE
    if (success) {
        return (
            <Card className="max-w-md w-full text-center py-12 border-none shadow-lg">
                <CardContent>
                    <div className="mx-auto h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">You're In.</h1>
                    <p className="text-lg text-zinc-500 dark:text-zinc-400">Profile created successfully.</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 font-mono mt-8">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading profile...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // No wallet available (shouldn't happen if parent checks, but safety)
    if (!wallet) {
        return null
    }

    // MAIN FORM
    return (
        <Card className="max-w-md w-full border-none shadow-lg">
            <CardContent className="pt-8 pb-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <User className="h-16 w-16 mx-auto mb-4 text-slate-200 dark:text-zinc-800" />
                    <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-50">Create Your Profile</h2>
                    <p className="text-slate-500">Choose a username for the leaderboard.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username Field */}
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value)
                                    setValidationError(null)
                                }}
                                maxLength={32}
                                disabled={isLoading}
                                className={`h-11 font-medium ${validationError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            <span className="absolute right-3 top-3 text-xs text-zinc-400 font-mono">{username.length}/10</span>
                        </div>

                        {validationError ? (
                            <p className="text-sm text-red-500 flex items-center gap-1 font-medium">
                                <AlertCircle className="h-4 w-4" />
                                {validationError}
                            </p>
                        ) : (
                            <p className="text-xs text-zinc-500 flex items-center gap-1">Letters and numbers only.</p>
                        )}
                    </div>

                    {/* Wallet Info Card */}
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                Wallet
                            </span>
                            <span className="font-mono text-zinc-900 dark:text-white truncate max-w-[120px]">
                                {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Fee (refundable)
                            </span>
                            <span className="font-mono text-zinc-900 dark:text-white">~0.002 SOL</span>
                        </div>
                    </div>

                    {/* Referral Coupon */}
                    {referralCode && (
                        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">
                                    Referral Applied
                                </p>
                                <p className="font-mono font-bold text-emerald-900 dark:text-emerald-200">{referralCode}</p>
                            </div>
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Submit Button */}
                    <Button type="submit" size="lg" disabled={isLoading || !username} className="w-full font-bold">
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                Create Profile <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
