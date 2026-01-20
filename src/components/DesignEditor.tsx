import React, { useState, useEffect, useRef } from 'react'
import '../css/DesignEditor.css'
import { sanityClient } from '../lib/sanity-client'
import {urlFor} from '../lib/image'
import { useToast } from '../contexts/ToastContext'
import GoogleFontInput from './GoogleFontInput'

interface DesignEditorProps {
  isOpen: boolean
  onClose: () => void
}

interface SimplerColor {
  _type: 'simplerColor'
  label?: string
  value?: string
}

interface DesignSettings {
  _id?: string
  brandColor?: SimplerColor | string
  typographyHeading?: string
  typographyBody?: string
  siteIcon?: any
  siteLogo?: any
  publicationCover?: any
  navigationLayout?: 'logoLeft' | 'logoMiddle' | 'stacked'
  colorScheme?: 'light' | 'dark'
  whiteLogoForDarkMode?: any
  homepageShowFeatured?: boolean
  homepageFeaturedTitle?: string
  postShowAuthor?: boolean
  postShowRelatedPosts?: boolean
}

export function DesignEditor({ isOpen, onClose }: DesignEditorProps) {
  const [activeTab, setActiveTab] = useState<'brand' | 'theme'>('brand')
  const [designSettings, setDesignSettings] = useState<DesignSettings>({})
  const [localSettings, setLocalSettings] = useState({
    brandColor: { label: 'Custom', value: '#15171a' } as SimplerColor,
    typographyHeading: 'Inter',
    typographyBody: 'Inter',
    navigationLayout: 'logoLeft' as 'logoLeft' | 'logoMiddle' | 'stacked',
    colorScheme: 'light' as 'light' | 'dark',
    homepageShowFeatured: true,
    homepageFeaturedTitle: 'FREE RESOURCES + GUIDES',
    postShowAuthor: true,
    postShowRelatedPosts: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)
  const [iframeError, setIframeError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { showToast } = useToast()
  
  // Image upload state
  const [siteIconFile, setSiteIconFile] = useState<File | null>(null)
  const [siteIconPreview, setSiteIconPreview] = useState<string | null>(null)
  const [siteIconRemoved, setSiteIconRemoved] = useState(false)
  const [siteLogoFile, setSiteLogoFile] = useState<File | null>(null)
  const [siteLogoPreview, setSiteLogoPreview] = useState<string | null>(null)
  const [siteLogoRemoved, setSiteLogoRemoved] = useState(false)
  const [publicationCoverFile, setPublicationCoverFile] = useState<File | null>(null)
  const [publicationCoverPreview, setPublicationCoverPreview] = useState<string | null>(null)
  const [publicationCoverRemoved, setPublicationCoverRemoved] = useState(false)
  
  // File input refs
  const siteIconInputRef = useRef<HTMLInputElement>(null)
  const siteLogoInputRef = useRef<HTMLInputElement>(null)
  const publicationCoverInputRef = useRef<HTMLInputElement>(null)

  // Get site URL from environment or use default
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanity-newsletter.vercel.app'
  
  // Build iframe URL with all design settings as query parameters
  const buildIframeUrl = () => {
    // Use homepage as base URL for design preview
    const baseUrl = siteUrl
    const params = new URLSearchParams()
    
    // Add preview parameter
    params.append('preview', 'true')
    
    // Brand color
    if (localSettings.brandColor?.value) {
      params.append('brandColor', localSettings.brandColor.value)
    }
    
    // Typography
    if (localSettings.typographyHeading) {
      params.append('typographyHeading', localSettings.typographyHeading)
    }
    if (localSettings.typographyBody) {
      params.append('typographyBody', localSettings.typographyBody)
    }
    
    // Navigation layout
    if (localSettings.navigationLayout) {
      params.append('navigationLayout', localSettings.navigationLayout)
    }
    
    // Color scheme
    if (localSettings.colorScheme) {
      params.append('colorScheme', localSettings.colorScheme)
    }
    
    // Homepage settings
    if (localSettings.homepageShowFeatured !== undefined) {
      params.append('homepageShowFeatured', String(localSettings.homepageShowFeatured))
    }
    if (localSettings.homepageFeaturedTitle) {
      params.append('homepageFeaturedTitle', localSettings.homepageFeaturedTitle)
    }
    
    // Post settings
    if (localSettings.postShowAuthor !== undefined) {
      params.append('postShowAuthor', String(localSettings.postShowAuthor))
    }
    if (localSettings.postShowRelatedPosts !== undefined) {
      params.append('postShowRelatedPosts', String(localSettings.postShowRelatedPosts))
    }
    
    const queryString = params.toString()
    return `${baseUrl}?${queryString}`
  }
  
  const iframeUrl = buildIframeUrl()
  
  // Debug: log iframe URL when it changes
  useEffect(() => {
    console.log('Iframe URL updated:', iframeUrl)
  }, [iframeUrl])
  useEffect(() => {
    if (isOpen) {
      fetchDesignSettings()
      // Reset iframe loading state when opening
      setIframeLoading(true)
      setIframeError(false)
    } else {
      // Reset states when closing
      setIframeLoading(false)
      setIframeError(false)
    }
  }, [isOpen])

  // Log site URL for debugging
  useEffect(() => {
    if (isOpen) {
      console.log('Design Editor - Site URL:', siteUrl)
    }
  }, [isOpen, siteUrl])

  // Helper function to normalize brandColor to object format
  const normalizeBrandColor = (color: SimplerColor | string | undefined): SimplerColor => {
    if (!color) {
      return { _type: 'simplerColor', label: 'Custom', value: '#15171a' }
    }
    if (typeof color === 'string') {
      return { _type: 'simplerColor', label: 'Custom', value: color }
    }
    return { _type: 'simplerColor', label: color.label || 'Custom', value: color.value || '#15171a' }
  }

  // Track if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!designSettings._id) return true
    const savedBrandColor = normalizeBrandColor(designSettings.brandColor)
    return (
      localSettings.brandColor.value !== savedBrandColor.value ||
      localSettings.brandColor.label !== savedBrandColor.label ||
      localSettings.typographyHeading !== (designSettings.typographyHeading || 'Inter') ||
      localSettings.typographyBody !== (designSettings.typographyBody || 'Inter') ||
      localSettings.navigationLayout !== (designSettings.navigationLayout || 'logoLeft') ||
      localSettings.postShowAuthor !== (designSettings.postShowAuthor ?? true) ||
      localSettings.postShowRelatedPosts !== (designSettings.postShowRelatedPosts ?? true) ||
      siteIconFile !== null ||
      siteLogoFile !== null ||
      publicationCoverFile !== null ||
      siteIconRemoved ||
      siteLogoRemoved ||
      publicationCoverRemoved
    )
  }

  // Reset loading state and reload iframe when URL changes
  useEffect(() => {
    // When URL changes, reset loading state and reload iframe
    if (iframeRef.current) {
      setIframeLoading(true)
      setIframeError(false)
      // Manually reload iframe to ensure it loads the new URL
      try {
        iframeRef.current.src = iframeUrl
      } catch (err) {
        console.error('Error updating iframe src:', err)
      }
    }
  }, [iframeUrl])
  
  // Add timeout to handle cases where iframe doesn't load
  useEffect(() => {
    if (iframeLoading) {
      const timeout = setTimeout(() => {
        setIframeLoading((prev) => {
          if (prev) {
            console.warn('Iframe loading timeout for URL:', iframeUrl)
            setIframeError(true)
            return false
          }
          return prev
        })
      }, 10000) // 10 second timeout
      
      return () => clearTimeout(timeout)
    }
  }, [iframeLoading, iframeUrl])

  const fetchDesignSettings = async () => {
    setLoading(true)
    try {
      const settings = await sanityClient.fetch<DesignSettings>(
        `*[_type == "generalSettings"][0] {
          _id,
          brandColor,
          typographyHeading,
          typographyBody,
          siteIcon {
            asset-> {
              _id,
              url
            }
          },
          siteLogo {
            asset-> {
              _id,
              url
            }
          },
          publicationCover {
            asset-> {
              _id,
              url
            }
          },
          navigationLayout,
          "postShowAuthor": postOptions->showAuthor,
          "postShowRelatedPosts": postOptions->showRelatedPosts
        }`
      )
      
      if (settings) {
        setDesignSettings(settings)
        setLocalSettings({
          brandColor: normalizeBrandColor(settings.brandColor),
          typographyHeading: settings.typographyHeading || 'Inter',
          typographyBody: settings.typographyBody || 'Inter',
          navigationLayout: settings.navigationLayout || 'logoLeft',
          colorScheme: 'light',
          homepageShowFeatured: true,
          homepageFeaturedTitle: 'FREE RESOURCES + GUIDES',
          postShowAuthor: settings.postShowAuthor ?? true,
          postShowRelatedPosts: settings.postShowRelatedPosts ?? true,
        })
        
        // Set image previews from existing images and reset removed flags
        if (settings.siteIcon?.asset?.url) {
          setSiteIconPreview(settings.siteIcon.asset.url)
          setSiteIconRemoved(false)
        } else {
          setSiteIconPreview(null)
        }
        if (settings.siteLogo?.asset?.url) {
          setSiteLogoPreview(settings.siteLogo.asset.url)
          setSiteLogoRemoved(false)
        } else {
          setSiteLogoPreview(null)
        }
        if (settings.publicationCover?.asset?.url) {
          setPublicationCoverPreview(settings.publicationCover.asset.url)
          setPublicationCoverRemoved(false)
        } else {
          setPublicationCoverPreview(null)
        }
      }
    } catch (err) {
      console.error('Error fetching design settings:', err)
      showToast('Failed to load design settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'siteIcon' | 'siteLogo' | 'publicationCover') => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        if (type === 'siteIcon') {
          setSiteIconPreview(result)
          setSiteIconFile(file)
          setSiteIconRemoved(false)
        } else if (type === 'siteLogo') {
          setSiteLogoPreview(result)
          setSiteLogoFile(file)
          setSiteLogoRemoved(false)
        } else if (type === 'publicationCover') {
          setPublicationCoverPreview(result)
          setPublicationCoverFile(file)
          setPublicationCoverRemoved(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = (type: 'siteIcon' | 'siteLogo' | 'publicationCover') => {
    if (type === 'siteIcon') {
      setSiteIconPreview(null)
      setSiteIconFile(null)
      setSiteIconRemoved(true)
      if (siteIconInputRef.current) {
        siteIconInputRef.current.value = ''
      }
    } else if (type === 'siteLogo') {
      setSiteLogoPreview(null)
      setSiteLogoFile(null)
      setSiteLogoRemoved(true)
      if (siteLogoInputRef.current) {
        siteLogoInputRef.current.value = ''
      }
    } else if (type === 'publicationCover') {
      setPublicationCoverPreview(null)
      setPublicationCoverFile(null)
      setPublicationCoverRemoved(true)
      if (publicationCoverInputRef.current) {
        publicationCoverInputRef.current.value = ''
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Prepare brandColor object with _type for Sanity
      const brandColorToSave: SimplerColor = {
        _type: 'simplerColor',
        label: localSettings.brandColor.label || 'Custom',
        value: localSettings.brandColor.value || '#15171a',
      }

      // Handle image uploads
      let siteIconImage = undefined
      let siteLogoImage = undefined
      let publicationCoverImage = undefined

      if (siteIconFile) {
        try {
          const asset = await sanityClient.assets.upload('image', siteIconFile, {
            filename: siteIconFile.name || `site-icon-${Date.now()}.jpg`,
          })
          siteIconImage = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: asset._id,
            },
          }
        } catch (err) {
          console.error('Error uploading site icon:', err)
          showToast('Failed to upload site icon', 'error')
        }
      }

      if (siteLogoFile) {
        try {
          const asset = await sanityClient.assets.upload('image', siteLogoFile, {
            filename: siteLogoFile.name || `site-logo-${Date.now()}.jpg`,
          })
          siteLogoImage = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: asset._id,
            },
          }
        } catch (err) {
          console.error('Error uploading site logo:', err)
          showToast('Failed to upload site logo', 'error')
        }
      }

      if (publicationCoverFile) {
        try {
          const asset = await sanityClient.assets.upload('image', publicationCoverFile, {
            filename: publicationCoverFile.name || `publication-cover-${Date.now()}.jpg`,
          })
          publicationCoverImage = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: asset._id,
            },
          }
        } catch (err) {
          console.error('Error uploading publication cover:', err)
          showToast('Failed to upload publication cover', 'error')
        }
      }

      if (designSettings._id) {
        const updateData: any = {
          brandColor: brandColorToSave,
          typographyHeading: localSettings.typographyHeading,
          typographyBody: localSettings.typographyBody,
          navigationLayout: localSettings.navigationLayout,
          postOptions: {
            showAuthor: localSettings.postShowAuthor,
            showRelatedPosts: localSettings.postShowRelatedPosts,
          },
        }

        // Only update images if new ones are uploaded or removed
        if (siteIconImage) {
          updateData.siteIcon = siteIconImage
        } else if (siteIconRemoved && designSettings.siteIcon) {
          // Remove image if explicitly removed
          updateData.siteIcon = null
        }

        if (siteLogoImage) {
          updateData.siteLogo = siteLogoImage
        } else if (siteLogoRemoved && designSettings.siteLogo) {
          updateData.siteLogo = null
        }

        if (publicationCoverImage) {
          updateData.publicationCover = publicationCoverImage
        } else if (publicationCoverRemoved && designSettings.publicationCover) {
          updateData.publicationCover = null
        }

        await sanityClient
          .patch(designSettings._id)
          .set(updateData)
          .commit()
        
        // Update designSettings to reflect saved state
        setDesignSettings(prev => ({
          ...prev,
          brandColor: brandColorToSave,
          typographyHeading: localSettings.typographyHeading,
          typographyBody: localSettings.typographyBody,
          navigationLayout: localSettings.navigationLayout,
          postShowAuthor: localSettings.postShowAuthor,
          postShowRelatedPosts: localSettings.postShowRelatedPosts,
          siteIcon: siteIconImage || (siteIconRemoved ? null : prev.siteIcon),
          siteLogo: siteLogoImage || (siteLogoRemoved ? null : prev.siteLogo),
          publicationCover: publicationCoverImage || (publicationCoverRemoved ? null : prev.publicationCover),
        }))

        // Update previews to use saved images
        if (siteIconImage && siteIconImage.asset?._ref) {
          const newIcon = await sanityClient.fetch(`*[_id == $id][0] { asset-> { url } }`, { id: siteIconImage.asset._ref })
          if (newIcon?.asset?.url) {
            setSiteIconPreview(newIcon.asset.url)
          }
        } else if (siteIconRemoved) {
          setSiteIconPreview(null)
        }
        
        if (siteLogoImage && siteLogoImage.asset?._ref) {
          const newLogo = await sanityClient.fetch(`*[_id == $id][0] { asset-> { url } }`, { id: siteLogoImage.asset._ref })
          if (newLogo?.asset?.url) {
            setSiteLogoPreview(newLogo.asset.url)
          }
        } else if (siteLogoRemoved) {
          setSiteLogoPreview(null)
        }
        
        if (publicationCoverImage && publicationCoverImage.asset?._ref) {
          const newCover = await sanityClient.fetch(`*[_id == $id][0] { asset-> { url } }`, { id: publicationCoverImage.asset._ref })
          if (newCover?.asset?.url) {
            setPublicationCoverPreview(newCover.asset.url)
          }
        } else if (publicationCoverRemoved) {
          setPublicationCoverPreview(null)
        }
        
        // Clear file states after successful save
        setSiteIconFile(null)
        setSiteLogoFile(null)
        setPublicationCoverFile(null)
        setSiteIconRemoved(false)
        setSiteLogoRemoved(false)
        setPublicationCoverRemoved(false)
        
        showToast('Design settings saved successfully', 'success')
      } else {
        const created = await sanityClient.create({
          _type: 'generalSettings',
          brandColor: brandColorToSave,
          typographyHeading: localSettings.typographyHeading,
          typographyBody: localSettings.typographyBody,
          navigationLayout: localSettings.navigationLayout,
          siteIcon: siteIconImage,
          siteLogo: siteLogoImage,
          publicationCover: publicationCoverImage,
          postOptions: {
            showAuthor: localSettings.postShowAuthor,
            showRelatedPosts: localSettings.postShowRelatedPosts,
          },
        })
        setDesignSettings({
          ...created,
          postShowAuthor: localSettings.postShowAuthor,
          postShowRelatedPosts: localSettings.postShowRelatedPosts,
        })
        
        // Update previews to use saved images
        if (siteIconImage && siteIconImage.asset?._ref) {
          const newIcon = await sanityClient.fetch(`*[_id == $id][0] { asset-> { url } }`, { id: siteIconImage.asset._ref })
          if (newIcon?.asset?.url) {
            setSiteIconPreview(newIcon.asset.url)
          }
        }
        
        if (siteLogoImage && siteLogoImage.asset?._ref) {
          const newLogo = await sanityClient.fetch(`*[_id == $id][0] { asset-> { url } }`, { id: siteLogoImage.asset._ref })
          if (newLogo?.asset?.url) {
            setSiteLogoPreview(newLogo.asset.url)
          }
        }
        
        if (publicationCoverImage && publicationCoverImage.asset?._ref) {
          const newCover = await sanityClient.fetch(`*[_id == $id][0] { asset-> { url } }`, { id: publicationCoverImage.asset._ref })
          if (newCover?.asset?.url) {
            setPublicationCoverPreview(newCover.asset.url)
          }
        }
        
        // Clear file states after successful save
        setSiteIconFile(null)
        setSiteLogoFile(null)
        setPublicationCoverFile(null)
        setSiteIconRemoved(false)
        setSiteLogoRemoved(false)
        setPublicationCoverRemoved(false)
        
        showToast('Design settings saved successfully', 'success')
      }
    } catch (err) {
      console.error('Error saving design settings:', err)
      showToast('Failed to save design settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setLocalSettings({
      brandColor: normalizeBrandColor(designSettings.brandColor),
      typographyHeading: designSettings.typographyHeading || 'Inter',
      typographyBody: designSettings.typographyBody || 'Inter',
      navigationLayout: designSettings.navigationLayout || 'logoLeft',
      colorScheme: 'light',
      homepageShowFeatured: true,
      homepageFeaturedTitle: 'FREE RESOURCES + GUIDES',
      postShowAuthor: designSettings.postShowAuthor ?? true,
      postShowRelatedPosts: designSettings.postShowRelatedPosts ?? true,
    })
  }

  if (!isOpen) return null

  return (
    <div className="design-editor-overlay" onClick={onClose}>
      <div className="design-editor-container" onClick={(e) => e.stopPropagation()}>
        <div className="design-editor-header">
          <div className="design-editor-header-left">
            <h2 className="design-editor-title">Design</h2>
            {hasUnsavedChanges() && !saving && (
              <span className="unsaved-indicator">Unsaved changes</span>
            )}
            {saving && (
              <span className="saving-indicator">
                <svg className="saving-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Saving...
              </span>
            )}
          </div>
          <div className="design-editor-header-actions">
            <button className="design-close-button" onClick={onClose} disabled={saving}>
              Close
            </button>
            <button 
              className="design-save-button" 
              onClick={handleSave} 
              disabled={saving || loading || !hasUnsavedChanges()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="design-editor-content">
          {/* Left side - Preview */}
          <div className="design-editor-preview">
            <div className="preview-header">
              <div className="preview-tabs">
                <button className="preview-tab">Homepage</button>
                <button className="preview-tab">Post</button>
              </div>
              <div className="preview-actions">
                <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="preview-view-site">
                  View site
                </a>
              </div>
            </div>
            <div className="preview-iframe-wrapper">
              {iframeLoading && (
                <div className="iframe-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading preview...</p>
                </div>
              )}
              {iframeError && (
                <div className="iframe-error">
                  <p>Failed to load preview</p>
                  <button onClick={() => {
                    setIframeError(false)
                    setIframeLoading(true)
                    if (iframeRef.current) {
                      iframeRef.current.src = iframeRef.current.src
                    }
                  }}>
                    Retry
                  </button>
                </div>
              )}
              <iframe
                ref={iframeRef}
                key={iframeUrl} // Force reload when URL changes
                src={iframeUrl}
                className="preview-iframe"
                title="Design Preview"
                onLoad={(e) => {
                  console.log('Iframe loaded successfully:', iframeUrl)
                  // Check if iframe actually loaded content
                  try {
                    const iframe = e.currentTarget
                    // Try to access iframe content to verify it loaded
                    if (iframe.contentWindow) {
                      setIframeLoading(false)
                      setIframeError(false)
                    } else {
                      console.warn('Iframe contentWindow not accessible')
                      setIframeLoading(false)
                      setIframeError(true)
                    }
                  } catch (err) {
                    // Cross-origin or other error - this is normal for cross-origin iframes
                    console.log('Iframe loaded (cross-origin, cannot verify content):', iframeUrl)
                    // Still consider it loaded if onLoad fired
                    setIframeLoading(false)
                    setIframeError(false)
                  }
                }}
                onError={(e) => {
                  console.error('Iframe error event:', e)
                  setIframeLoading(false)
                  setIframeError(true)
                }}
                style={{ 
                  display: iframeLoading || iframeError ? 'none' : 'block',
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          </div>

          {/* Right side - Settings */}
          <div className="design-editor-settings">
            <div className="settings-tabs">
              <button
                className={`settings-tab ${activeTab === 'brand' ? 'active' : ''}`}
                onClick={() => setActiveTab('brand')}
              >
                Brand
              </button>
              <button
                className={`settings-tab ${activeTab === 'theme' ? 'active' : ''}`}
                onClick={() => setActiveTab('theme')}
              >
                Theme
              </button>
            </div>

            <div className="settings-scroll">
              {loading ? (
                <div className="settings-loading">Loading settings...</div>
              ) : activeTab === 'brand' ? (
                <>
                  <div className="setting-group">
                    <h3 className="setting-group-title">Brand</h3>
                    
                    <div className="setting-item">
                      <label className="setting-label">Accent color</label>
                      <div className="color-input-wrapper">
                        <input
                          type="color"
                          value={localSettings.brandColor.value || '#15171a'}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            brandColor: { 
                              _type: 'simplerColor',
                              label: 'Custom', 
                              value: e.target.value 
                            } 
                          })}
                          className="color-input"
                        />
                        <input
                          type="text"
                          value={localSettings.brandColor.value || '#15171a'}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            brandColor: { 
                              _type: 'simplerColor',
                              label: 'Custom', 
                              value: e.target.value 
                            } 
                          })}
                          className="color-text-input"
                          placeholder="#15171a"
                        />
                      </div>
                    </div>

                    <div className="setting-item">
                      <label className="setting-label">Publication icon</label>
                      <p className="setting-description">A square, social icon, at least 60x60px</p>
                      <input
                        ref={siteIconInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'siteIcon')}
                        style={{ display: 'none' }}
                      />
                      <button 
                        className="upload-image-button"
                        onClick={() => siteIconInputRef.current?.click()}
                      >
                        Upload image
                      </button>
                      {(siteIconPreview || (!siteIconRemoved && designSettings.siteIcon?.asset?.url)) && (
                        <div className="image-preview-container">
                          <img 
                            src={siteIconPreview || designSettings.siteIcon?.asset?.url || ''} 
                            alt="Publication icon" 
                            className="image-preview-thumbnail" 
                          />
                          <button
                            type="button"
                            className="image-remove-button"
                            onClick={() => handleRemoveImage('siteIcon')}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="setting-item">
                      <label className="setting-label">Publication logo</label>
                      <p className="setting-description">Appears usually in the main header of your theme</p>
                      <input
                        ref={siteLogoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'siteLogo')}
                        style={{ display: 'none' }}
                      />
                      <button 
                        className="upload-image-button"
                        onClick={() => siteLogoInputRef.current?.click()}
                      >
                        Upload image
                      </button>
                      {(siteLogoPreview || (!siteLogoRemoved && designSettings.siteLogo?.asset?.url)) && (
                        <div className="image-preview-container">
                          <img 
                            src={siteLogoPreview || designSettings.siteLogo?.asset?.url || ''} 
                            alt="Publication logo" 
                            className="image-preview-thumbnail" 
                          />
                          <button
                            type="button"
                            className="image-remove-button"
                            onClick={() => handleRemoveImage('siteLogo')}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="setting-item">
                      <label className="setting-label">Publication cover</label>
                      <p className="setting-description">Usually as a large banner image on your index pages</p>
                      <input
                        ref={publicationCoverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'publicationCover')}
                        style={{ display: 'none' }}
                      />
                      <button 
                        className="upload-image-button"
                        onClick={() => publicationCoverInputRef.current?.click()}
                      >
                        Upload image
                      </button>
                      {(publicationCoverPreview || (!publicationCoverRemoved && designSettings.publicationCover?.asset?.url)) && (
                        <div className="image-preview-container">
                          <img 
                            src={publicationCoverPreview || designSettings.publicationCover?.asset?.url || ''} 
                            alt="Publication cover" 
                            className="image-preview-thumbnail" 
                          />
                          <button
                            type="button"
                            className="image-remove-button"
                            onClick={() => handleRemoveImage('publicationCover')}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="setting-group">
                    <h3 className="setting-group-title">Typography</h3>
                    
                    <div className="setting-item">
                      <GoogleFontInput
                        value={localSettings.typographyHeading}
                        onChange={(value) => setLocalSettings({ ...localSettings, typographyHeading: value })}
                        label="Heading font"
                      />
                    </div>

                    <div className="setting-item">
                      <GoogleFontInput
                        value={localSettings.typographyBody}
                        onChange={(value) => setLocalSettings({ ...localSettings, typographyBody: value })}
                        label="Body font"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="setting-group">
                    <h3 className="setting-group-title">Site wide</h3>
                    
                    <div className="setting-item">
                      <label className="setting-label">Navigation layout</label>
                      <select
                        value={localSettings.navigationLayout}
                        onChange={(e) => setLocalSettings({ ...localSettings, navigationLayout: e.target.value as any })}
                        className="setting-select"
                      >
                        <option value="logoLeft">Logo on the left</option>
                        <option value="logoMiddle">Logo in the middle</option>
                        <option value="stacked">Stacked</option>
                      </select>
                    </div>

                    <div className="setting-item">
                      <label className="setting-label">Color scheme</label>
                      <select
                        value={localSettings.colorScheme}
                        onChange={(e) => setLocalSettings({ ...localSettings, colorScheme: e.target.value as any })}
                        className="setting-select"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>

                    <div className="setting-item">
                      <label className="setting-label">White logo for dark mode</label>
                      <button className="upload-image-button">
                        Upload image
                      </button>
                    </div>
                  </div>

                  <div className="setting-group">
                    <h3 className="setting-group-title">Homepage</h3>
                    
                    <div className="setting-item">
                      <div className="toggle-setting">
                        <label className="setting-label">Show featured posts</label>
                        <button
                          className={`toggle-switch ${localSettings.homepageShowFeatured ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ ...localSettings, homepageShowFeatured: !localSettings.homepageShowFeatured })}
                        >
                          <div className="toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="setting-item">
                      <label className="setting-label">Featured title</label>
                      <input
                        type="text"
                        value={localSettings.homepageFeaturedTitle}
                        onChange={(e) => setLocalSettings({ ...localSettings, homepageFeaturedTitle: e.target.value })}
                        className="setting-input"
                      />
                    </div>
                  </div>

                  <div className="setting-group">
                    <h3 className="setting-group-title">Post</h3>
                    
                    <div className="setting-item">
                      <div className="toggle-setting">
                        <label className="setting-label">Show author</label>
                        <button
                          className={`toggle-switch ${localSettings.postShowAuthor ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ ...localSettings, postShowAuthor: !localSettings.postShowAuthor })}
                        >
                          <div className="toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="setting-item">
                      <div className="toggle-setting">
                        <label className="setting-label">Show related posts</label>
                        <button
                          className={`toggle-switch ${localSettings.postShowRelatedPosts ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ ...localSettings, postShowRelatedPosts: !localSettings.postShowRelatedPosts })}
                        >
                          <div className="toggle-slider"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

