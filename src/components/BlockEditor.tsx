import React from 'react'
import { urlFor } from '../lib/image'
import { sanityClient } from '../lib/sanity-client'

interface BlockEditorProps {
  block: any
  onUpdate: (updates: any) => void
  onUploadImage?: (file: File) => Promise<void>
}

export function BlockEditor({ block, onUpdate, onUploadImage }: BlockEditorProps) {
  if (!block || !block._type) return null

  const handleFieldChange = (field: string, value: any) => {
    onUpdate({ [field]: value })
  }

  const handleNestedFieldChange = (field: string, nestedField: string, value: any) => {
    onUpdate({
      [field]: {
        ...(block[field] || {}),
        [nestedField]: value
      }
    })
  }

  switch (block._type) {
    // case 'dividerBlock':
    //   return <DividerBlockEditor block={block} onUpdate={onUpdate} />
    
    case 'calloutBlock':
      return <CalloutBlockEditor block={block} onUpdate={onUpdate} />
    
    case 'bookmarkBlock':
      return <BookmarkBlockEditor block={block} onUpdate={onUpdate} />
    
    case 'singleImageObject':
      return <SingleImageEditor block={block} onUpdate={onUpdate} onUploadImage={onUploadImage} />
    
    case 'videoObject':
      return <VideoEditor block={block} onUpdate={onUpdate} />
    
    case 'heroBlock':
      return <HeroBlockEditor block={block} onUpdate={onUpdate} />
    
    case 'featuredBlock':
      return <FeaturedBlockEditor block={block} onUpdate={onUpdate} />
    
    case 'postListingBlock':
      return <PostListingBlockEditor block={block} onUpdate={onUpdate} />
    
    case 'signupBlock':
      return <SignupBlockEditor block={block} onUpdate={onUpdate} />
    
    case 'callToActionObject':
      return <CallToActionEditor block={block} onUpdate={onUpdate} />
    
    case 'contentAccessBlock':
      return <ContentAccessBlockEditor block={block} onUpdate={onUpdate} />
    
    default:
      return (
        <div className="post-editor-component-block">
          <div className="post-editor-field">
            <label>Block Type</label>
            <input type="text" value={block._type || ''} disabled />
          </div>
          <div className="post-editor-field">
            <label>JSON Data</label>
            <textarea
              value={JSON.stringify(block, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  onUpdate(parsed)
                } catch (err) {
                  // Invalid JSON
                }
              }}
              rows={10}
            />
          </div>
        </div>
      )
  }
}

// // Divider Block Editor
// function DividerBlockEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
//   return (
//     <div className="post-editor-component-block">
//       <div className="post-editor-field">
//         <label>Style</label>
//         <select
//           value={block.style || 'default'}
//           onChange={(e) => onUpdate({ style: e.target.value })}
//         >
//           <option value="default">Default</option>
//           <option value="solid">Solid</option>
//           <option value="dashed">Dashed</option>
//           <option value="dotted">Dotted</option>
//         </select>
//       </div>
//       <div className="post-editor-field">
//         <label>Thickness</label>
//         <input
//           type="number"
//           min="1"
//           max="10"
//           value={block.thickness || 1}
//           onChange={(e) => onUpdate({ thickness: parseInt(e.target.value) || 1 })}
//         />
//       </div>
//       <div className="post-editor-field">
//         <label>Color</label>
//         <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
//           <input
//             type="color"
//             value={block.color?.value || block.color || '#e5e7eb'}
//             onChange={(e) => onUpdate({ color: { label: e.target.value, value: e.target.value } })}
//           />
//           <input
//             type="text"
//             className="post-editor-color-text-input"
//             value={block.color?.value || block.color || '#e5e7eb'}
//             onChange={(e) => onUpdate({ color: { label: e.target.value, value: e.target.value } })}
//             placeholder="#e5e7eb"
//           />
//         </div>
//       </div>
//       <div className="post-editor-field">
//         <label>Width</label>
//         <input
//           type="text"
//           value={block.width || '100%'}
//           onChange={(e) => onUpdate({ width: e.target.value })}
//           placeholder="100%"
//         />
//       </div>
//       <div className="post-editor-field">
//         <label>Alignment</label>
//         <select
//           value={block.align || 'center'}
//           onChange={(e) => onUpdate({ align: e.target.value })}
//         >
//           <option value="center">Center</option>
//           <option value="left">Left</option>
//           <option value="right">Right</option>
//         </select>
//       </div>
//     </div>
//   )
// }

