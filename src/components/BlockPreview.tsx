import React from 'react'
import { urlFor } from '../lib/image'

interface BlockPreviewProps {
  block: any
}

export function BlockPreview({ block }: BlockPreviewProps) {
  if (!block || !block._type) return null

  switch (block._type) {
    case 'dividerBlock':
      return <DividerBlockPreview data={block} />
    
    case 'calloutBlock':
      return <CalloutBlockPreview data={block} />
    
    case 'bookmarkBlock':
      return <BookmarkBlockPreview data={block} />
    
    case 'singleImageObject':
      return <SingleImagePreview data={block} />
    
    case 'videoObject':
      return <VideoPreview data={block} />
    
    case 'heroBlock':
      return <HeroBlockPreview data={block} />
    
    case 'featuredBlock':
      return <FeaturedBlockPreview data={block} />
    
    case 'postListingBlock':
      return <PostListingBlockPreview data={block} />
    
    case 'signupBlock':
      return <SignupBlockPreview data={block} />
    
    case 'callToActionObject':
      return <CallToActionPreview data={block} />
    
    case 'contentAccessBlock':
      return <ContentAccessBlockPreview data={block} />
    
    default:
      return (
        <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '4px', color: '#738a94' }}>
          <strong>{block._type}</strong> - Preview not available
        </div>
      )
  }
}

// Divider Block Preview
function DividerBlockPreview({ data }: { data: any }) {
  return (
      <hr/>
  )
}

// Callout Block Preview
function CalloutBlockPreview({ data }: { data: any }) {
  const text = data.text || ''
  const enableEmoji = data.enableEmoji || false
  const bgColor = data.backgroundColor?.value || '#f0a50f21'
  const textColor = data.textColor?.value || '#333'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        borderRadius: '8px',
        margin: '24px 0',
        backgroundColor: bgColor,
        color: textColor
      }}
    >
      {enableEmoji && (
        <span style={{ fontSize: '24px' }}>🔒</span>
      )}
      <p style={{ margin: 0, fontSize: '16px' }}>{text}</p>
    </div>
  )
}

// Bookmark Block Preview
function BookmarkBlockPreview({ data }: { data: any }) {
  const linkType = data.linkType || 'external'
  const externalLink = data.externalLink || ''
  const hideExcerpt = data.hideExcerpt || false

  let title = 'Bookmark'
  let description = ''
  let href = '#'

  if (linkType === 'external' && externalLink) {
    try {
      const url = new URL(externalLink)
      title = url.hostname.replace('www.', '')
      href = externalLink
    } catch (e) {
      title = externalLink
      href = externalLink
    }
  }

  return (
    <figure style={{
      margin: '24px 0',
      border: '1px solid #e6e9eb',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <a
        href={href}
        target={linkType === 'external' ? '_blank' : '_self'}
        rel={linkType === 'external' ? 'noopener noreferrer' : undefined}
        style={{
          display: 'flex',
          textDecoration: 'none',
          color: 'inherit'
        }}
      >
        <div style={{ flex: 1, padding: '16px' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>{title}</div>
          {!hideExcerpt && description && (
            <div style={{ fontSize: '14px', color: '#738a94', marginBottom: '8px' }}>
              {description}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#738a94' }}>
            {linkType === 'external' ? externalLink : 'Internal link'}
          </div>
        </div>
      </a>
    </figure>
  )
}

// Single Image Preview
function SingleImagePreview({ data }: { data: any }) {
  const image = data.image
  const caption = image?.caption || ''

  if (!image?.asset) {
    return (
      <div style={{
        padding: '40px',
        background: '#f1f3f4',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#738a94',
        margin: '24px 0'
      }}>
        No image
      </div>
    )
  }

  const imageUrl = urlFor(image).width(800).url()

  return (
    <div style={{ margin: '24px 0' }}>
      <div style={{
        padding: '16px',
        border: '1px dashed #e6e9eb',
        borderRadius: '12px'
      }}>
        <img
          src={imageUrl}
          alt={image?.altText || caption || 'Image'}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
        {caption && (
          <figcaption style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#738a94',
            marginTop: '8px'
          }}>
            {caption}
          </figcaption>
        )}
      </div>
    </div>
  )
}

// Video Preview
function VideoPreview({ data }: { data: any }) {
  const videoUrl = data.videoUrl || ''
  const title = data.title || ''

  if (!videoUrl) {
    return (
      <div style={{
        padding: '40px',
        background: '#f1f3f4',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#738a94',
        margin: '24px 0'
      }}>
        No video URL
      </div>
    )
  }

  return (
    <div style={{ margin: '24px 0' }}>
      {title && <h3 style={{ marginBottom: '12px' }}>{title}</h3>}
      <div style={{
        position: 'relative',
        paddingBottom: '56.25%',
        height: 0,
        overflow: 'hidden',
        borderRadius: '8px',
        background: '#000'
      }}>
        <iframe
          src={videoUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          allowFullScreen
        />
      </div>
    </div>
  )
}

// Hero Block Preview
function HeroBlockPreview({ data }: { data: any }) {
  const title = data.title || 'Hero Block'
  const showForm = data.showForm !== false

  return (
    <div style={{
      padding: '48px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '8px',
      textAlign: 'center',
      color: '#ffffff',
      margin: '24px 0'
    }}>
      <h1 style={{ margin: '0 0 16px 0', fontSize: '32px' }}>{title}</h1>
      {showForm && (
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px'
        }}>
          <input
            type="email"
            placeholder="Enter your email"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: 'none',
              marginBottom: '8px'
            }}
            disabled
          />
          <button
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: 'none',
              background: '#30cf43',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'default'
            }}
            disabled
          >
            Subscribe
          </button>
        </div>
      )}
    </div>
  )
}

