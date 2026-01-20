import React, { useState, useEffect, useRef } from 'react'
import '../css/PostEditor.css'
import { sanityClient } from '../lib/sanity-client'
import { urlFor } from '../lib/image'
import { useAuthors, useTags } from '../hooks/use-posts'
import Select from 'react-select'
import { RichTextEditor } from './RichTextEditor'
import { BlockPreview } from './BlockPreview'
import { BlockEditor } from './BlockEditor'
import { PublishModal } from './PublishModal'
import { PreviewModal } from './PreviewModal'
import {VideoIcon, ImageIcon, ListIcon, HeadingIcon, BookmarkIcon, MessageCircleIcon, DivideSquareIcon, ShieldCheckIcon, GridIcon, UserLockIcon} from 'lucide-react'

interface PostEditorProps {
  postId?: string
  onSave?: () => void
  onCancel?: () => void
}

interface PostData {
  _id?: string
  title?: string
  slug?: {
    current?: string
  }
  excerpt?: string
  image?: {
    asset?: any
    altText?: string
    caption?: string
  }
  author?: Array<{
    _ref: string
  }>
  tag?: Array<{
    _ref: string
  }>
  isFeatured?: boolean
  pageBuilder?: any[]
  publishedAt?: string
  postAccess?: 'public' | 'members'
  template?: string
}


