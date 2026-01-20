import { useEffect, useState } from 'react'
import { sanityClient } from '../lib/sanity-client'

export interface Post {
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

export interface Author {
  _id: string
  name?: string
}

export interface Tag {
  _id: string
  title?: string
  slug?: {
    current?: string
  }
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true)
        // Fetch both published and draft posts
        // In Sanity, drafts have _id starting with "drafts." or are in drafts namespace
        const query = `*[_type == "post"] | order(_createdAt desc) {
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

        const data = await sanityClient.fetch<Post[]>(query)

        // Mark drafts - check both _id and _originalId for draft status
        const postsWithStatus = data.map(post => {
          const isDraft = 
            post._id.startsWith('drafts.') || 
            (post as any)._originalId?.startsWith('drafts.') ||
            post._id.includes('drafts.')
          return {
            ...post,
            isDraft
          }
        })
        setPosts(postsWithStatus)
        setError(null)
      } catch (err) {
        console.error('Error fetching posts:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  return { posts, loading, error }
}

export function useAuthors() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAuthors() {
      try {
        const query = `*[_type == "author"] | order(name asc) {
          _id,
          name
        }`
        const data = await sanityClient.fetch<Author[]>(query)
        setAuthors(data)
      } catch (err) {
        console.error('Error fetching authors:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAuthors()
  }, [])

  return { authors, loading }
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTags() {
      try {
        const query = `*[_type == "tag"] | order(title asc) {
          _id,
          title,
          slug
        }`
        const data = await sanityClient.fetch<Tag[]>(query)
        setTags(data)
      } catch (err) {
        console.error('Error fetching tags:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTags()
  }, [])

  return { tags, loading }
}

