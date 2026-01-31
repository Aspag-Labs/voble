import { useEffect, useState } from 'react'
import { createKeyPairSignerFromBytes, type KeyPairSigner } from '@solana/kit'
import { useWallets } from '@privy-io/react-auth/solana'

const STORAGE_KEY_PREFIX = 'voble_temp_keypair_'

/** Ed25519 PKCS8 ASN.1 header for importing raw 32-byte seeds */
const ED25519_PKCS8_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
])

export interface TempKeypairResult {
  signer: KeyPairSigner
  keyPair: CryptoKeyPair
}

export function useTempKeypair() {
  const { wallets } = useWallets()
  const wallet = wallets[0]
  const [tempKeypair, setTempKeypair] = useState<TempKeypairResult | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!wallet?.address) {
      setTempKeypair(null)
      return
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${wallet.address}`
    let cancelled = false

    const init = async () => {
      try {
        const stored = window.localStorage.getItem(storageKey)

        if (stored) {
          const keypairBytes = new Uint8Array(JSON.parse(stored) as number[])
          const result = await createKeypairResult(keypairBytes)
          if (!cancelled) {
            setTempKeypair(result)
            console.log('✅ [TempKeypair] Loaded from storage:', result.signer.address)
          }
          return
        }

        // Generate new extractable Ed25519 keypair
        const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])

        // Export as JWK to get seed (d) and public key (x)
        const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
        const seed = base64urlToBytes(jwk.d!)
        const publicKeyBytes = base64urlToBytes(jwk.x!)

        // Combine into 64-byte format: seed (32) + public key (32)
        const keypairBytes = new Uint8Array(64)
        keypairBytes.set(seed, 0)
        keypairBytes.set(publicKeyBytes, 32)

        // Check for race condition before persisting
        if (cancelled) return
        if (window.localStorage.getItem(storageKey)) {
          const existingBytes = new Uint8Array(JSON.parse(window.localStorage.getItem(storageKey)!) as number[])
          const result = await createKeypairResult(existingBytes)
          if (!cancelled) {
            setTempKeypair(result)
            console.log('✅ [TempKeypair] Loaded from storage (race condition):', result.signer.address)
          }
          return
        }

        // Persist and set state
        window.localStorage.setItem(storageKey, JSON.stringify(Array.from(keypairBytes)))
        const signer = await createKeyPairSignerFromBytes(keypairBytes)

        if (!cancelled) {
          setTempKeypair({ signer, keyPair })
          console.log('✅ [TempKeypair] Created new keypair:', signer.address)
        }
      } catch (e) {
        console.error('Error initializing temp keypair:', e)
        if (!cancelled) setTempKeypair(null)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [wallet?.address])

  return tempKeypair
}

/**
 * Create TempKeypairResult from 64-byte keypair bytes
 */
async function createKeypairResult(keypairBytes: Uint8Array): Promise<TempKeypairResult> {
  const signer = await createKeyPairSignerFromBytes(keypairBytes)
  const keyPair = await recreateCryptoKeyPair(keypairBytes.slice(0, 32))
  return { signer, keyPair }
}

/**
 * Recreate CryptoKeyPair from 32-byte Ed25519 seed using PKCS8 import
 */
async function recreateCryptoKeyPair(seed: Uint8Array): Promise<CryptoKeyPair> {
  const pkcs8 = new Uint8Array(ED25519_PKCS8_PREFIX.length + seed.length)
  pkcs8.set(ED25519_PKCS8_PREFIX)
  pkcs8.set(seed, ED25519_PKCS8_PREFIX.length)

  const privateKey = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, true, ['sign'])

  const jwk = await crypto.subtle.exportKey('jwk', privateKey)
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'OKP', crv: 'Ed25519', x: jwk.x! },
    { name: 'Ed25519' },
    true,
    ['verify'],
  )

  return { privateKey, publicKey }
}

/**
 * Decode base64url string to Uint8Array
 */
function base64urlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