// Featured Block Preview
function FeaturedBlockPreview({ data }: { data: any }) {
  const title = data.title || 'Featured Posts'
  const maxPosts = data.maxPosts || 3
  const hideImages = data.hideImages || false
  const hideTitles = data.hideTitles || false

  return (
    <div style={{ margin: '24px 0' }}>
      {title && <h2 style={{ marginBottom: '16px' }}>{title}</h2>}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {Array.from({ length: Math.min(maxPosts, 3) }).map((_, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #e6e9eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            {!hideImages && (
              <div style={{
                width: '100%',
                height: '150px',
                background: '#f1f3f4'
              }} />
            )}
            {!hideTitles && (
              <div style={{ padding: '12px' }}>
                <div style={{
                  height: '16px',
                  background: '#e6e9eb',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }} />
                <div style={{
                  height: '12px',
                  background: '#f1f3f4',
                  borderRadius: '4px',
                  width: '60%'
                }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Post Listing Block Preview
function PostListingBlockPreview({ data }: { data: any }) {
  const maxPosts = data.maxPosts || 5
  const showReadTime = data.showReadTime !== false
  const showDate = data.showDate !== false
  const showLoadMore = data.showLoadMore || false

  return (
    <div style={{ margin: '24px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array.from({ length: Math.min(maxPosts, 5) }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '16px',
              padding: '16px',
              border: '1px solid #e6e9eb',
              borderRadius: '8px'
            }}
          >
            <div style={{
              width: '120px',
              height: '80px',
              background: '#f1f3f4',
              borderRadius: '4px',
              flexShrink: 0
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: '20px',
                background: '#e6e9eb',
                borderRadius: '4px',
                marginBottom: '8px',
                width: '80%'
              }} />
              <div style={{
                height: '14px',
                background: '#f1f3f4',
                borderRadius: '4px',
                marginBottom: '8px',
                width: '100%'
              }} />
              {(showReadTime || showDate) && (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '12px',
                  color: '#738a94',
                  marginTop: '8px'
                }}>
                  {showDate && <span>Jan 1, 2024</span>}
                  {showReadTime && <span>5 min read</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {showLoadMore && (
          <button
            style={{
              padding: '12px',
              border: '1px solid #e6e9eb',
              borderRadius: '4px',
              background: '#ffffff',
              cursor: 'pointer',
              marginTop: '8px'
            }}
            disabled
          >
            Load more
          </button>
        )}
      </div>
    </div>
  )
}

// Signup Block Preview
function SignupBlockPreview({ data }: { data: any }) {
  const title = data.title || 'Subscribe to our newsletter'
  const alignment = data.alignment || 'left'
  const buttonLabel = data.buttonLabel || 'Subscribe'

  return (
    <div style={{
      padding: '32px',
      background: '#f8f9fa',
      borderRadius: '8px',
      margin: '24px 0',
      textAlign: alignment
    }}>
      <h2 style={{ margin: '0 0 16px 0' }}>{title}</h2>
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
        flexWrap: 'wrap'
      }}>
        <input
          type="email"
          placeholder="Enter your email"
          style={{
            padding: '10px 16px',
            borderRadius: '4px',
            border: '1px solid #e6e9eb',
            minWidth: '200px'
          }}
          disabled
        />
        <button
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            border: 'none',
            background: '#30cf43',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'default'
          }}
          disabled
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

// Call to Action Preview
function CallToActionPreview({ data }: { data: any }) {
  const title = data.callToActionTitle || 'Call to Action'
  const paragraph = data.callToActionParagraph || ''
  const buttons = data.buttons || []

  return (
    <div style={{
      padding: '32px',
      background: '#f8f9fa',
      borderRadius: '8px',
      margin: '24px 0',
      textAlign: 'center'
    }}>
      <h2 style={{ margin: '0 0 12px 0' }}>{title}</h2>
      {paragraph && <p style={{ margin: '0 0 20px 0', color: '#738a94' }}>{paragraph}</p>}
      {buttons.length > 0 ? (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {buttons.map((button: any, i: number) => (
            <button
              key={i}
              style={{
                padding: '10px 20px',
                borderRadius: '4px',
                border: 'none',
                background: button.primary ? '#30cf43' : '#ffffff',
                color: button.primary ? '#ffffff' : '#15171a',
                borderColor: button.primary ? '#30cf43' : '#e6e9eb',
                borderWidth: '1px',
                borderStyle: 'solid',
                fontWeight: 600,
                cursor: 'default'
              }}
              disabled
            >
              {button.label || 'Button'}
            </button>
          ))}
        </div>
      ) : (
        <button
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            border: 'none',
            background: '#30cf43',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'default'
          }}
          disabled
        >
          Learn More
        </button>
      )}
    </div>
  )
}

// Content Access Block Preview
function ContentAccessBlockPreview({ data }: { data: any }) {
  const accessLevel = data.accessLevel || 'membersOnly'

  return (
    <div style={{
      padding: '24px',
      background: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '8px',
      margin: '24px 0',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '18px', marginBottom: '8px' }}>🔒</div>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
        {accessLevel === 'membersOnly' ? 'Members Only Content' : 'Content Access Block'}
      </div>
      <div style={{ fontSize: '14px', color: '#738a94' }}>
        This content is restricted to {accessLevel === 'membersOnly' ? 'members' : 'subscribers'}
      </div>
    </div>
  )
}

