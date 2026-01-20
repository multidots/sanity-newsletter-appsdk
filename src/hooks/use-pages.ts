import { useEffect, useState } from 'react'
import { sanityClient } from '../lib/sanity-client'

export interface Page {
  _id: string
  _originalId?: string
  title?: string
  slug?: {
    current?: string
  }
  excerpt?: string
  _createdAt: string
  _updatedAt: string
  image?: {
    asset?: any
    altText?: string
  }
  author?: Array<{
    _id: string
    name?: string
    avatar?: {
      asset?: {
        _ref: string
      }
    }
  }>
  tag?: Array<{
    _id: string
    title?: string
    slug?: {
      current?: string
    }
  }>
  isDraft?: boolean
}

export function usePages() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPages() {
      try {
        setLoading(true)
        const query = `*[_type == "page"] | order(_createdAt desc) {
          _id,
          _originalId,
          title,
          slug,
          excerpt,
          _createdAt,
          _updatedAt,
          image {
            asset->,
            altText
          },
          author[]-> {
            _id,
            name,
            avatar {
              asset->
            }
          },
          tag[]-> {
            _id,
            title,
            slug
          }
        }`

        const data = await sanityClient.fetch<Page[]>(query)

        // Mark drafts - check both _id and _originalId for draft status
        const pagesWithStatus = data.map(page => {
          const isDraft = 
            page._id.startsWith('drafts.') || 
            (page as any)._originalId?.startsWith('drafts.') ||
            page._id.includes('drafts.')
          return {
            ...page,
            isDraft
          }
        })
        setPages(pagesWithStatus)
        setError(null)
      } catch (err) {
        console.error('Error fetching pages:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch pages')
      } finally {
        setLoading(false)
      }
    }

    fetchPages()
  }, [])

  return { pages, loading, error }
}

