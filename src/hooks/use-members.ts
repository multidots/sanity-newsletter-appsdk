import { useEffect, useState } from 'react'
import { sanityClient } from '../lib/sanity-client'

export interface Member {
  _id: string
  name?: string
  email?: string
  subscriptionStatus?: 'active' | 'inactive' | 'unsubscribed' | 'bounced'
  subscriptionDate?: string
  createdAt?: string
  source?: 'website' | 'email' | 'social_media' | 'other'
  notes?: string
  labels?: Array<{
    _id: string
    title?: string
  }>
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true)
        const query = `*[_type == "member"] | order(createdAt desc) {
          _id,
          name,
          email,
          subscriptionStatus,
          subscriptionDate,
          createdAt,
          source,
          avatar,
          labels[]-> {
            _id,
            title
          }
        }`
        
        const data = await sanityClient.fetch<Member[]>(query)
        setMembers(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching members:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch members')
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  return { members, loading, error }
}

export function useMemberCount() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCount() {
      try {
        const query = `count(*[_type == "member"])`
        const data = await sanityClient.fetch<number>(query)
        setCount(data)
      } catch (err) {
        console.error('Error fetching member count:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCount()
  }, [])

  return { count, loading }
}