// Callout Block Editor
function CalloutBlockEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Text</label>
        <textarea
          value={block.text || ''}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Enter callout text"
          rows={3}
        />
      </div>
      <div className="post-editor-field">
        <div className="post-editor-toggle-setting">
          <label>Enable Emoji</label>
          <button
            className={`post-editor-toggle ${block.enableEmoji ? 'on' : ''}`}
            onClick={() => onUpdate({ enableEmoji: !block.enableEmoji })}
          >
            <div className="post-editor-toggle-slider"></div>
          </button>
        </div>
      </div>
      <div className="post-editor-field">
        <label>Background Color</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            value={block.backgroundColor?.value || '#f0a50f21'}
            onChange={(e) => onUpdate({ backgroundColor: { label: e.target.value, value: e.target.value } })}
          />
          <input
            type="text"
            className="post-editor-color-text-input"
            value={block.backgroundColor?.value || '#f0a50f21'}
            onChange={(e) => onUpdate({ backgroundColor: { label: e.target.value, value: e.target.value } })}
            placeholder="#f0a50f21"
          />
        </div>
      </div>
      <div className="post-editor-field">
        <label>Text Color</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            value={block.textColor?.value || '#333'}
            onChange={(e) => onUpdate({ textColor: { label: e.target.value, value: e.target.value } })}
          />
          <input
            type="text"
            className="post-editor-color-text-input"
            value={block.textColor?.value || '#333'}
            onChange={(e) => onUpdate({ textColor: { label: e.target.value, value: e.target.value } })}
            placeholder="#333"
          />
        </div>
      </div>
    </div>
  )
}

// Bookmark Block Editor
function BookmarkBlockEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Link Type</label>
        <select
          value={block.linkType || 'external'}
          onChange={(e) => onUpdate({ linkType: e.target.value })}
        >
          <option value="external">External</option>
          <option value="internal">Internal</option>
        </select>
      </div>
      {block.linkType === 'external' ? (
        <div className="post-editor-field">
          <label>External Link</label>
          <input
            type="url"
            value={block.externalLink || ''}
            onChange={(e) => onUpdate({ externalLink: e.target.value })}
            placeholder="https://example.com"
          />
        </div>
      ) : (
        <div className="post-editor-field">
          <label>Internal Link (Reference ID)</label>
          <input
            type="text"
            value={block.internalLink?._ref || ''}
            onChange={(e) => onUpdate({
              internalLink: e.target.value ? {
                _ref: e.target.value,
                _type: 'reference'
              } : undefined
            })}
            placeholder="Post or page ID"
          />
        </div>
      )}
      <div className="post-editor-field">
        <div className="post-editor-toggle-setting">
          <label>Hide Excerpt</label>
          <button
            className={`post-editor-toggle ${block.hideExcerpt ? 'on' : ''}`}
            onClick={() => onUpdate({ hideExcerpt: !block.hideExcerpt })}
          >
            <div className="post-editor-toggle-slider"></div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Single Image Editor
function SingleImageEditor({ block, onUpdate, onUploadImage }: { block: any, onUpdate: (updates: any) => void, onUploadImage?: (file: File) => Promise<void> }) {
  const imageUrl = block.image?.asset ? urlFor(block.image).width(400).url() : null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUploadImage) {
      await onUploadImage(file)
    }
  }

  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Image</label>
        {imageUrl ? (
          <div style={{ marginBottom: '12px' }}>
            <img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }} />
            <label className="post-editor-image-upload-button" style={{ marginTop: '8px', display: 'inline-block' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              Change Image
            </label>
          </div>
        ) : (
          <label className="post-editor-image-upload-button">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            Upload Image
          </label>
        )}
      </div>
      <div className="post-editor-field">
        <label>Caption</label>
        <input
          type="text"
          value={block.image?.caption || ''}
          onChange={(e) => onUpdate({
            image: {
              ...(block.image || {}),
              caption: e.target.value
            }
          })}
          placeholder="Image caption"
        />
      </div>
      <div className="post-editor-field">
        <label>Alt Text</label>
        <input
          type="text"
          value={block.image?.altText || ''}
          onChange={(e) => onUpdate({
            image: {
              ...(block.image || {}),
              altText: e.target.value
            }
          })}
          placeholder="Alt text for image"
        />
      </div>
    </div>
  )
}

