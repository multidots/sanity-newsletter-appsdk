import React, { useState, useEffect } from 'react'
import '../css/PreviewModal.css'
import { urlFor } from '../lib/image'
import { BlockPreview } from './BlockPreview'
import { generateEmailTemplate, generateEmailText } from '../lib/email-template'
import { sanityClient } from '../lib/sanity-client'

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  postData?: {
    _id?: string
    title?: string
    excerpt?: string
    image?: {
      asset?: any
      altText?: string
    }
    pageBuilder?: any[]
    author?: Array<{
      _ref: string
    }>
    tag?: Array<{
      _ref: string
    }>
    publishedAt?: string
    _createdAt?: string
  }
  pageData?: {
    _id?: string
    title?: string
    excerpt?: string
    image?: {
      asset?: any
      altText?: string
    }
    pageBuilder?: any[]
    author?: Array<{
      _ref: string
    }>
    tag?: Array<{
      _ref: string
    }>
    publishedAt?: string
    _createdAt?: string
  }
  authors?: Array<{
    _id: string
    name?: string
  }>
  tags?: Array<{
    _id: string
    title?: string
    slug?: {
      current?: string
    }
    tagColor?: any
  }>
}

export function PreviewModal({ isOpen, onClose, postData, pageData, authors, tags }: PreviewModalProps) {
  // Use postData or pageData (for pages)
  const data = postData || pageData
  const isPage = !!pageData // Determine if this is a page (not a post)
  
  const [previewType, setPreviewType] = useState<'web' | 'email'>('web')
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop')
  const [emailHtml, setEmailHtml] = useState<string>('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [siteSettings, setSiteSettings] = useState<any>(null)
  const [webIframeLoading, setWebIframeLoading] = useState(true)
  
  // Reset preview type to 'web' if it's a page and currently set to 'email'
  useEffect(() => {
    if (isPage && previewType === 'email') {
      setPreviewType('web')
    }
  }, [isPage, previewType])
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanity-newsletter.vercel.app'
  const previewUrl = data?._id ? `${siteUrl}/p/${data._id}` : null

  // Fetch siteSettings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSiteSettings()
      // Reset iframe loading when switching to web preview
      if (previewType === 'web') {
        setWebIframeLoading(true)
      }
    }
  }, [isOpen])

  // Reset iframe loading when switching preview type
  useEffect(() => {
    if (previewType === 'web') {
      setWebIframeLoading(true)
    }
  }, [previewType, data?._id])

  // Generate email HTML when switching to email preview or when data changes (only for posts)
  useEffect(() => {
    if (isOpen && previewType === 'email' && !isPage && data && siteSettings) {
      generateEmailHtml()
    }
  }, [isOpen, previewType, isPage, data, siteSettings])

  const fetchSiteSettings = async () => {
    try {
      const settings = await sanityClient.fetch(`
        *[_type == "generalSettings"][0]{
          siteTitle,
          "siteLogoUrl": siteLogo.asset->url,
          siteLogo{
            altText
          },
          companyEmailAddress,
          companyPhoneNumber,
          companySocialMediaLinks[]{
            title,
            profileUrl,
            "iconUrl": icon.asset->url
          },
          footerCopyright,
          footerLogo{
            altText,
            "url": asset->url,
            link,
            target
          }
        }
      `)
      setSiteSettings(settings || {})
    } catch (error) {
      console.error('Error fetching site settings:', error)
      setSiteSettings({})
    }
  }

  const generateEmailHtml = async () => {
    if (!data || !siteSettings) return

    setEmailLoading(true)
    try {
      // Fetch internalLinkData for bookmark blocks
      const processedPageBuilder = await Promise.all(
        (data.pageBuilder || []).map(async (block: any) => {
          if (block._type === 'bookmarkBlock' && block.linkType === 'internal' && block.internalLink?._ref && !block.internalLinkData) {
            try {
              const internalLinkData = await sanityClient.fetch(`
                *[_id == $id][0]{
                  _id,
                  _type,
                  title,
                  "textSnippet": pt::text(pageBuilder[0..4]),
                  "slug": slug.current,
                  excerpt,
                  "imageUrl": coalesce(
                    image.asset->url,
                    featuredImage.asset->url
                  ),
                  image{
                    altText,
                    caption
                  },
                  featuredImage{
                    altText,
                    "url": asset->url
                  },
                  author[]->{
                    _id,
                    name,
                    "slug": slug.current,
                    "image": avatar.asset->url
                  },
                  tag[]->{
                    _id,
                    title,
                    "slug": slug.current,
                    tagColor
                  }
                }
              `, { id: block.internalLink._ref })
              
              return {
                ...block,
                internalLinkData: internalLinkData || null
              }
            } catch (error) {
              console.error('Error fetching internalLinkData:', error)
              return block
            }
          }
          return block
        })
      )

      // Transform data to match the structure expected by generateEmailTemplate
      const transformedPost = {
        _id: data._id || '',
        _type: postData ? 'post' : 'page',
        title: data.title || '',
        slug: { current: '' },
        excerpt: data.excerpt || '',
        imageUrl: data.image?.asset ? urlFor(data.image).url() : null,
        image: data.image || null,
        pageBuilder: processedPageBuilder,
        author: (data.author || []).map((authorRef: any) => {
          const author = authors?.find(a => a && (a._id === authorRef?._ref || a._id === authorRef?._id))
          return author ? {
            _id: author._id,
            name: author.name || '',
            image: null,
          } : null
        }).filter(Boolean),
        tag: (data.tag || []).map((tagRef: any) => {
          const tag = tags?.find(t => t && (t._id === tagRef?._ref || t._id === tagRef?._id))
          return tag ? {
            _id: tag._id,
            title: tag.title || '',
            slug: tag.slug || { current: '' },
            tagColor: tag.tagColor || null,
          } : {
            _id: tagRef?._ref || tagRef?._id || '',
            title: '',
            slug: { current: '' },
            tagColor: null,
          }
        }),
        isFeatured: false,
        seo: {
          title: data.title || '',
          description: data.excerpt || '',
          noIndex: false,
          image: null,
        },
        _createdAt: data._createdAt || data.publishedAt || new Date().toISOString(),
        _updatedAt: data.publishedAt || new Date().toISOString(),
      }

      const result = {
        post: transformedPost,
        siteSettings: siteSettings,
      }

      const html = await generateEmailTemplate({ result })
      setEmailHtml(html)
    } catch (error) {
      console.error('Error generating email template:', error)
      setEmailHtml('<p>Error generating email preview. Please try again.</p>')
    } finally {
      setEmailLoading(false)
    }
  }

  if (!isOpen) return null

  const author = authors?.find(a => a && data?.author?.[0]?._ref === a._id)
  const formattedDate = data?.publishedAt 
    ? new Date(data.publishedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : data?._createdAt
    ? new Date(data._createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

  const plainText =
    data?.pageBuilder
      ?.map((block: any) =>
        block.children?.map((child: any) => child.text).join(' ')
      )
      .join(' ') || ''

  const words = plainText.split(/\s+/).filter(word => word.length > 0).length
  const minutesToRead = Math.max(1, Math.ceil(words / 200))

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="preview-modal-header">
          <div className="preview-modal-header-left">
            <h2 className="preview-modal-title">Preview</h2>
            <div className="preview-modal-tabs">
              <button
                className={`preview-modal-tab ${previewType === 'web' ? 'active' : ''}`}
                onClick={() => setPreviewType('web')}
              >
                Web
              </button>
              {!isPage && (
                <button
                  className={`preview-modal-tab ${previewType === 'email' ? 'active' : ''}`}
                  onClick={() => setPreviewType('email')}
                >
                  Email
                </button>
              )}
            </div>
          </div>
          <div className="preview-modal-header-right">
            <div className="preview-modal-device-options">
              <button
                className={`preview-modal-device-button ${deviceView === 'desktop' ? 'active' : ''}`}
                onClick={() => setDeviceView('desktop')}
                title="Desktop view"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </button>
              <button
                className={`preview-modal-device-button ${deviceView === 'mobile' ? 'active' : ''}`}
                onClick={() => setDeviceView('mobile')}
                title="Mobile view"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </button>
            </div>
            <button className="preview-modal-close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className={`preview-modal-content ${previewType === 'email' ? 'email-preview' : 'web-preview'}`}>
          <div className={`preview-modal-preview-wrapper ${deviceView}`}>
            {previewType === 'web' ? (
              <div className="preview-web-content">
                {webIframeLoading && (
                  <div className="preview-web-loading">
                    <div className="preview-web-loading-spinner"></div>
                    <p>Loading preview...</p>
                  </div>
                )}
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="preview-web-iframe"
                    title="Web Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: webIframeLoading ? 'none' : 'block',
                    }}
                    onLoad={() => setWebIframeLoading(false)}
                    onError={() => setWebIframeLoading(false)}
                  />
                ) : (
                  <div className="preview-web-empty">
                    <p>Page/Post ID is required for preview.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="preview-email-content">
                <div className="preview-email-header">
                  <div className="preview-email-from">
                    <span className="preview-email-label">From:</span>
                    <span className="preview-email-value">WP for ENTERPRISES &lt;wp-for-enterprises@ghost.io&gt;</span>
                    <button className="preview-email-test-button" title="Send test email">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </button>
                  </div>
                  <div className="preview-email-subject">
                    <span className="preview-email-label">Subject:</span>
                    <span className="preview-email-value">{data?.title || 'Untitled'}</span>
                    <button className="preview-email-options-button" title="Options">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="preview-email-body-wrapper">
                  {emailLoading ? (
                    <div className="preview-email-loading">
                      <div className="preview-email-loading-spinner"></div>
                      <p>Generating email preview...</p>
                    </div>
                  ) : emailHtml ? (
                    <iframe
                      srcDoc={emailHtml}
                      className="preview-email-iframe"
                      title="Email Preview"
                      style={{
                        width: '100%',
                        border: 'none',
                        minHeight: '600px',
                      }}
                    />
                  ) : (
                    <div className="preview-email-empty">
                      <p>Unable to generate email preview.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