export function PostEditor({ postId, onSave, onCancel }: PostEditorProps) {
  const { authors } = useAuthors()
  const { tags } = useTags()
  const [currentPostId, setCurrentPostId] = useState<string | undefined>(postId)
  const [postData, setPostData] = useState<PostData>({
    title: '',
    excerpt: '',
    isFeatured: false,
    postAccess: 'public',
    template: 'default',
    pageBuilder: [],
  })
  const [loading, setLoading] = useState(!!postId)
  const [saving, setSaving] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [showComponentMenu, setShowComponentMenu] = useState(false)
  const [showComponentMenuForBlock, setShowComponentMenuForBlock] = useState<string | null>(null)
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [publishDate, setPublishDate] = useState('')
  const [publishTime, setPublishTime] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)
  const [showAltText, setShowAltText] = useState(false)
  const [customBlockModes, setCustomBlockModes] = useState<Record<string, 'edit' | 'preview'>>({})
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [lastSavedData, setLastSavedData] = useState<string>('')
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [blockToFocus, setBlockToFocus] = useState<string | null>(null)
  const [hoveredBlockKey, setHoveredBlockKey] = useState<string | null>(null)
  const [focusedBlockKey, setFocusedBlockKey] = useState<string | null>(null)
  const previousTitleRef = useRef<string>('')
  const slugManuallyEditedRef = useRef<boolean>(false)
 
  // Clear blockToFocus after focusing
  useEffect(() => {
    if (blockToFocus) {
      // Clear after a short delay to allow the block to render
      const timer = setTimeout(() => {
        setBlockToFocus(null)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [blockToFocus])

  // Available component types for the plug icon
  const componentTypes = [
    { type: 'callToActionObject', label: 'Call to Action', icon: MessageCircleIcon },
    { type: 'singleImageObject', label: 'Image', icon: ImageIcon },
    { type: 'videoObject', label: 'Video', icon: VideoIcon },
    { type: 'featuredBlock', label: 'Featured Block', icon: GridIcon },
    { type: 'heroBlock', label: 'Hero Block', icon: HeadingIcon },
    { type: 'postListingBlock', label: 'Post Listing', icon: ListIcon },
    { type: 'bookmarkBlock', label: 'Bookmark', icon: BookmarkIcon },
    { type: 'signupBlock', label: 'Signup', icon: UserLockIcon },
    { type: 'calloutBlock', label: 'Callout', icon: MessageCircleIcon },
    { type: 'dividerBlock', label: 'Divider', icon: DivideSquareIcon },
    { type: 'contentAccessBlock', label: 'Content Access', icon: ShieldCheckIcon },
  ]

  useEffect(() => {
    setCurrentPostId(postId)
  }, [postId])
  

  useEffect(() => {
    if (currentPostId) {
      fetchPost()
    } else {
      // Create a new draft post immediately
      const createDraftPost = async () => {
        setLoading(true)
        try {
          // Set default publish date/time for new posts
          const now = new Date()
          setPublishDate(now.toISOString().split('T')[0])
          setPublishTime(now.toTimeString().slice(0, 5))
          
          // Add default text block for new posts
          const defaultBlock = {
            _type: 'block',
            _key: `block-${Date.now()}`,
            style: 'normal',
            children: [{
              _type: 'span',
              _key: `span-${Date.now()}`,
              text: '',
              marks: [],
            }],
          }
          
          // Create draft post in Sanity
          // Generate a unique ID and prefix it with 'drafts.' to ensure it's a draft
          const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const draftId = `drafts.${uniqueId}`
          
          const postPayload: any = {
            _id: draftId,
            _type: 'post',
            title: 'Untitled',
            slug: {
              _type: 'slug',
              current: `untitled-${Date.now()}`,
            },
            excerpt: '',
            isFeatured: false,
            pageBuilder: [defaultBlock],
          }
          
          const created = await sanityClient.create(postPayload)
          
          // Update currentPostId and postData with the created post
          setCurrentPostId(created._originalId || created._id)
          setPostData(prev => ({
            ...prev,
            _id: created._originalId || created._id,
            title: 'Untitled',
            slug: created.slug,
            pageBuilder: [defaultBlock],
          }))
          
          // Update URL to include the new post ID
          window.location.hash = `/post/edit/${created._originalId || created._id}`
          
          // Update last saved data snapshot
          setLastSavedData(JSON.stringify({
            title: 'Untitled',
            excerpt: '',
            pageBuilder: [defaultBlock],
            image: undefined,
            slug: created.slug,
            selectedAuthorIds: [],
            selectedTagIds: [],
            isFeatured: false,
          }))
        } catch (err: any) {
          console.error('Error creating draft post:', err)
          alert(`Failed to create draft post: ${err?.message || 'Unknown error'}`)
        } finally {
          setLoading(false)
        }
      }
      
      createDraftPost()
    }
  }, [currentPostId])

  // Helper function to generate slug from title
  const generateSlugFromTitle = (title: string): string => {
    if (!title || !title.trim()) return ''
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  }

  // Auto-generate slug from title when title changes
  useEffect(() => {
    if (postData.title && postData.title.trim()) {
      const generatedSlug = generateSlugFromTitle(postData.title)
      const currentSlug = postData.slug?.current || ''
      const previousTitle = previousTitleRef.current
      const previousGeneratedSlug = previousTitle ? generateSlugFromTitle(previousTitle) : ''
      
      // Only auto-update slug if:
      // 1. Slug is empty, OR
      // 2. Current slug matches the previously generated slug (meaning it was auto-generated) AND user hasn't manually edited it
      // This allows manual slug edits to persist
      if (!currentSlug || (previousGeneratedSlug && currentSlug === previousGeneratedSlug && !slugManuallyEditedRef.current)) {
        setPostData(prev => ({
          ...prev,
          slug: {
            _type: 'slug',
            current: generatedSlug
          }
        }))
        // Reset the manual edit flag after auto-generating
        slugManuallyEditedRef.current = false
      }
      
      // Update previous title ref
      previousTitleRef.current = postData.title
    } else if (!postData.title || !postData.title.trim()) {
      // Clear slug if title is empty
      if (!slugManuallyEditedRef.current) {
        setPostData(prev => ({
          ...prev,
          slug: {
            _type: 'slug',
            current: ''
          }
        }))
      }
      previousTitleRef.current = ''
    }
  }, [postData.title])

  useEffect(() => {
    // Calculate word count from pageBuilder content
    const count = calculateWordCount(postData.pageBuilder || [])
    setWordCount(count)
  }, [postData.pageBuilder, postData.title, postData.excerpt])

  // Helper function to convert list HTML markers to proper Sanity blocks
  const convertListMarkersToBlocks = (block: any): any[] => {
    if (block._type !== 'block' || !block.children || block.children.length === 0) {
      return [block]
    }

    // Check if any child contains list HTML markers
    let fullText = ''
    block.children.forEach((child: any) => {
      fullText += child.text || ''
    })

    if (!fullText.includes('__LIST_HTML_UL__') && !fullText.includes('__LIST_HTML_OL__')) {
      return [block]
    }

    // Extract list HTML from markers
    const listMarker = fullText.includes('__LIST_HTML_UL__') ? '__LIST_HTML_UL__' : '__LIST_HTML_OL__'
    const startIndex = fullText.indexOf(listMarker) + listMarker.length
    const endIndex = fullText.lastIndexOf(listMarker)

    if (startIndex <= 0 || endIndex <= startIndex) {
      return [block]
    }

    const listHtml = fullText.substring(startIndex, endIndex)

    // Parse the HTML to extract list items
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = listHtml

    const listElement = tempDiv.querySelector('ul, ol')
    if (!listElement) {
      return [block]
    }

    const listType = listElement.tagName.toLowerCase() === 'ul' ? 'bullet' : 'number'
    const listItems = listElement.querySelectorAll('li')

    // Collect all markDefs from all list items
    const allMarkDefsMap = new Map<string, any>()
    const existingMarkDefs = block.markDefs || []
    existingMarkDefs.forEach((def: any) => {
      if (def._key) {
        allMarkDefsMap.set(def._key, def)
      }
    })

    // Convert each list item to a Sanity block
    const listBlocks: any[] = []
    listItems.forEach((li, index) => {
      // Extract text and marks from the list item
      const extractTextAndMarks = (element: Element): { textParts: Array<{ text: string, marks: string[] }>, markDefs: any[] } => {
        const result: Array<{ text: string, marks: string[] }> = []
        const linkMap = new Map<string, string>()
        const markDefs: any[] = []
        let markDefCounter = 0

        const processNode = (node: Node, inheritedMarks: string[] = []): void => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || ''
            if (text) {
              result.push({ text, marks: [...inheritedMarks] })
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            const marks = [...inheritedMarks]

            const tag = element.tagName.toLowerCase()
            if (tag === 'strong' || tag === 'b') marks.push('strong')
            else if (tag === 'em' || tag === 'i') marks.push('em')
            else if (tag === 'u') marks.push('underline')
            else if (tag === 'a') {
              const href = (element as HTMLAnchorElement).href || ''
              if (href) {
                let linkKey = linkMap.get(href)
                if (!linkKey) {
                  linkKey = `link-${Date.now()}-${markDefCounter++}`
                  linkMap.set(href, linkKey)
                  const markDef = {
                    _type: 'link',
                    _key: linkKey,
                    href: href,
                  }
                  markDefs.push(markDef)
                  allMarkDefsMap.set(linkKey, markDef)
                }
                marks.push(linkKey)
              }
            }

            for (let i = 0; i < element.childNodes.length; i++) {
              const child = element.childNodes[i]
              if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent || ''
                if (text) {
                  result.push({ text, marks: [...marks] })
                }
              } else if (child.nodeType === Node.ELEMENT_NODE) {
                const childElement = child as Element
                if (childElement.tagName.toLowerCase() === 'br') {
                  result.push({ text: '\n', marks: [...marks] })
                } else {
                  processNode(child, marks)
                }
              }
            }
          }
        }

        processNode(element)
        return { textParts: result, markDefs }
      }

      const { textParts } = extractTextAndMarks(li)

      // Combine text parts with same marks
      const children: any[] = []
      let currentText = ''
      let currentMarks: string[] = []

      textParts.forEach((part, partIndex) => {
        const marksKey = JSON.stringify(part.marks.sort())
        const currentMarksKey = JSON.stringify(currentMarks.sort())

        if (marksKey === currentMarksKey && partIndex > 0) {
          currentText += part.text
        } else {
          if (currentText) {
            children.push({
              _type: 'span',
              _key: `span-${Date.now()}-${children.length}`,
              text: currentText,
              marks: currentMarks,
            })
          }
          currentText = part.text
          currentMarks = part.marks
        }
      })

      if (currentText) {
        children.push({
          _type: 'span',
          _key: `span-${Date.now()}-${children.length}`,
          text: currentText,
          marks: currentMarks,
        })
      }

      // Create a Sanity block for this list item
      listBlocks.push({
        _type: 'block',
        _key: `block-${Date.now()}-${index}`,
        style: 'normal', // List items use 'normal' style
        listItem: listType, // Use listItem property for bullet/number
        level: 1, // Set level to 1 for top-level list items (required by Sanity Studio)
        children: children.length > 0 ? children : [{
          _type: 'span',
          _key: `span-${Date.now()}`,
          text: '',
          marks: [],
        }],
        markDefs: Array.from(allMarkDefsMap.values()),
      })
    })

    return listBlocks.length > 0 ? listBlocks : [block]
  }

  // Auto-save functionality
  const autoSave = async (skipValidation: boolean = false) => {
    // Don't auto-save if already saving manually
    if (saving || isAutoSaving) {
      return
    }

    // Skip if no content to save
    if (!postData.title?.trim() && (!postData.pageBuilder || postData.pageBuilder.length === 0)) {
      return
    }

    // Create a snapshot of current data for comparison
    const currentDataSnapshot = JSON.stringify({
      title: postData.title,
      excerpt: postData.excerpt,
      pageBuilder: postData.pageBuilder,
      image: postData.image,
      slug: postData.slug,
      selectedAuthorIds,
      selectedTagIds,
      isFeatured: postData.isFeatured,
      postAccess: postData.postAccess,
    })

    // Skip if data hasn't changed
    if (currentDataSnapshot === lastSavedData) {
      return
    }

    setIsAutoSaving(true)
    try {
      const slug = postData.slug?.current || postData.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'untitled'
      
      // Clean and validate pageBuilder blocks
      const cleanPageBuilder = (postData.pageBuilder || []).flatMap((block: any) => {
        if (!block._type || !block._key) {
          return []
        }
        
        // Convert list markers to proper blocks first
        const convertedBlocks = convertListMarkersToBlocks(block)
        
        // Clean block structure based on type
        return convertedBlocks.map((convertedBlock: any) => {
          if (convertedBlock._type === 'block') {
            // Determine listItem value - prioritize existing listItem, then check style
            let listItemValue: string | undefined = undefined
            if (convertedBlock.listItem === 'bullet' || convertedBlock.listItem === 'number') {
              listItemValue = convertedBlock.listItem
            } else if (convertedBlock.style === 'bullet' || convertedBlock.style === 'number') {
              listItemValue = convertedBlock.style
            }
            
            const cleanedBlock: any = {
              _type: 'block',
              _key: convertedBlock._key,
              style: listItemValue ? 'normal' : (convertedBlock.style || 'normal'),
              children: (convertedBlock.children || []).map((child: any) => ({
                _type: 'span',
                _key: child._key || `span-${Date.now()}`,
                text: child.text || '',
                marks: child.marks || [],
              })),
              markDefs: convertedBlock.markDefs || [],
            }
            
            // Always set listItem if it was determined above
            if (listItemValue) {
              cleanedBlock.listItem = listItemValue
              // Set level to 1 for list items (required by Sanity Studio)
              // Preserve existing level if present, otherwise default to 1
              cleanedBlock.level = convertedBlock.level || 1
            } else if (convertedBlock.level) {
              // Preserve level even if not a list item (for nested structures)
              cleanedBlock.level = convertedBlock.level
            }
            
            return cleanedBlock
          }
          
          return {
            ...convertedBlock,
            _type: convertedBlock._type,
            _key: convertedBlock._key,
          }
        })
      }).filter((block: any) => block !== null)

      // Prepare image field
      let imageField = undefined
      if (postData.image && postData.image.asset) {
        const assetId = postData.image.asset._id || postData.image.asset._ref
        if (assetId) {
          imageField = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: assetId,
            },
            altText: postData.image.altText || '',
            caption: postData.image.caption || '',
          }
        }
      }

      const postPayload: any = {
        _type: 'post',
        title: postData.title || 'Untitled',
        slug: {
          _type: 'slug',
          current: slug,
        },
        excerpt: postData.excerpt || '',
        isFeatured: postData.isFeatured || false,
        pageBuilder: cleanPageBuilder,
        postAccess: postData.postAccess || 'public',
      }

      // Only add fields if they exist
      if (imageField) {
        postPayload.image = imageField
      }

      if (selectedAuthorIds.length > 0) {
        postPayload.author = selectedAuthorIds.map((id, index) => ({
          _type: 'reference',
          _ref: id,
          _key: `author-${id}-${index}`,
        }))
      }

      if (selectedTagIds.length > 0) {
        postPayload.tag = selectedTagIds.map((id, index) => ({
          _type: 'reference',
          _ref: id,
          _key: `tag-${id}-${index}`,
        }))
      }

      // Remove undefined fields
      Object.keys(postPayload).forEach(key => {
        if (postPayload[key] === undefined) {
          delete postPayload[key]
        }
      })

      if (currentPostId) {
        // Update existing post
        await sanityClient
          .patch(currentPostId)
          .set(postPayload)
          .commit()
        
        // Update postData with the saved _id
        setPostData(prev => ({ ...prev, _id: currentPostId }))
      } else if (postData.title?.trim()) {
        // Create new post only if title exists
        const created = await sanityClient.create(postPayload)
        // Update currentPostId and postData
        setCurrentPostId(created._id)
        setPostData(prev => ({ ...prev, _id: created._id }))
      }

      // Update last saved data snapshot
      setLastSavedData(currentDataSnapshot)
    } catch (err: any) {
      console.error('Auto-save error:', err)
      // Don't show alerts for auto-save errors, just log them
    } finally {
      setIsAutoSaving(false)
    }
  }

  // Debounced auto-save effect
  useEffect(() => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    // Only auto-save if we have some content
    if (!postData.title?.trim() && (!postData.pageBuilder || postData.pageBuilder.length === 0)) {
      return
    }

    // Set new timer for auto-save (2 seconds after last change)
    const timer = setTimeout(() => {
      autoSave(true)
    }, 2000)

    setAutoSaveTimer(timer)

    // Cleanup
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [postData.title, postData.excerpt, postData.pageBuilder, postData.image, selectedAuthorIds, selectedTagIds, postData.isFeatured, postData.postAccess])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [])

  // Close component menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showComponentMenuForBlock && !target.closest('.post-editor-toolbar') && !target.closest('.post-editor-component-menu')) {
        setShowComponentMenuForBlock(null)
      }
      // Also close the main toolbar menu if open
      if (showComponentMenu && !target.closest('.post-editor-toolbar') && !target.closest('.post-editor-component-menu')) {
        setShowComponentMenu(false)
      }
    }

    if (showComponentMenuForBlock || showComponentMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showComponentMenuForBlock, showComponentMenu])

  const fetchPost = async () => {
    setLoading(true)
    try {
      const query = `*[_id == $postId][0] {
        _id,
        title,
        slug,
        excerpt,
        image {
          asset->,
          altText,
          caption
        },
        author[]-> {
          _id,
          name
        },
        tag[]-> {
          _id,
          title
        },
        isFeatured,
        pageBuilder,
        publishedAt,
        postAccess,
        _createdAt
      }`
      
      interface FetchedPostData {
        _id?: string
        title?: string
        slug?: { current?: string }
        excerpt?: string
        image?: {
          asset?: any
          altText?: string
          caption?: string
        }
        author?: Array<{ _id: string, name?: string }>
        tag?: Array<{ _id: string, title?: string }>
        isFeatured?: boolean
        pageBuilder?: any[]
        publishedAt?: string
        postAccess?: 'public' | 'members'
        _createdAt?: string
      }
      
      const data = await sanityClient.fetch<FetchedPostData>(query, { postId: currentPostId })
      
      if (data) {
        // Ensure at least one text block exists for editing
        let pageBuilder = data.pageBuilder || []
        if (pageBuilder.length === 0 || !pageBuilder.some((block: any) => block._type === 'block')) {
          const defaultBlock = {
            _type: 'block',
            _key: `block-${Date.now()}`,
            style: 'normal',
            children: [{
              _type: 'span',
              _key: `span-${Date.now()}`,
              text: '',
              marks: [],
            }],
          }
          pageBuilder = [defaultBlock, ...pageBuilder]
        }
        
        setPostData({
          _id: data._id,
          title: data.title || '',
          slug: data.slug,
          excerpt: data.excerpt || '',
          image: data.image,
          author: data.author?.map(a => ({ _ref: a._id })),
          tag: data.tag?.map(t => ({ _ref: t._id })),
          isFeatured: data.isFeatured || false,
          pageBuilder: pageBuilder,
          postAccess: data.postAccess || 'public',
          template: 'default',
        })
        setSelectedAuthorIds(data.author?.map(a => a._id) || [])
        setSelectedTagIds(data.tag?.map(t => t._id) || [])
        
        // Initialize refs for slug auto-generation
        previousTitleRef.current = data.title || ''
        slugManuallyEditedRef.current = false
        
        if (data.publishedAt) {
          const pubDate = new Date(data.publishedAt)
          setPublishDate(pubDate.toISOString().split('T')[0])
          setPublishTime(pubDate.toTimeString().slice(0, 5))
        } else if (data._createdAt) {
          const createdDate = new Date(data._createdAt)
          setPublishDate(createdDate.toISOString().split('T')[0])
          setPublishTime(createdDate.toTimeString().slice(0, 5))
        }
      }
    } catch (err) {
      console.error('Error fetching post:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to check if a block is empty
  const isBlockEmpty = (block: any): boolean => {
    if (block._type !== 'block') return false
    if (!block.children || block.children.length === 0) return true
    
    // Check if all children have empty text
    const hasText = block.children.some((child: any) => {
      const text = child.text || ''
      return text.trim().length > 0
    })
    
    return !hasText
  }

  const calculateWordCount = (content: any[]): number => {
    let count = 0
    
    // Count words in title
    if (postData.title) {
      count += postData.title.split(/\s+/).filter(w => w.length > 0).length
    }
    
    // Count words in excerpt
    if (postData.excerpt) {
      count += postData.excerpt.split(/\s+/).filter(w => w.length > 0).length
    }
    
    // Count words in pageBuilder blocks
    content.forEach(block => {
      if (block._type === 'block' && block.children) {
        block.children.forEach((child: any) => {
          if (child.text) {
            count += child.text.split(/\s+/).filter((w: string) => w.length > 0).length
          }
        })
      }
    })
    
    return count
  }

  const handleDelete = async () => {
    // Confirm deletion
    const confirmed = window.confirm(
      currentPostId 
        ? 'Are you sure you want to delete this post? This action cannot be undone.'
        : 'Are you sure you want to clear all content? This action cannot be undone.'
    )
    
    if (!confirmed) {
      return
    }

    setSaving(true)
    try {

      if (currentPostId) {

        console.log('currentPostId', currentPostId)

        // Delete the post from Sanity
        // await sanityClient.delete(currentPostId)
        const draftId = currentPostId?.includes('drafts.') ? currentPostId : `${currentPostId}`;
        await sanityClient.transaction()
          .delete(currentPostId)
          .commit()
        console.log('Post deleted successfully')
        
        // Show success message
        alert('Post deleted successfully')
        
        // Navigate back to posts list
        if (onCancel) {
          onCancel()
        }
      } else {
        // For new posts, just clear the form
        setPostData({
          title: '',
          excerpt: '',
          isFeatured: false,
          postAccess: 'public',
          template: 'default',
          pageBuilder: [],
        })
        setSelectedAuthorIds([])
        setSelectedTagIds([])
        setCurrentPostId(undefined)
        alert('Content cleared')
      }
    } catch (err: any) {
      console.error('Error deleting post:', err)
      const errorMessage = err?.message || err?.toString() || 'Unknown error'
      alert(`Failed to delete post: ${errorMessage}. Please check the console for more details.`)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (publish: boolean = false) => {
    setSaving(true)
    try {
      // Validate required fields
      if (!postData.title || postData.title.trim() === '') {
        alert('Please enter a post title')
        setSaving(false)
        return
      }

      if (selectedAuthorIds.length === 0) {
        alert('Please select at least one author')
        setSaving(false)
        return
      }

      const slug = postData.slug?.current || postData.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'untitled'
      
      // Clean and validate pageBuilder blocks
      const cleanPageBuilder = (postData.pageBuilder || []).flatMap((block: any) => {
        // Ensure each block has _type and _key
        if (!block._type || !block._key) {
          return []
        }
        
        // Convert list markers to proper blocks first
        const convertedBlocks = convertListMarkersToBlocks(block)
        
        // Clean block structure based on type
        return convertedBlocks.map((convertedBlock: any) => {
          if (convertedBlock._type === 'block') {
            // Determine listItem value - prioritize existing listItem, then check style
            let listItemValue: string | undefined = undefined
            if (convertedBlock.listItem === 'bullet' || convertedBlock.listItem === 'number') {
              listItemValue = convertedBlock.listItem
            } else if (convertedBlock.style === 'bullet' || convertedBlock.style === 'number') {
              listItemValue = convertedBlock.style
            }
            
            const cleanedBlock: any = {
              _type: 'block',
              _key: convertedBlock._key,
              style: listItemValue ? 'normal' : (convertedBlock.style || 'normal'),
              children: (convertedBlock.children || []).map((child: any) => ({
                _type: 'span',
                _key: child._key || `span-${Date.now()}`,
                text: child.text || '',
                marks: child.marks || [],
              })),
              markDefs: convertedBlock.markDefs || [],
            }
            
            // Always set listItem if it was determined above
            if (listItemValue) {
              cleanedBlock.listItem = listItemValue
              // Set level to 1 for list items (required by Sanity Studio)
              // Preserve existing level if present, otherwise default to 1
              cleanedBlock.level = convertedBlock.level || 1
            } else if (convertedBlock.level) {
              // Preserve level even if not a list item (for nested structures)
              cleanedBlock.level = convertedBlock.level
            }
            
            return cleanedBlock
          }
          
          // For other block types, return as-is but ensure _type and _key exist
          return {
            ...convertedBlock,
            _type: convertedBlock._type,
            _key: convertedBlock._key,
          }
        })
      }).filter((block: any) => block !== null)

      // Prepare image field - convert asset object to reference if needed
      let imageField = undefined
      if (postData.image && postData.image.asset) {
        // Get the asset ID - could be from expanded asset or reference
        const assetId = postData.image.asset._id || postData.image.asset._ref
        
        if (assetId) {
          imageField = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: assetId,
            },
            altText: postData.image.altText || '',
            caption: postData.image.caption || '',
          }
        }
      }

      const postPayload: any = {
        _type: 'post',
        title: postData.title,
        slug: {
          _type: 'slug',
          current: slug,
        },
        excerpt: postData.excerpt || '',
        author: selectedAuthorIds.map((id, index) => ({
          _type: 'reference',
          _ref: id,
          _key: `author-${id}-${index}`,
        })),
        tag: selectedTagIds.length > 0 ? selectedTagIds.map((id, index) => ({
          _type: 'reference',
          _ref: id,
          _key: `tag-${id}-${index}`,
        })) : undefined,
        isFeatured: postData.isFeatured || false,
        pageBuilder: cleanPageBuilder,
      }

      // Only add image field if it exists (don't set it to undefined)
      if (imageField) {
        postPayload.image = imageField
      }

      // Remove undefined fields
      Object.keys(postPayload).forEach(key => {
        if (postPayload[key] === undefined) {
          delete postPayload[key]
        }
      })

      console.log('Saving post with payload:', JSON.stringify(postPayload, null, 2))

      if (currentPostId) {
        await sanityClient
          .patch(currentPostId)
          .set(postPayload)
          .commit()
      } else {
        const created = await sanityClient.create(postPayload)
        setCurrentPostId(created._id)
        setPostData(prev => ({ ...prev, _id: created._id }))
      }
      
      console.log('Post saved successfully')
      
      // Update last saved data snapshot after manual save
      const currentDataSnapshot = JSON.stringify({
        title: postData.title,
        excerpt: postData.excerpt,
        pageBuilder: postData.pageBuilder,
        image: postData.image,
        slug: postData.slug,
        selectedAuthorIds,
        selectedTagIds,
        isFeatured: postData.isFeatured,
      })
      setLastSavedData(currentDataSnapshot)
      
      if (onSave) {
        onSave()
      }
    } catch (err: any) {
      console.error('Error saving post:', err)
      const errorMessage = err?.message || err?.toString() || 'Unknown error'
      console.error('Full error details:', err)
      alert(`Failed to save post: ${errorMessage}. Please check the console for more details.`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddComponent = (componentType: string, insertAfterIndex?: number) => {
    const newComponent: any = {
      _type: componentType,
      _key: `component-${Date.now()}`,
    }
    
    // Initialize component-specific fields based on type
    if (componentType === 'singleImageObject') {
      newComponent.image = undefined
    } else if (componentType === 'block') {
      newComponent.children = [{ _type: 'span', text: '', marks: [], _key: `span-${Date.now()}` }]
      newComponent.style = 'normal'
    } else if (componentType === 'callToActionObject') {
      newComponent.callToActionTitle = ''
      newComponent.callToActionParagraph = ''
      newComponent.buttons = []
    } else if (componentType === 'videoObject') {
      newComponent.title = ''
      newComponent.videoUrl = ''
    } else if (componentType === 'heroBlock') {
      newComponent.title = ''
      newComponent.showForm = true
    } else if (componentType === 'featuredBlock') {
      newComponent.title = ''
      newComponent.maxPosts = 3
      newComponent.hideImages = false
      newComponent.hideTitles = false
    } else if (componentType === 'postListingBlock') {
      newComponent.maxPosts = 5
      newComponent.showReadTime = true
      newComponent.showDate = true
      newComponent.showLoadMore = false
    } else if (componentType === 'bookmarkBlock') {
      newComponent.linkType = 'internal'
      newComponent.hideExcerpt = false
    } else if (componentType === 'signupBlock') {
      newComponent.title = ''
      newComponent.alignment = 'left'
      newComponent.buttonLabel = 'Subscribe'
    } else if (componentType === 'calloutBlock') {
      newComponent.text = ''
      newComponent.enableEmoji = false
    } else if (componentType === 'dividerBlock') {
      newComponent.style = 'default'
    } else if (componentType === 'contentAccessBlock') {
      newComponent.accessLevel = 'membersOnly'
    }
    
    const currentPageBuilder = [...(postData.pageBuilder || [])]
    
    // Insert component at specified index, or append to end
    if (insertAfterIndex !== undefined && insertAfterIndex >= 0) {
      const insertIndex = insertAfterIndex + 1
      currentPageBuilder.splice(insertIndex, 0, newComponent)
      
      // If the added component is not a block type, add a new paragraph block after it
      if (componentType !== 'block') {
        const newParagraphBlock = {
          _type: 'block',
          _key: `block-${Date.now()}`,
          style: 'normal',
          children: [{ _type: 'span', text: '', marks: [], _key: `span-${Date.now()}` }],
        }
        currentPageBuilder.splice(insertIndex + 1, 0, newParagraphBlock)
      }
    } else {
      currentPageBuilder.push(newComponent)
      // If the added component is not a block type, add a new paragraph block after it
      if (componentType !== 'block') {
        const newParagraphBlock = {
          _type: 'block',
          _key: `block-${Date.now()}`,
          style: 'normal',
          children: [{ _type: 'span', text: '', marks: [], _key: `span-${Date.now()}` }],
        }
        currentPageBuilder.push(newParagraphBlock)
      }
    }
    
    setPostData({
      ...postData,
      pageBuilder: currentPageBuilder,
    })
    
    setShowComponentMenu(false)
    setShowComponentMenuForBlock(null)
  }

  const handleUploadImage = async (file: File, blockKey?: string) => {
    try {
      const asset = await sanityClient.assets.upload('image', file, {
        filename: file.name || `image-${Date.now()}.jpg`,
      })
      
      const imageRef = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: asset._id,
        },
        altText: '',
        caption: '',
      }

      if (blockKey) {
        // Update image in page builder block
        const updatedBlocks = postData.pageBuilder?.map(block => 
          block._key === blockKey 
            ? { ...block, image: imageRef }
            : block
        )
        setPostData({ ...postData, pageBuilder: updatedBlocks || [] })
      } else {
        // Update featured image
        setPostData({
          ...postData,
          image: imageRef,
        })
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      alert('Failed to upload image. Please try again.')
    }
  }

  const handleDeleteBlock = (blockKey: string) => {
    const updatedBlocks = postData.pageBuilder?.filter(block => block._key !== blockKey)
    setPostData({ ...postData, pageBuilder: updatedBlocks })
  }

  const handleUpdateBlock = (blockKey: string, updates: any) => {
    const updatedBlocks = postData.pageBuilder?.map(block =>
      block._key === blockKey ? { ...block, ...updates } : block
    )
    setPostData({ ...postData, pageBuilder: updatedBlocks || [] })
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const imageUrl = postData.image?.asset 
    ? urlFor(postData.image).url()
    : null

  const authorOptions = authors.map(author => ({
    value: author._id,
    label: author.name || 'Unnamed'
  }))

  const tagOptions = tags.map(tag => ({
    value: tag._id,
    label: tag.title || 'Unnamed'
  }))

  if (loading) {
    return (
      <div className="post-editor-container">
        <div className="post-editor-loading">Loading post...</div>
      </div>
    )
  }

  return (
    <div className="post-editor-container">
      <div className="post-editor-header">
        <div className="post-editor-header-left">
          <button className="post-editor-back-button" onClick={onCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Posts</span>
          </button>
          <span className="post-editor-status">
            {currentPostId?.startsWith('drafts.') ? 'Draft' : 'Published'} - {isAutoSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>
        <div className="post-editor-header-right">
          <button 
            className="post-editor-preview-button"
            onClick={() => setShowPreviewModal(true)}
          >
            Preview
          </button>
         
          <button 
            className="post-editor-publish-button"
            onClick={() => setShowPublishModal(true)}
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish'}
          </button>
          <button
            className={`post-editor-settings-toggle ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Post settings"
          >
            <svg fill="none" viewBox="0 0 24 24">
              <path d="M21 2.5H3c-.828 0-1.5.608-1.5 1.357v16.286c0 .75.672 1.357 1.5 1.357h18c.828 0 1.5-.608 1.5-1.357V3.857c0-.75-.672-1.357-1.5-1.357zm-4.5 0v19" strokeWidth="1.5" strokeLinecap="round"></path>
              <path d="M16.5 2.5v19h6v-19h-6z" fill="none"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="post-editor-content">
        <div className="post-editor-main">
          {/* Featured Image Section */}
          <div className="post-editor-featured-image-section">
            {imageUrl ? (
              <>
              <div className="post-editor-featured-image-wrapper">
                <img src={imageUrl} alt={postData.image?.altText || 'Featured image'} />
                <div className="post-editor-image-overlay">
                  <label className="post-editor-image-upload-button" data-tooltip="Edit">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadImage(file)
                      }}
                      style={{ display: 'none' }}
                    />
                    <svg fill="none" viewBox="0 0 24 25"><path stroke="currentColor" strokeLinejoin="round" d="M1 21.094L3.913 24 17 10.906 14.125 8 1 21.094zM11 11l3 3M5.25 4.25a2.5 2.5 0 002.5-2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 00-2.5-2.5zm12 0a2.5 2.5 0 002.5-2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 00-2.5-2.5zm0 11.99a2.5 2.5 0 002.5-2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 00-2.5-2.5z"></path></svg>
                  </label>
                 <label className="post-editor-image-remove-button" data-tooltip="Delete" onClick={() => setPostData({ ...postData, image: undefined })}>
                  <svg fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M1.917 5.583h20.166m-8.02-3.666H9.936a1.375 1.375 0 00-1.374 1.375v2.291h6.874V3.292a1.375 1.375 0 00-1.374-1.375zM9.938 17.27v-6.874m4.125 6.874v-6.874"></path><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M18.288 20.818a1.366 1.366 0 01-1.366 1.265H7.077a1.366 1.366 0 01-1.365-1.265L4.438 5.583h15.125l-1.275 15.235z"></path></svg>
                 </label>
                </div>
              </div>
              <div className="post-editor-image-caption-row">
                {!showAltText && (
                    <input
                    type="text"
                    placeholder="Add a caption to the feature image (optional)"
                    value={postData.image?.caption || ''}
                    onChange={(e) => setPostData({
                      ...postData,
                      image: {
                        ...postData.image,
                        caption: e.target.value,
                      }
                    })}
                    className="post-editor-caption-input"
                  />
                )}
                {showAltText && (
                  <input
                    type="text"
                    placeholder="Add alt text for the image"
                    value={postData.image?.altText || ''}
                    onChange={(e) => setPostData({
                      ...postData,
                      image: {
                        ...postData.image,
                        altText: e.target.value,
                      }
                    })}
                    className="post-editor-alt-input"
                    autoFocus
                  />
                )}
                <button className={`post-editor-alt-button ${showAltText ? 'active' : ''}`} onClick={() => setShowAltText(!showAltText)}> Alt </button>
              </div>
              </>
            ) : (
              <div className="post-editor-featured-image-placeholder">
                <svg viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path></svg>
                <label className="post-editor-image-upload-button">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadImage(file)
                    }}
                    style={{ display: 'none' }}
                  />
                  Add feature image
                </label>
              </div>
            )}
          </div>

          {/* Title Section */}
          <div className="post-editor-title-section">
            <textarea
              placeholder="Post title"
              value={postData.title}
              onChange={(e) => setPostData({ ...postData, title: e.target.value })}
              className="post-editor-title-input"
              onInput={e => {
                const textarea = e.currentTarget as HTMLTextAreaElement;
                textarea.style.height = '57px';
                textarea.style.height = `${textarea.scrollHeight}px`;
              }}
            />
            <textarea
              placeholder="Add an excerpt"
              value={postData.excerpt}
              onChange={(e) => setPostData({ ...postData, excerpt: e.target.value })}
              className="post-editor-subtitle-input"
              onInput={e => {
                const textarea = e.currentTarget as HTMLTextAreaElement;
                textarea.style.height = '30px';
                textarea.style.height = `${textarea.scrollHeight}px`;
              }}
              style={{
                resize: "none",
              }}
            />
            <hr />
          </div>

          {/* Content Editor */}
          <div className="post-editor-content-area">
            <div className="post-editor-content-editor">
              {postData.pageBuilder && postData.pageBuilder.length > 0 ? (
                <div className="post-editor-blocks">
                  {(() => {
                    // Group consecutive list items together
                    const groupedBlocks: Array<{ type: 'list' | 'block', items: any[], listType?: 'bullet' | 'number' }> = []
                    let currentGroup: { type: 'list' | 'block', items: any[], listType?: 'bullet' | 'number' } | null = null
                    
                    postData.pageBuilder.forEach((block, index) => {
                      if (block._type === 'block') {
                        const isListItem = block.listItem === 'bullet' || block.listItem === 'number' || block.style === 'bullet' || block.style === 'number'
                        
                        if (isListItem) {
                          const listType = block.listItem === 'bullet' || block.style === 'bullet' ? 'bullet' : 'number'
                          
                          // Check if we can continue the current list group
                          if (currentGroup && currentGroup.type === 'list' && currentGroup.listType === listType) {
                            currentGroup.items.push(block)
                          } else {
                            // Start a new list group
                            if (currentGroup) {
                              groupedBlocks.push(currentGroup)
                            }
                            currentGroup = {
                              type: 'list',
                              items: [block],
                              listType: listType
                            }
                          }
                        } else {
                          // Regular block - close current list group if any
                          if (currentGroup) {
                            groupedBlocks.push(currentGroup)
                            currentGroup = null
                          }
                          groupedBlocks.push({
                            type: 'block',
                            items: [block]
                          })
                        }
                      } else {
                        // Non-block component - close current list group if any
                        if (currentGroup) {
                          groupedBlocks.push(currentGroup)
                          currentGroup = null
                        }
                        groupedBlocks.push({
                          type: 'block',
                          items: [block]
                        })
                      }
                    })
                    
                    // Don't forget the last group
                    if (currentGroup) {
                      groupedBlocks.push(currentGroup)
                    }
                    
                    return groupedBlocks.map((group, groupIndex) => {
                      if (group.type === 'list') {
                        // Render as a list
                        const ListTag = group.listType === 'bullet' ? 'ul' : 'ol'
                        return (
                          <React.Fragment key={`list-${groupIndex}`}>
                            <div className="post-editor-block">
                              <div className="post-editor-list-block">
                                <ListTag className={`post-editor-list post-editor-list-${ListTag}`}>
                                  {group.items.map((block, itemIndex) => (
                                    <div key={block._key || itemIndex} className="post-editor-list-item-wrapper">
                                      <RichTextEditor
                                        value={block}
                                        onChange={(updatedBlock) => {
                                          handleUpdateBlock(block._key, updatedBlock)
                                        }}
                                        placeholder="List item..."
                                        onDeleteBlock={() => handleDeleteBlock(block._key)}
                                        autoFocus={blockToFocus === block._key}
                                        onAddNewBlock={(contentBefore, contentAfter) => {
                                          // Update current block with content before cursor (remove listItem properties)
                                          handleUpdateBlock(block._key, contentBefore)
                                          
                                          // Find current block index
                                          const currentIndex = (postData.pageBuilder || []).findIndex(b => b._key === block._key)
                                          
                                          // Create new regular paragraph block (not a list item)
                                          const newBlockKey = `block-${Date.now()}`
                                          const newBlock = {
                                            ...contentAfter,
                                            _key: newBlockKey,
                                            style: 'normal',
                                            // Remove listItem and level properties to create a regular paragraph
                                            listItem: undefined,
                                            level: undefined,
                                          }
                                          
                                          // Insert new paragraph block after current block
                                          const updatedPageBuilder = [...(postData.pageBuilder || [])]
                                          updatedPageBuilder.splice(currentIndex + 1, 0, newBlock)
                                          
                                          setPostData({ ...postData, pageBuilder: updatedPageBuilder })
                                          
                                          // Focus the new block after it's rendered
                                          setBlockToFocus(newBlockKey)
                                        }}
                                        onAddNewListItem={(contentBefore, contentAfter) => {
                                          // Update current block with content before cursor
                                          handleUpdateBlock(block._key, contentBefore)
                                          
                                          // Find current block index
                                          const currentIndex = (postData.pageBuilder || []).findIndex(b => b._key === block._key)
                                          
                                          // Create new list item block
                                          const newBlockKey = `block-${Date.now()}`
                                          const newBlock = {
                                            ...contentAfter,
                                            _key: newBlockKey,
                                            listItem: block.listItem || (block.style === 'bullet' ? 'bullet' : block.style === 'number' ? 'number' : 'bullet'),
                                            style: 'normal',
                                            level: block.level || 1, // Preserve level or default to 1
                                          }
                                          
                                          // Insert new list item block after current block
                                          const updatedPageBuilder = [...(postData.pageBuilder || [])]
                                          updatedPageBuilder.splice(currentIndex + 1, 0, newBlock)
                                          
                                          setPostData({ ...postData, pageBuilder: updatedPageBuilder })
                                          
                                          // Focus the new block after it's rendered
                                          setBlockToFocus(newBlockKey)
                                        }}
                                      />
                                    </div>
                                  ))}
                                </ListTag>
                                <button
                                  className="post-editor-block-delete"
                                  onClick={() => {
                                    // Delete all items in the list
                                    group.items.forEach(item => handleDeleteBlock(item._key))
                                  }}
                                  title="Delete list"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </React.Fragment>
                        )
                      } else {
                        // Render regular blocks
                        return group.items.map((block, itemIndex) => {
                          const blockIndex = (postData.pageBuilder || []).findIndex(b => b._key === block._key)
                          return (
                            <React.Fragment key={block._key || `block-${groupIndex}-${itemIndex}`}>
                              <div 
                                className="post-editor-block"
                              >
                                {block._type === 'block' ? (
                                  <div className="post-editor-text-block">
                                    {/* Show toolbar by default for empty paragraph blocks */}
                                    {!block.listItem && isBlockEmpty(block) && (
                                      <div className="post-editor-toolbar post-editor-toolbar-inline">
                                        <button
                                          className="post-editor-plug-button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            // Toggle menu for this specific block
                                            if (showComponentMenuForBlock === block._key) {
                                              setShowComponentMenuForBlock(null)
                                            } else {
                                              setShowComponentMenuForBlock(block._key)
                                            }
                                          }}
                                          title="Add component"
                                        >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2v20M2 12h20"/>
                                          </svg>
                                        </button>
                                        {showComponentMenuForBlock === block._key && (
                                          <div className="post-editor-component-menu">
                                            {componentTypes.map(comp => (
                                              <button
                                                key={comp.type}
                                                className="post-editor-component-menu-item"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  const currentIndex = (postData.pageBuilder || []).findIndex(b => b._key === block._key)
                                                  handleAddComponent(comp.type, currentIndex)
                                                  setShowComponentMenuForBlock(null)
                                                }}
                                              >
                                                <comp.icon />
                                                {comp.label}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <RichTextEditor
                                      value={block}
                                      onChange={(updatedBlock) => {
                                        handleUpdateBlock(block._key, updatedBlock)
                                        // Close menu if block is no longer empty
                                        if (!isBlockEmpty(updatedBlock)) {
                                          setShowComponentMenuForBlock(null)
                                        }
                                      }}
                                      placeholder="Start writing..."
                                      onDeleteBlock={() => handleDeleteBlock(block._key)}
                                      autoFocus={blockToFocus === block._key}
                                      onAddNewBlock={(contentBefore, contentAfter) => {
                                        // Update current block with content before cursor
                                        handleUpdateBlock(block._key, contentBefore)
                                        
                                        // Find current block index
                                        const currentIndex = (postData.pageBuilder || []).findIndex(b => b._key === block._key)
                                        
                                        // Insert new block after current block
                                        const newBlockKey = `block-${Date.now()}`
                                        const newBlock = {
                                          ...contentAfter,
                                          _key: newBlockKey,
                                        }
                                        
                                        const updatedPageBuilder = [...(postData.pageBuilder || [])]
                                        updatedPageBuilder.splice(currentIndex + 1, 0, newBlock)
                                        
                                        setPostData({ ...postData, pageBuilder: updatedPageBuilder })
                                        
                                        // Focus the new block after it's rendered
                                        setBlockToFocus(newBlockKey)
                                      }}
                                    />
                                    <button
                                      className="post-editor-block-delete"
                                      onClick={() => handleDeleteBlock(block._key)}
                                      title="Delete block"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                    </button>
                                  </div>
                                ) : block._type === 'singleImageObject' ? (
                        <div className="post-editor-image-block">
                          {block.image?.asset ? (
                            <div className="post-editor-block-image-wrapper">
                              <img
                                src={urlFor(block.image).width(800).url()}
                                alt={block.image?.altText || 'Block image'}
                              />
                              <div className="post-editor-block-image-overlay">
                                <label className="post-editor-block-image-upload" data-tooltip="Edit">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleUploadImage(file, block._key)
                                    }}
                                    style={{ display: 'none' }}
                                  />
                                  <svg fill="none" viewBox="0 0 24 25"><path stroke="currentColor" strokeLinejoin="round" d="M1 21.094L3.913 24 17 10.906 14.125 8 1 21.094zM11 11l3 3M5.25 4.25a2.5 2.5 0 002.5-2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 00-2.5-2.5zm12 0a2.5 2.5 0 002.5-2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 00-2.5-2.5zm0 11.99a2.5 2.5 0 002.5-2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 00-2.5-2.5z"></path></svg>
                                </label>
                                <label 
                                  className="post-editor-block-image-delete" 
                                  data-tooltip="Delete" 
                                  onClick={() => {
                                    // Remove only the image from this block, not the entire block
                                    handleUpdateBlock(block._key, {
                                      image: undefined,
                                    })
                                  }}
                                  title="Delete image"
                                  >
                                  <svg fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M1.917 5.583h20.166m-8.02-3.666H9.936a1.375 1.375 0 00-1.374 1.375v2.291h6.874V3.292a1.375 1.375 0 00-1.374-1.375zM9.938 17.27v-6.874m4.125 6.874v-6.874"></path><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M18.288 20.818a1.366 1.366 0 01-1.366 1.265H7.077a1.366 1.366 0 01-1.365-1.265L4.438 5.583h15.125l-1.275 15.235z"></path></svg>
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="post-editor-block-image-placeholder">
                              <label className="post-editor-block-image-upload">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleUploadImage(file, block._key)
                                  }}
                                  style={{ display: 'none' }}
                                />
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                  <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                Upload image
                              </label>
                            </div>
                          )}
                          <div className="post-editor-block-image-caption-row">
                            <input
                              type="text"
                              placeholder="Image caption"
                              value={block.image?.caption || ''}
                              onChange={(e) => {
                                handleUpdateBlock(block._key, {
                                  image: {
                                    ...(block.image || {}),
                                    caption: e.target.value,
                                  },
                                })
                              }}
                              className="post-editor-block-caption-input"
                            />
                            <button className="post-editor-alt-button">Alt</button>
                          </div>
                          <button
                            className="post-editor-block-delete"
                            onClick={() => handleDeleteBlock(block._key)}
                            title="Delete block"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className={`post-editor-custom-block ${block._type === 'dividerBlock' ? 'post-editor-divider-block' : ''}`}>
                          <div className="post-editor-custom-block-header">
                              <span>{componentTypes.find(c => c.type === block._type)?.label || block._type}</span>
                            <div className="post-editor-custom-block-actions">
                              {block._type !== 'dividerBlock' && (
                                <>
                              <button
                                className={`post-editor-custom-block-button ${customBlockModes[block._key] === 'edit' ? 'active' : ''}`}
                                onClick={() => setCustomBlockModes({ ...customBlockModes, [block._key]: 'edit' })}
                                title="Edit block"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
                              </button>
                              <button
                                className={`post-editor-custom-block-button ${customBlockModes[block._key] === 'preview' || !customBlockModes[block._key] ? 'active' : ''}`}
                                onClick={() => setCustomBlockModes({ ...customBlockModes, [block._key]: 'preview' })}
                                title="Preview block"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                Preview
                              </button>
                              </>
                              )}
                              <button
                                className="post-editor-block-delete"
                                onClick={() => handleDeleteBlock(block._key)}
                                title="Delete block"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="post-editor-custom-block-content">
                            {customBlockModes[block._key] === 'edit' ? (
                              <BlockEditor
                                block={block}
                                onUpdate={(updates) => {
                                  handleUpdateBlock(block._key, { ...block, ...updates })
                                }}
                                onUploadImage={async (file) => {
                                  try {
                                    const asset = await sanityClient.assets.upload('image', file, {
                                      filename: file.name || `image-${Date.now()}.jpg`,
                                    })
                                    
                                    const imageRef = {
                                      _type: 'image',
                                      asset: {
                                        _type: 'reference',
                                        _ref: asset._id,
                                      },
                                      altText: block.image?.altText || '',
                                      caption: block.image?.caption || '',
                                    }
                                    
                                    handleUpdateBlock(block._key, {
                                      ...block,
                                      image: imageRef
                                    })
                                  } catch (err) {
                                    console.error('Error uploading image:', err)
                                    alert('Failed to upload image. Please try again.')
                                  }
                                }}
                              />
                            ) : (
                              <div className="post-editor-custom-block-preview">
                                <BlockPreview block={block} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                              </div>
                            </React.Fragment>
                          )
                        })
                      }
                    }).flat()
                  })()}
                </div>
              ) : (
                <div className="post-editor-empty-state">
                  <div className="post-editor-text-block post-editor-full-height-editor">
                    <RichTextEditor
                      value={{
                        _type: 'block',
                        _key: `block-empty-${Date.now()}`,
                        style: 'normal',
                        children: [{
                          _type: 'span',
                          _key: `span-empty-${Date.now()}`,
                          text: '',
                          marks: [],
                        }],
                      }}
                      onChange={(updatedBlock) => {
                        // Add the block to pageBuilder when user starts typing
                        const hasContent = updatedBlock.children && 
                          updatedBlock.children.length > 0 && 
                          updatedBlock.children.some((child: any) => child.text && child.text.trim())
                        
                        if (hasContent) {
                          const blockKey = `block-${Date.now()}`
                          const blockWithKey = {
                            ...updatedBlock,
                            _key: blockKey,
                            children: updatedBlock.children.map((child: any, idx: number) => ({
                              ...child,
                              _key: child._key || `span-${blockKey}-${idx}`,
                            })),
                          }
                          setPostData({ ...postData, pageBuilder: [blockWithKey] })
                        }
                      }}
                      placeholder="Begin writing your post..."
                    />
                  </div>
                </div>
              )}
              
              {/* Toolbar - positioned after the last block - only show if no empty paragraph blocks */}
              {(() => {
                // Check if there are any empty paragraph blocks (not list items)
                const hasEmptyParagraphBlocks = (postData.pageBuilder || []).some((block: any) => 
                  block._type === 'block' && 
                  !block.listItem && 
                  isBlockEmpty(block)
                )
                
                // Only show main toolbar if there are no empty paragraph blocks
                if (!hasEmptyParagraphBlocks) {
                  return (
                    <div className="post-editor-toolbar">
                      <button
                        className="post-editor-plug-button"
                        onClick={() => setShowComponentMenu(!showComponentMenu)}
                        title="Add component"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M2 12h20"/>
                        </svg>
                      </button>
                      {showComponentMenu && (
                        <div className="post-editor-component-menu">
                          {componentTypes.map(comp => (
                            <button
                              key={comp.type}
                              className="post-editor-component-menu-item"
                              onClick={() => handleAddComponent(comp.type)}
                            >
                              <comp.icon />
                              {comp.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>

          {/* Word Count */}
          <div 
            className="post-editor-word-count"
            style={{ right: showSettings ? '424px' : '24px' }}
          >
            {wordCount.toLocaleString()} words
          </div>
        </div>

        {/* Post Settings Sidebar */}
        {showSettings && (
        <div className="post-editor-sidebar">
          <div className="post-editor-sidebar-header">
            <h3>Post settings</h3>
          </div>

          <div className="post-editor-sidebar-content">
            {/* Post URL */}
            <div className="post-editor-setting-group">
              <label>Post URL</label>
              <div className="post-editor-url-input-wrapper">
                <input
                  type="text"
                  value={postData.slug?.current || ''}
                  onChange={(e) => {
                    slugManuallyEditedRef.current = true
                    setPostData({
                      ...postData,
                      slug: { current: e.target.value }
                    })
                  }}
                  className="post-editor-url-input"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="post-editor-link-icon">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </div>
              <div className="post-editor-url-preview">
                {process.env.NEXT_PUBLIC_SITE_URL || 'https://sanity-newsletter.vercel.app'}/{postData.slug?.current || 'untitled'}/
              </div>
            </div>

            {/* Publish Date */}
            <div className="post-editor-setting-group">
              <label>Publish date</label>
              <div className="post-editor-date-time-row">
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="post-editor-date-input"
                />
                <input
                  type="time"
                  value={publishTime}
                  onChange={(e) => setPublishTime(e.target.value)}
                  className="post-editor-time-input"
                />
                <span className="post-editor-timezone">CST</span>
              </div>
            </div>

            {/* Tags */}
            <div className="post-editor-setting-group">
              <label>Tags</label>
              <Select
                isMulti
                options={tagOptions}
                value={tagOptions.filter(opt => selectedTagIds.includes(opt.value))}
                onChange={(selected) => setSelectedTagIds(selected ? selected.map(s => s.value) : [])}
                className="post-editor-select"
                classNamePrefix="react-select"
                placeholder="Select tags..."
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: '#f1f3f4',
                    borderColor: 'transparent',
                    minHeight: '36px',
                    color: '#15171a',
                    outline: 'none',
                    borderRadius: '8px',
                    placeholder: {
                      color: '#7c8b9a',
                    },
                  }),
                  menu: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderColor: 'transparent',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? '#f1f3f4' : state.isSelected ? '#30cf43' : '#ffffff',
                    color: '#15171a',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    
                    backgroundColor: '#ffbd59',
                  }),
                  multiValue: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#f1f3f4',
                  }),
                  multiValueLabel: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px 0 0 4px',
                    padding: '4px 4px 4px 8px',
                    borderBottom: '1px solid #e6e9eb',
                    borderTop: '1px solid #e6e9eb',
                    borderLeft: '1px solid #e6e9eb',
                  }),
                  multiValueRemove: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderRadius: '0 4px 4px 0',
                    padding: '4px 4px',
                    borderBottom: '1px solid #e6e9eb',
                    borderTop: '1px solid #e6e9eb',
                    borderRight: '1px solid #e6e9eb',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: '#15171a',
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: '#ffffff',
                  }),
                }}
              />
            </div>

            {/* Post Access */}
            <div className="post-editor-setting-group">
              <label>Post access</label>
              <Select
                options={[
                  { value: 'public', label: 'Public' },
                  { value: 'members', label: 'Members only' },
                ]}
                value={{ value: postData.postAccess || 'public', label: postData.postAccess === 'members' ? 'Members only' : 'Public' }}
                onChange={(option) => setPostData({
                  ...postData,
                  postAccess: option?.value as 'public' | 'members'
                })}
                className="post-editor-select"
                classNamePrefix="react-select"
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: '#f1f3f4',
                    borderColor: 'transparent',
                    minHeight: '36px',
                    color: '#15171a',
                    outline: 'none',
                    borderRadius: '8px',
                    placeholder: {
                      color: '#7c8b9a',
                    },
                  }),
                  menu: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderColor: 'transparent',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? '#f1f3f4' : state.isSelected ? '#f1f3f4' : '#ffffff',
                    color: '#15171a',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: '#15171a',
                  }),
                  multiValue: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#f1f3f4',
                  }),
                  multiValueLabel: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px 0 0 4px',
                    padding: '4px 4px 4px 8px',
                    borderBottom: '1px solid #e6e9eb',
                    borderTop: '1px solid #e6e9eb',
                    borderLeft: '1px solid #e6e9eb',
                  }),
                  multiValueRemove: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderRadius: '0 4px 4px 0',
                    padding: '4px 4px',
                    borderBottom: '1px solid #e6e9eb',
                    borderTop: '1px solid #e6e9eb',
                    borderRight: '1px solid #e6e9eb',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: '#15171a',
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: '#ffffff',
                  }),
                }}
              />
            </div>

            {/* Authors */}
            <div className="post-editor-setting-group">
              <label>Authors</label>
              <Select
                isMulti
                options={authorOptions}
                value={authorOptions.filter(opt => selectedAuthorIds.includes(opt.value))}
                onChange={(selected) => setSelectedAuthorIds(selected ? selected.map(s => s.value) : [])}
                className="post-editor-select"
                classNamePrefix="react-select"
                placeholder="Select authors..."
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: '#f1f3f4',
                    borderColor: 'transparent',
                    minHeight: '36px',
                    color: '#15171a',
                    outline: 'none',
                    borderRadius: '8px',
                    placeholder: {
                      color: '#7c8b9a',
                    },
                  }),
                  menu: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderColor: 'transparent',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? '#f1f3f4' : state.isSelected ? '#30cf43' : '#ffffff',
                    color: '#15171a',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    
                    backgroundColor: '#ffbd59',
                  }),
                  multiValue: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#f1f3f4',
                  }),
                  multiValueLabel: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px 0 0 4px',
                    padding: '4px 4px 4px 8px',
                    borderBottom: '1px solid #e6e9eb',
                    borderTop: '1px solid #e6e9eb',
                    borderLeft: '1px solid #e6e9eb',
                  }),
                  multiValueRemove: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderRadius: '0 4px 4px 0',
                    padding: '4px 4px',
                    borderBottom: '1px solid #e6e9eb',
                    borderTop: '1px solid #e6e9eb',
                    borderRight: '1px solid #e6e9eb',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: '#15171a',
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: '#ffffff',
                  }),
                }}
              />
            </div>

            {/* Template */}
            <div className="post-editor-setting-group">
              <label>Template</label>
              <Select
                options={[
                  { value: 'default', label: 'Default' },
                ]}
                value={{ value: postData.template || 'default', label: 'Default' }}
                onChange={(option) => setPostData({
                  ...postData,
                  template: option?.value || 'default'
                })}
                className="post-editor-select"
                classNamePrefix="react-select"
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: '#f1f3f4',
                    borderColor: 'transparent',
                    minHeight: '36px',
                    color: '#15171a',
                    outline: 'none',
                    borderRadius: '8px',
                    placeholder: {
                      color: '#7c8b9a',
                    },
                  }),
                  menu: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderColor: 'transparent',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? '#f1f3f4' : state.isSelected ? '#f1f3f4' : '#ffffff',
                    color: '#15171a',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: '#15171a',
                  }),
                  multiValue: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#f1f3f4',
                  }),
                  multiValueLabel: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px 0 0 4px',
                    padding: '4px 4px 4px 8px',
                    borderBottom: '1px solid #e6e9eb',
                    borderTop: '1px solid #e6e9eb',
                    borderLeft: '1px solid #e6e9eb',
                  }),
                  multiValueRemove: (provided) => ({
                    ...provided,
                    color: '#15171a',
                    backgroundColor: '#ffffff',
                    borderRadius: '0 4px 4px 0',
                    padding: '4px 4px',
                    borderBottom: '1px solid #e6e9eb',
                    borderTop: '1px solid #e6e9eb',
                    borderRight: '1px solid #e6e9eb',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: '#15171a',
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: '#ffffff',
                  }),
                }}
              />
            </div>

            {/* Feature this post */}
            <div className="post-editor-setting-group" style={{ paddingTop: '16px', borderTop: '1px solid #e6e9eb' }}>
              <div className="post-editor-toggle-setting">
                <label>Feature this post</label>
                <button
                  className={`post-editor-toggle ${postData.isFeatured ? 'on' : ''}`}
                  onClick={() => setPostData({ ...postData, isFeatured: !postData.isFeatured })}
                >
                  <div className="post-editor-toggle-slider"></div>
                </button>
              </div>
            </div>

            {/* Expandable Sections */}
            <div className="post-editor-expandable-section">
              <button
                className="post-editor-expandable-header"
                onClick={() => toggleSection('history')}
              >
                <span>Post history</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={expandedSections.has('history') ? 'expanded' : ''}
                >
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            <div className="post-editor-expandable-section">
              <button
                className="post-editor-expandable-header"
                onClick={() => toggleSection('code')}
              >
                <span>Code injection</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={expandedSections.has('code') ? 'expanded' : ''}
                >
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            <div className="post-editor-expandable-section">
              <button
                className="post-editor-expandable-header"
                onClick={() => toggleSection('meta')}
              >
                <span>Meta data</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={expandedSections.has('meta') ? 'expanded' : ''}
                >
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            <div className="post-editor-expandable-section">
              <button
                className="post-editor-expandable-header"
                onClick={() => toggleSection('xcard')}
              >
                <span>X card</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={expandedSections.has('xcard') ? 'expanded' : ''}
                >
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Delete Post */}
            <div className="post-editor-setting-group" style={{ 
              paddingTop: '24px', 
              borderTop: '1px solid #e6e9eb',
              marginTop: '16px'
            }}>
              <label style={{ color: '#dc3545', fontWeight: '600', marginBottom: '12px' }}>
                Danger Zone
              </label>
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#dc3545',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.opacity = '0.9'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.opacity = '1'
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                {currentPostId ? 'Delete Post' : 'Clear Content'}
              </button>
              {currentPostId && (
                <p style={{ 
                  marginTop: '8px', 
                  fontSize: '12px', 
                  color: '#738a94',
                  lineHeight: '1.4'
                }}>
                  Permanently delete this post. This action cannot be undone.
                </p>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Publish Modal */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        postId={currentPostId || postData._id}
        onContinue={async (options) => {
          // Handle scheduling if needed
          if (options.scheduleType === 'later' && options.scheduledDate && options.scheduledTime) {
            const scheduledDateTime = new Date(`${options.scheduledDate}T${options.scheduledTime}`)
            setPublishDate(options.scheduledDate)
            setPublishTime(options.scheduledTime)
          }
          
          // If publishOnly, still save the post
          if (options.publishType === 'publishOnly') {
            await handleSave(true)
          }
          
          // Modal will handle publishing and email sending internally
        }}
      />
      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        postData={postData}
        authors={authors}
        tags={tags}
      />
    </div>
  )
}