// Video Editor
function VideoEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Title</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Video title"
        />
      </div>
      <div className="post-editor-field">
        <label>Video URL</label>
        <input
          type="url"
          value={block.videoUrl || ''}
          onChange={(e) => onUpdate({ videoUrl: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>
    </div>
  )
}

// Hero Block Editor
function HeroBlockEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Title</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Hero title"
        />
      </div>
      <div className="post-editor-field">
        <div className="post-editor-toggle-setting">
          <label>Show Form</label>
          <button
            className={`post-editor-toggle ${block.showForm !== false ? 'on' : ''}`}
            onClick={() => onUpdate({ showForm: block.showForm === false })}
          >
            <div className="post-editor-toggle-slider"></div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Featured Block Editor
function FeaturedBlockEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Title</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Featured block title"
        />
      </div>
      <div className="post-editor-field">
        <label>Max Posts</label>
        <input
          type="number"
          min="1"
          max="10"
          value={block.maxPosts || 3}
          onChange={(e) => onUpdate({ maxPosts: parseInt(e.target.value) || 3 })}
        />
      </div>
      <div className="post-editor-field">
        <div className="post-editor-toggle-setting">
          <label>Hide Images</label>
          <button
            className={`post-editor-toggle ${block.hideImages ? 'on' : ''}`}
            onClick={() => onUpdate({ hideImages: !block.hideImages })}
          >
            <div className="post-editor-toggle-slider"></div>
          </button>
        </div>
      </div>
      <div className="post-editor-field">
        <div className="post-editor-toggle-setting">
          <label>Hide Titles</label>
          <button
            className={`post-editor-toggle ${block.hideTitles ? 'on' : ''}`}
            onClick={() => onUpdate({ hideTitles: !block.hideTitles })}
          >
            <div className="post-editor-toggle-slider"></div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Post Listing Block Editor
function PostListingBlockEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Max Posts</label>
        <input
          type="number"
          min="1"
          max="20"
          value={block.maxPosts || 5}
          onChange={(e) => onUpdate({ maxPosts: parseInt(e.target.value) || 5 })}
        />
      </div>
      <div className="post-editor-field">
        <div className="post-editor-toggle-setting">
          <label>Show Read Time</label>
          <button
            className={`post-editor-toggle ${block.showReadTime !== false ? 'on' : ''}`}
            onClick={() => onUpdate({ showReadTime: block.showReadTime === false })}
          >
            <div className="post-editor-toggle-slider"></div>
          </button>
        </div>
      </div>
      <div className="post-editor-field">
        <div className="post-editor-toggle-setting">
          <label>Show Date</label>
          <button
            className={`post-editor-toggle ${block.showDate !== false ? 'on' : ''}`}
            onClick={() => onUpdate({ showDate: block.showDate === false })}
          >
            <div className="post-editor-toggle-slider"></div>
          </button>
        </div>
      </div>
      <div className="post-editor-field">
        <div className="post-editor-toggle-setting">
          <label>Show Load More</label>
          <button
            className={`post-editor-toggle ${block.showLoadMore ? 'on' : ''}`}
            onClick={() => onUpdate({ showLoadMore: !block.showLoadMore })}
          >
            <div className="post-editor-toggle-slider"></div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Signup Block Editor
function SignupBlockEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Title</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Subscribe to our newsletter"
        />
      </div>
      <div className="post-editor-field">
        <label>Alignment</label>
        <select
          value={block.alignment || 'left'}
          onChange={(e) => onUpdate({ alignment: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div className="post-editor-field">
        <label>Button Label</label>
        <input
          type="text"
          value={block.buttonLabel || 'Subscribe'}
          onChange={(e) => onUpdate({ buttonLabel: e.target.value })}
          placeholder="Subscribe"
        />
      </div>
    </div>
  )
}

// Call to Action Editor
function CallToActionEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  const buttons = block.buttons || []

  const addButton = () => {
    onUpdate({
      buttons: [...buttons, { label: 'Button', primary: false }]
    })
  }

  const updateButton = (index: number, field: string, value: any) => {
    const updated = [...buttons]
    updated[index] = { ...updated[index], [field]: value }
    onUpdate({ buttons: updated })
  }

  const removeButton = (index: number) => {
    onUpdate({ buttons: buttons.filter((_: any, i: number) => i !== index) })
  }

  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Title</label>
        <input
          type="text"
          value={block.callToActionTitle || ''}
          onChange={(e) => onUpdate({ callToActionTitle: e.target.value })}
          placeholder="Call to action title"
        />
      </div>
      <div className="post-editor-field">
        <label>Paragraph</label>
        <textarea
          value={block.callToActionParagraph || ''}
          onChange={(e) => onUpdate({ callToActionParagraph: e.target.value })}
          placeholder="Call to action description"
          rows={3}
        />
      </div>
      <div className="post-editor-field">
        <label>Buttons</label>
        {buttons.map((button: any, index: number) => (
          <div key={index} style={{ marginBottom: '12px', padding: '12px', border: '1px solid #e6e9eb', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong>Button {index + 1}</strong>
              <button
                onClick={() => removeButton(index)}
                style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              value={button.label || ''}
              onChange={(e) => updateButton(index, 'label', e.target.value)}
              placeholder="Button label"
              style={{ width: '100%', marginBottom: '8px', padding: '8px' }}
            />
            <div className="post-editor-toggle-setting">
              <label>Primary Button</label>
              <button
                className={`post-editor-toggle ${button.primary ? 'on' : ''}`}
                onClick={() => updateButton(index, 'primary', !button.primary)}
              >
                <div className="post-editor-toggle-slider"></div>
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addButton}
          style={{ background: '#30cf43', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}
        >
          Add Button
        </button>
      </div>
    </div>
  )
}

// Content Access Block Editor
function ContentAccessBlockEditor({ block, onUpdate }: { block: any, onUpdate: (updates: any) => void }) {
  return (
    <div className="post-editor-component-block">
      <div className="post-editor-field">
        <label>Access Level</label>
        <select
          value={block.accessLevel || 'membersOnly'}
          onChange={(e) => onUpdate({ accessLevel: e.target.value })}
        >
          <option value="membersOnly">Members Only</option>
          <option value="subscribers">Subscribers</option>
        </select>
      </div>
    </div>
  )
}

