import { createClient } from '@sanity/client'

const projectId = '' // your project id
const dataset = 'production'
const apiVersion = '2025-11-26'

// Try to get a write token first, fall back to signup token
// For write operations, you need a token with Editor or Administrator permissions
// const token = process.env.SANITY_API_READ_TOKEN || 
//               process.env.SANITY_API_SIGNUP_TOKEN

// if (!token) {
//   console.error('Missing Sanity API token. Please set one of: SANITY_API_TOKEN, SANITY_WRITE_TOKEN, or SANITY_API_SIGNUP_TOKEN')
// }

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production",
  // token: token!,
  perspective: 'drafts',
  // Ensure we're not using CDN for write operations
  withCredentials: true,
})

