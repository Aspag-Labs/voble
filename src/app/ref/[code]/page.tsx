'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Referral link capture page
 *
 * When a user visits /ref/A3X7K9P, this page:
 * 1. Stores the referral code in localStorage
 * 2. Redirects to the home page
 *
 * The referral code will be used when the user creates their profile.
 */
export default function ReferralPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  useEffect(() => {
    if (code) {
      // Store referral code in localStorage
      localStorage.setItem('referralCode', code.toUpperCase())
    }

    // Redirect to home page
    router.push('/')
  }, [code, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Applying referral code...</p>
      </div>
    </div>
  )
}
