import React, { useState, useEffect } from 'react'
import '../css/NewsletterEditor.css'
import { sanityClient } from '../lib/sanity-client'
import { urlFor } from '../lib/image'
import GoogleFontInput from './GoogleFontInput'

// Helper function to extract text from Sanity rich text or plain string
const extractText = (value: any): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    // Handle Sanity portable text blocks
    if (Array.isArray(value)) {
      return value
        .map((block: any) => {
          if (block._type === 'block' && block.children) {
            return block.children.map((child: any) => child.text || '').join('')
          }
          return block.text || ''
        })
        .join(' ')
    }
    // Handle object with text property
    if (value.text) return value.text
    // Handle other object structures
    return String(value)
  }
  return String(value)
}

interface SimplerColor {
  _type: 'simplerColor'
  label?: string
  value?: string
}

interface NewsletterEditorProps {
  isOpen: boolean
  onClose: () => void
}

interface NewsletterSettings {
  _id?: string
  name?: string
  description?: string
  emailInfo?: {
    senderName?: string
    replyToEmail?: string
  }
  memberSettings?: {
    subscribeNewMembersOnSignup?: boolean
  }
  header?: {
    headerImage?: {
      _type?: 'image'
      asset?: {
        _type?: 'reference'
        _ref?: string
      }
      altText?: string
    } | boolean
    publicationIcon?: boolean
    publicationTitle?: boolean
    newsletterName?: boolean
  }
  titleSection?: {
    postTitle?: boolean
    postExcerpt?: boolean
    featureImage?: boolean
  }
  footer?: {
    askReadersForFeedback?: boolean
    addLinkToComments?: boolean
    shareLatestPosts?: boolean
    showSubscriptionDetails?: boolean
  }
  emailFooter?: {
    text?: string
  }
  global?: {
    backgroundColor?: SimplerColor | string
    headingFont?: string
    headingWeight?: string
    bodyFont?: string
  }
  headerDesign?: {
    headerBackgroundColor?: SimplerColor | string
    postTitleColor?: SimplerColor | string
    titleAlignment?: 'left' | 'center'
  }
  body?: {
    sectionTitleColor?: SimplerColor | string
    buttonColor?: SimplerColor | string
    buttonStyle?: 'fill' | 'outline'
    buttonCorners?: 'square' | 'rounded' | 'circle'
    linkColor?: SimplerColor | string
    linkStyle?: 'underline' | 'regular' | 'bold'
    imageCorners?: 'square' | 'rounded'
    dividerColor?: SimplerColor | string
  }
}

export function NewsletterEditor({ isOpen, onClose }: NewsletterEditorProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'content' | 'design'>('general')
  const [newsletterSettings, setNewsletterSettings] = useState<NewsletterSettings>({})
  const [latestPosts, setLatestPosts] = useState<any[]>([])
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<any>({})
  // Helper function to normalize color to simplerColor format
  const normalizeColor = (color: SimplerColor | string | undefined, defaultValue: string): SimplerColor => {
    if (!color) {
      return { _type: 'simplerColor', label: 'Custom', value: defaultValue }
    }
    if (typeof color === 'string') {
      return { _type: 'simplerColor', label: 'Custom', value: color }
    }
    return { _type: 'simplerColor', label: color.label || 'Custom', value: color.value || defaultValue }
  }

  // Helper function to get color value from simplerColor or string
  const getColorValue = (color: SimplerColor | string | undefined, defaultValue: string): string => {
    if (!color) return defaultValue
    if (typeof color === 'string') return color
    return color.value || defaultValue
  }

  const [localSettings, setLocalSettings] = useState<NewsletterSettings>({
    name: '',
    description: '',
    emailInfo: {
      senderName: '',
      replyToEmail: '',
    },
    memberSettings: {
      subscribeNewMembersOnSignup: true,
    },
    header: {
      headerImage: true,
      publicationIcon: true,
      publicationTitle: false,
      newsletterName: false,
    },
    titleSection: {
      postTitle: true,
      postExcerpt: true,
      featureImage: true,
    },
    footer: {
      askReadersForFeedback: true,
      addLinkToComments: true,
      shareLatestPosts: true,
      showSubscriptionDetails: false,
    },
    emailFooter: {
      text: '',
    },
    global: {
      backgroundColor: { _type: 'simplerColor', label: 'Custom', value: '#ffffff' },
      headingFont: 'Clean sans-serif',
      headingWeight: '700',
      bodyFont: 'Clean sans-serif',
    },
    headerDesign: {
      headerBackgroundColor: { _type: 'simplerColor', label: 'Custom', value: '#ffffff' },
      postTitleColor: { _type: 'simplerColor', label: 'Custom', value: '#15171a' },
      titleAlignment: 'left',
    },
    body: {
      sectionTitleColor: { _type: 'simplerColor', label: 'Custom', value: '#15171a' },
      buttonColor: { _type: 'simplerColor', label: 'Custom', value: '#ffbd59' },
      buttonStyle: 'fill',
      buttonCorners: 'rounded',
      linkColor: { _type: 'simplerColor', label: 'Custom', value: '#ffbd59' },
      linkStyle: 'regular',
      imageCorners: 'rounded',
      dividerColor: { _type: 'simplerColor', label: 'Custom', value: '#e5eff5' },
    },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Helper function to get font family string for Google Fonts
  const getFontFamily = (fontName: string | undefined, fallback: string): string => {
    if (!fontName || fontName === 'Clean sans-serif') {
      return fallback
    }
    // If it's a Google Font, return it with fallback
    return `"${fontName}", ${fallback}`
  }

  // Helper function to get heading font family
  const getHeadingFontFamily = (): string => {
    return getFontFamily(
      localSettings.global?.headingFont,
      'system-ui, -apple-system, sans-serif'
    )
  }

  // Helper function to get body font family
  const getBodyFontFamily = (): string => {
    return getFontFamily(
      localSettings.global?.bodyFont,
      'system-ui, -apple-system, sans-serif'
    )
  }

  // Generate Google Fonts URL for loading fonts
  const getGoogleFontsUrl = (): string => {
    const fonts: string[] = []
    if (localSettings.global?.headingFont && localSettings.global.headingFont !== 'Clean sans-serif') {
      fonts.push(localSettings.global.headingFont.replace(/\s+/g, '+'))
    }
    if (localSettings.global?.bodyFont && localSettings.global.bodyFont !== 'Clean sans-serif') {
      fonts.push(localSettings.global.bodyFont.replace(/\s+/g, '+'))
    }
    if (fonts.length === 0) return ''
    return `https://fonts.googleapis.com/css2?family=${fonts.join('&family=')}:wght@400;600;700&display=swap`
  }

  useEffect(() => {
    if (isOpen) {
      fetchNewsletterSettings()
    }
  }, [isOpen])

  // Load Google Fonts dynamically
  useEffect(() => {
    const fontsUrl = getGoogleFontsUrl()
    if (!fontsUrl) return

    // Remove existing Google Fonts link if any
    const existingLink = document.querySelector('link[data-google-fonts]')
    if (existingLink) {
      existingLink.remove()
    }

    // Add new Google Fonts link
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = fontsUrl
    link.setAttribute('data-google-fonts', 'true')
    document.head.appendChild(link)

    return () => {
      // Cleanup on unmount
      const linkToRemove = document.querySelector('link[data-google-fonts]')
      if (linkToRemove) {
        linkToRemove.remove()
      }
    }
  }, [localSettings.global?.headingFont, localSettings.global?.bodyFont])

  const fetchNewsletterSettings = async () => {
    setLoading(true)
    try {
      // Use the fixed singleton documentId
      const documentId = 'emailSettings'
      const settings = await sanityClient.fetch<NewsletterSettings>(
        `*[_id == $documentId][0] {
          _id,
          name,
          description,
          emailInfo,
          memberSettings,
          header {
            headerImage {
              asset->,
              altText
            },
            publicationIcon,
            publicationTitle,
            newsletterName
          },
          titleSection,
          footer,
          emailFooter,
          global,
          headerDesign,
          body
        }`,
        { documentId }
      )
      
      // Always set the documentId for singleton, even if document doesn't exist yet
      if (settings) {
        setNewsletterSettings({ ...settings, _id: documentId })
      } else {
        // Set empty settings with documentId if document doesn't exist
        setNewsletterSettings({ _id: documentId })
      }
      
      if (settings) {
        setLocalSettings({
          name: settings.name || '',
          description: settings.description || '',
          emailInfo: settings.emailInfo || { senderName: '', replyToEmail: '' },
          memberSettings: {
            subscribeNewMembersOnSignup: settings.memberSettings?.subscribeNewMembersOnSignup ?? true,
          },
          header: {
            headerImage: settings.header?.headerImage || true,
            publicationIcon: settings.header?.publicationIcon ?? true,
            publicationTitle: settings.header?.publicationTitle ?? false,
            newsletterName: settings.header?.newsletterName ?? false,
          },
          titleSection: {
            postTitle: settings.titleSection?.postTitle ?? true,
            postExcerpt: settings.titleSection?.postExcerpt ?? true,
            featureImage: settings.titleSection?.featureImage ?? true,
          },
          footer: {
            askReadersForFeedback: settings.footer?.askReadersForFeedback ?? true,
            addLinkToComments: settings.footer?.addLinkToComments ?? true,
            shareLatestPosts: settings.footer?.shareLatestPosts ?? true,
            showSubscriptionDetails: settings.footer?.showSubscriptionDetails ?? false,
          },
          emailFooter: {
            text: settings.emailFooter?.text || '',
          },
          global: {
            backgroundColor: normalizeColor(settings.global?.backgroundColor, '#ffffff'),
            headingFont: settings.global?.headingFont || 'Clean sans-serif',
            headingWeight: settings.global?.headingWeight || '700',
            bodyFont: settings.global?.bodyFont || 'Clean sans-serif',
          },
          headerDesign: {
            headerBackgroundColor: normalizeColor(settings.headerDesign?.headerBackgroundColor, '#ffffff'),
            postTitleColor: normalizeColor(settings.headerDesign?.postTitleColor, '#15171a'),
            titleAlignment: settings.headerDesign?.titleAlignment || 'left',
          },
          body: {
            sectionTitleColor: normalizeColor(settings.body?.sectionTitleColor, '#15171a'),
            buttonColor: normalizeColor(settings.body?.buttonColor, '#ffbd59'),
            buttonStyle: settings.body?.buttonStyle || 'fill',
            buttonCorners: settings.body?.buttonCorners || 'rounded',
            linkColor: normalizeColor(settings.body?.linkColor, '#ffbd59'),
            linkStyle: settings.body?.linkStyle || 'regular',
            imageCorners: settings.body?.imageCorners || 'rounded',
            dividerColor: normalizeColor(settings.body?.dividerColor, '#e5eff5'),
          },
        })
      }
    } catch (err) {
      console.error('Error fetching newsletter settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const getLatestPosts = async () => {
    const latestPosts = await sanityClient.fetch(`
        *[_type == "post" ]
      | order(_createdAt desc)[0..2]{
        title,
        excerpt,
        "slug": slug.current,
        "imageUrl": coalesce(image.asset->url, featuredImage.asset->url)
      }
    `);
    setLatestPosts(latestPosts);
  }


  const fetchSettings = async () => {
    const settings = await sanityClient.fetch(`*[_type == "generalSettings"][0] {
      siteIcon {
        asset-> {
          url
        }
      }
  }`)
  setSettings(settings)
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    getLatestPosts();
  }, [isOpen]);

  // Track if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!newsletterSettings._id) return true
    const savedBgColor = normalizeColor(newsletterSettings.global?.backgroundColor, '#ffffff')
    const savedHeaderBgColor = normalizeColor(newsletterSettings.headerDesign?.headerBackgroundColor, '#ffffff')
    const savedPostTitleColor = normalizeColor(newsletterSettings.headerDesign?.postTitleColor, '#15171a')
    const savedSectionTitleColor = normalizeColor(newsletterSettings.body?.sectionTitleColor, '#15171a')
    const savedButtonColor = normalizeColor(newsletterSettings.body?.buttonColor, '#ffbd59')
    const savedLinkColor = normalizeColor(newsletterSettings.body?.linkColor, '#ffbd59')
    const savedDividerColor = normalizeColor(newsletterSettings.body?.dividerColor, '#e5eff5')
    
    return (
      localSettings.name !== (newsletterSettings.name || '') ||
      localSettings.description !== (newsletterSettings.description || '') ||
      localSettings.emailInfo?.senderName !== (newsletterSettings.emailInfo?.senderName || '') ||
      localSettings.emailInfo?.replyToEmail !== (newsletterSettings.emailInfo?.replyToEmail || '') ||
      localSettings.memberSettings?.subscribeNewMembersOnSignup !== (newsletterSettings.memberSettings?.subscribeNewMembersOnSignup ?? true) ||
      (() => {
        // Compare header image - check if both are image objects with same asset ref, or both are boolean
        const localHeaderImage = localSettings.header?.headerImage
        const savedHeaderImage = newsletterSettings.header?.headerImage
        const localIsImage = localHeaderImage && typeof localHeaderImage === 'object' && localHeaderImage.asset?._ref
        const savedIsImage = savedHeaderImage && typeof savedHeaderImage === 'object' && savedHeaderImage.asset?._ref
        if (localIsImage && savedIsImage) {
          return localHeaderImage.asset?._ref !== savedHeaderImage.asset?._ref
        }
        return localHeaderImage !== savedHeaderImage
      })() ||
      localSettings.header?.publicationIcon !== (newsletterSettings.header?.publicationIcon ?? true) ||
      localSettings.header?.publicationTitle !== (newsletterSettings.header?.publicationTitle ?? false) ||
      localSettings.header?.newsletterName !== (newsletterSettings.header?.newsletterName ?? false) ||
      localSettings.titleSection?.postTitle !== (newsletterSettings.titleSection?.postTitle ?? true) ||
      localSettings.titleSection?.postExcerpt !== (newsletterSettings.titleSection?.postExcerpt ?? true) ||
      localSettings.titleSection?.featureImage !== (newsletterSettings.titleSection?.featureImage ?? true) ||
      localSettings.footer?.askReadersForFeedback !== (newsletterSettings.footer?.askReadersForFeedback ?? true) ||
      localSettings.footer?.addLinkToComments !== (newsletterSettings.footer?.addLinkToComments ?? true) ||
      localSettings.footer?.shareLatestPosts !== (newsletterSettings.footer?.shareLatestPosts ?? true) ||
      localSettings.footer?.showSubscriptionDetails !== (newsletterSettings.footer?.showSubscriptionDetails ?? false) ||
      localSettings.emailFooter?.text !== (newsletterSettings.emailFooter?.text || '') ||
      getColorValue(localSettings.global?.backgroundColor, '#ffffff') !== savedBgColor.value ||
      localSettings.global?.headingFont !== (newsletterSettings.global?.headingFont || 'Clean sans-serif') ||
      localSettings.global?.headingWeight !== (newsletterSettings.global?.headingWeight || '700') ||
      localSettings.global?.bodyFont !== (newsletterSettings.global?.bodyFont || 'Clean sans-serif') ||
      getColorValue(localSettings.headerDesign?.headerBackgroundColor, '#ffffff') !== savedHeaderBgColor.value ||
      getColorValue(localSettings.headerDesign?.postTitleColor, '#15171a') !== savedPostTitleColor.value ||
      localSettings.headerDesign?.titleAlignment !== (newsletterSettings.headerDesign?.titleAlignment || 'left') ||
      getColorValue(localSettings.body?.sectionTitleColor, '#15171a') !== savedSectionTitleColor.value ||
      getColorValue(localSettings.body?.buttonColor, '#ffbd59') !== savedButtonColor.value ||
      localSettings.body?.buttonStyle !== (newsletterSettings.body?.buttonStyle || 'fill') ||
      localSettings.body?.buttonCorners !== (newsletterSettings.body?.buttonCorners || 'rounded') ||
      getColorValue(localSettings.body?.linkColor, '#ffbd59') !== savedLinkColor.value ||
      localSettings.body?.linkStyle !== (newsletterSettings.body?.linkStyle || 'regular') ||
      localSettings.body?.imageCorners !== (newsletterSettings.body?.imageCorners || 'rounded') ||
      getColorValue(localSettings.body?.dividerColor, '#e5eff5') !== savedDividerColor.value
    )
  }

  const handleHeaderImageUpload = async (file: File) => {
    try {
      const asset = await sanityClient.assets.upload('image', file, {
        filename: file.name || `header-image-${Date.now()}.jpg`,
      })
      
      const imageRef = {
        _type: 'image' as const,
        asset: {
          _type: 'reference' as const,
          _ref: asset._id,
        },
        altText: '',
      }
      
      setLocalSettings({
        ...localSettings,
        header: {
          ...localSettings.header,
          headerImage: imageRef,
        }
      })
      setHeaderImageFile(null)
    } catch (err) {
      console.error('Error uploading header image:', err)
      alert('Failed to upload header image. Please try again.')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Handle header image upload if a new file was selected
      let headerImageToSave = localSettings.header?.headerImage
      
      if (headerImageFile) {
        try {
          const asset = await sanityClient.assets.upload('image', headerImageFile, {
            filename: headerImageFile.name || `header-image-${Date.now()}.jpg`,
          })
          
          headerImageToSave = {
            _type: 'image' as const,
            asset: {
              _type: 'reference' as const,
              _ref: asset._id,
            },
            altText: (localSettings.header?.headerImage as any)?.altText || '',
          }
        } catch (err) {
          console.error('Error uploading header image:', err)
          alert('Failed to upload header image. Please try again.')
          setSaving(false)
          return
        }
      }

      const headerToSave = {
        ...localSettings.header,
        headerImage: headerImageToSave,
      }

      // Use the fixed singleton documentId
      const documentId = 'emailSettings'
      
      // Check if document exists
      const existingDoc = await sanityClient.fetch(
        `*[_id == $documentId][0]`,
        { documentId }
      )

      if (existingDoc) {
        // Update existing document
        await sanityClient
          .patch(documentId)
          .set({
            name: localSettings.name,
            description: localSettings.description,
            emailInfo: localSettings.emailInfo,
            memberSettings: localSettings.memberSettings,
            header: headerToSave,
            titleSection: localSettings.titleSection,
            footer: localSettings.footer,
            emailFooter: localSettings.emailFooter,
            global: localSettings.global,
            headerDesign: localSettings.headerDesign,
            body: localSettings.body,
          })
          .commit()
        
        // Update newsletterSettings to reflect saved state
        setNewsletterSettings({
          ...newsletterSettings,
          _id: documentId,
          ...localSettings,
          header: headerToSave,
        })
        setHeaderImageFile(null)
      } else {
        // Create new document with fixed documentId (singleton pattern)
        const created = await sanityClient.create({
          _id: documentId,
          _type: 'emailSettings',
          name: localSettings.name,
          description: localSettings.description,
          emailInfo: localSettings.emailInfo,
          memberSettings: localSettings.memberSettings,
          header: headerToSave,
          titleSection: localSettings.titleSection,
          footer: localSettings.footer,
          emailFooter: localSettings.emailFooter,
          global: localSettings.global,
          headerDesign: localSettings.headerDesign,
          body: localSettings.body,
        })
        setNewsletterSettings({ ...created, _id: documentId })
      }
    } catch (err) {
      console.error('Error saving newsletter settings:', err)
      alert('Failed to save newsletter settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="newsletter-editor-overlay" onClick={onClose}>
      <div className="newsletter-editor-container" onClick={(e) => e.stopPropagation()}>
        <div className="newsletter-editor-header">
          <div className="newsletter-editor-header-left">
            <h2 className="newsletter-editor-title">Newsletter</h2>
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
          <div className="newsletter-editor-header-actions">
            <button className="newsletter-close-button" onClick={onClose} disabled={saving}>
              Close
            </button>
            <button 
              className="newsletter-save-button" 
              onClick={handleSave} 
              disabled={saving || loading || !hasUnsavedChanges()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="newsletter-editor-content">
          {/* Left side - Preview */}
          <div className="newsletter-editor-preview">
            <div 
              className="newsletter-preview-content"
                style={{ 
                backgroundColor: getColorValue(localSettings.global?.backgroundColor, '#ffffff'),
                fontFamily: getBodyFontFamily()
              }}
            >
              <div className="newsletter-preview-from" style={{ fontFamily: getBodyFontFamily() }}>
                  <div><span>From:</span> {extractText(localSettings.emailInfo?.senderName) || 'WP for ENTERPRISES'} ({extractText(localSettings.emailInfo?.replyToEmail) || 'wp-for-enterprises@ghost.io'})</div>
                  <div><span>Reply-to:</span> {extractText(localSettings.emailInfo?.replyToEmail) || 'wp-for-enterprises@ghost.io'}</div>
                </div>
                <div className='newsletter-preview-overflow-container' style={{ fontFamily: getBodyFontFamily() }}>
                <div className="newsletter-preview-header" style={{ backgroundColor: getColorValue(localSettings.headerDesign?.headerBackgroundColor, '#ffffff') }} >
                  {(() => {
                    const headerImage = localSettings.header?.headerImage
                    const isImageObject = headerImage && typeof headerImage === 'object' && headerImage.asset
                    const imageUrl = isImageObject && headerImage.asset?._ref 
                      ? urlFor(headerImage).width(1200).url() 
                      : null
                    
                    return imageUrl && localSettings.header?.headerImage !== false ? (
                      <div className="newsletter-preview-header-image" style={{ width: '100%', marginBottom: '16px' }}>
                        <img 
                          src={imageUrl} 
                          alt={(headerImage as any)?.altText || 'Header image'} 
                          style={{ 
                            width: '100%', 
                            height: 'auto', 
                            display: 'block',
                            maxHeight: '300px',
                            objectFit: 'cover'
                          }} 
                        />
                      </div>
                    ) : null
                  })()}
                  <div className="newsletter-preview-logo">
                    {localSettings.header?.publicationIcon && (
                    
                    <div className="newsletter-preview-logo-square" style={{ fontFamily: getHeadingFontFamily() }}>
                      <img src={settings.siteIcon?.asset?.url} alt="Publication icon" />
                    </div>
                    )}
                    
                    {localSettings.header?.publicationTitle && (
                      <h4 
                        className="newsletter-preview-publication-title" 
                        style={{ 
                          fontFamily: getHeadingFontFamily(),
                          marginBottom: '4px',
                        }}
                      >
                        {extractText(localSettings.name) || 'WP for ENTERPRISES'}
                      </h4>
                    )}
                    {localSettings.header?.newsletterName && (
                      <h5 
                        className="newsletter-preview-newsletter-name"
                        style={{ 
                          fontFamily: getHeadingFontFamily(),
                          fontSize: '13px',
                          fontWeight: '400',
                          marginBottom: '4px',
                          color: 'rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        {extractText(localSettings.name) || 'WP for ENTERPRISES'}
                      </h5>
                    )}
                  </div>
                  {localSettings.titleSection?.postTitle && (
                    <h1 
                      className="newsletter-preview-title"
                      style={{
                        color: getColorValue(localSettings.headerDesign?.postTitleColor, '#15171a'),
                        textAlign: localSettings.headerDesign?.titleAlignment || 'left',
                        fontFamily: getHeadingFontFamily(),
                        fontWeight: localSettings.global?.headingWeight || '700'
                      }}
                    >
                      Your email newsletter
                    </h1>
                  )}
                  {localSettings.titleSection?.postExcerpt && (
                    <p className="newsletter-preview-subtitle" style={{ 
                      fontFamily: getBodyFontFamily(),
                      textAlign: localSettings.headerDesign?.titleAlignment || 'left',

                      }}>
                      {extractText(localSettings.description) || 'A subtitle to highlight key points and engage your readers.'}
                    </p>
                  )}
                  <div className={`newsletter-preview-meta-container ${localSettings.headerDesign?.titleAlignment === 'left' ? 'left' : localSettings.headerDesign?.titleAlignment === 'center' ? 'center' : 'right'}`} 
                  style={{ fontFamily: getBodyFontFamily() }}>
                    <div className="newsletter-preview-meta">By Pathik Panchal • 24 Nov 2025</div>
                    <a 
                      href="#" 
                      className="newsletter-preview-link"
                      style={{
                        color: getColorValue(localSettings.body?.linkColor, '#ffbd59'),
                        textDecoration: localSettings.body?.linkStyle === 'underline' ? 'underline' : localSettings.body?.linkStyle === 'regular' ? 'none' : 'none',
                        fontFamily: getBodyFontFamily()
                      }}
                    >
                      View in browser
                    </a>
                  </div>
                  {localSettings.titleSection?.featureImage && (
                    <div className="newsletter-preview-image">
                      <div 
                        className="newsletter-image-placeholder"
                        style={{
                          borderRadius: localSettings.body?.imageCorners === 'rounded' ? '8px' : localSettings.body?.imageCorners === 'square' ? '0' : '0',
                        }}
                      >
                        Feature image
                      </div>
                      <div className="newsletter-image-caption" style={{ fontFamily: getBodyFontFamily() }}>Feature image caption</div>
                    </div>
                  )}
                </div>
                <div className='newsletter-preview-description-container' style={{ fontFamily: getBodyFontFamily() }}>
                  <p className="newsletter-preview-description" style={{ fontFamily: getBodyFontFamily() }}>
                    This is what your content will look like when you send one of your posts as an email newsletter to your subscribers.
                  </p>
                  <p className="newsletter-preview-description" style={{ fontFamily: getBodyFontFamily() }}>
                    Over there on the right you'll see some settings that allow you to customize the look and feel of this template – from colors and typography to layout and buttons – to make it perfectly suited to your brand.
                  </p>
                  <p className="newsletter-preview-description" style={{ fontFamily: getBodyFontFamily() }}>
                  Email templates are exceptionally finnicky to make, but we've spent a long time optimising this one to make it work beautifully across devices, email clients and content types. So, you can trust that every email you send with Ghost will look great and work well. Just like the rest of your site.
                  </p>
                  <div className="newsletter-preview-divider" style={{ 
                      borderTop: `1px solid ${getColorValue(localSettings.body?.dividerColor, '#e5eff5')}`,
                      marginTop: '52px',
                      marginBottom: '52px',
                    }}>
                  </div>
                  <h3 className="newsletter-preview-h3" 
                  style={{ 
                    fontFamily: getHeadingFontFamily(), 
                    fontWeight: localSettings.global?.headingWeight || '700',
                    color: getColorValue(localSettings.body?.sectionTitleColor, '#15171a'),
                    }}>Need inspiration?</h3>
                  <p className="newsletter-preview-description" style={{ fontFamily: getBodyFontFamily() }}>
                  We've put together a <a href="#" style={{ color: getColorValue(localSettings.body?.linkColor, '#ffbd59'), textDecoration: localSettings.body?.linkStyle === 'underline' ? 'underline' : localSettings.body?.linkStyle === 'regular' ? 'none' : 'none', fontWeight: localSettings.body?.linkStyle === 'bold' ? 'bold' : 'normal', fontFamily: getBodyFontFamily() }}>quick guide</a> that walks through all of the available settings, along with a few examples of what's possible.</p>

                  <a style={{ 
                    marginTop: '0',
                    padding: '8px 18px',
                    backgroundColor: localSettings.body?.buttonStyle !== 'outline' ? getColorValue(localSettings.body?.buttonColor, '#ffbd59') : '',
                    color: localSettings.body?.buttonStyle === 'outline' ? getColorValue(localSettings.body?.buttonColor, '#ffbd59') : '#15171a',
                    border: localSettings.body?.buttonStyle === 'outline' ? `1px solid ${getColorValue(localSettings.body?.buttonColor, '#ffbd59')}` : `1px solid ${getColorValue(localSettings.body?.buttonColor, '#ffbd59')}`,
                    borderRadius: localSettings.body?.buttonCorners === 'square' ? '0' : localSettings.body?.buttonCorners === 'rounded' ? '6px' : localSettings.body?.buttonCorners === 'circle' ? '24px' : '4px',
                    textAlign: 'center',
                    fontWeight: '600',
                    display: 'inline-block',
                    minWidth: '120px',
                    fontFamily: getBodyFontFamily(),
                    fontSize: '15px',
                    lineHeight: '27.2px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>
                    Button Preview
                  </a>
                  {localSettings.footer?.askReadersForFeedback && (
                    <div className="newsletter-preview-feedback" style={{ 
                      borderTop: `1px solid ${getColorValue(localSettings.body?.dividerColor, '#e5eff5')}`,
                      paddingTop: '16px',
                      marginTop: '24px'
                    }}>
                      <p style={{ color: '#15171a', fontWeight: '600', marginBottom: '12px',lineHeight: '1.11em', margin: '0', padding: '8px 0 8px', fontSize: '13px', textTransform: 'uppercase', paddingBottom: '16px', fontFamily: getHeadingFontFamily() }}>Feedback</p>
                    </div>
                  )}
                  {localSettings.footer?.addLinkToComments && (
                    <div className="newsletter-preview-comments">
                      <a 
                        href="#"
                        style={{
                          color: getColorValue(localSettings.body?.linkColor, '#ffbd59'),
                          textDecoration: localSettings.body?.linkStyle === 'underline' ? 'underline' : localSettings.body?.linkStyle === 'regular' ? 'none' : 'none',
                          fontWeight: localSettings.body?.linkStyle === 'bold' ? 'bold' : 'normal',
                          fontFamily: getBodyFontFamily()
                        }}
                      >
                        Add a comment
                      </a>
                    </div>
                  )}
                  {localSettings.footer?.shareLatestPosts && (
                    <div className="newsletter-preview-latest" style={{ 
                      borderTop: `1px solid ${getColorValue(localSettings.body?.dividerColor, '#e5eff5')}`,
                      paddingTop: '16px',
                      marginTop: '24px'
                    }}>
                      <p style={{ color: '#15171a', fontWeight: '600', marginBottom: '12px',lineHeight: '1.11em', margin: '0', padding: '8px 0 8px', fontSize: '13px', textTransform: 'uppercase', paddingBottom: '16px', fontFamily: getHeadingFontFamily() }}>Keep reading</p>
                      <div className="newsletter-preview-latest-posts">
                        {latestPosts.map((post) => (
                          <div key={post._id} className="newsletter-preview-latest-post">
                            <a href={`${process.env.NEXT_PUBLIC_SITE_URL}/${post.slug}`} style={{ color: getColorValue(localSettings.body?.linkColor, '#ffbd59'), textDecoration: localSettings.body?.linkStyle === 'underline' ? 'underline' : localSettings.body?.linkStyle === 'regular' ? 'none' : 'none', fontWeight: localSettings.body?.linkStyle === 'bold' ? 'bold' : 'normal', fontFamily: getBodyFontFamily() }}>
                              <div className="newsletter-preview-latest-post-title">
                                <h3 style={{ fontFamily: getHeadingFontFamily(), fontWeight: localSettings.global?.headingWeight || '700', color: getColorValue(localSettings.body?.sectionTitleColor, '#15171a') }}>{post.title}</h3>
                                <p style={{ fontFamily: getBodyFontFamily() }}>{post.excerpt}</p>
                              </div>
                              <div className="newsletter-preview-latest-post-image">
                                <img src={post.imageUrl} alt={post.title} />
                              </div>
                            </a>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}
                  {localSettings.footer?.showSubscriptionDetails && (
                    <div className="newsletter-preview-subscription" style={{ 
                      borderTop: `1px solid ${getColorValue(localSettings.body?.dividerColor, '#e5eff5')}`,
                      paddingTop: '16px',
                      marginTop: '24px',
                      fontSize: '12px',
                      color: '#738a94'
                    }}>
                      <p style={{ fontFamily: getBodyFontFamily() }}>You're receiving this because you're subscribed to {extractText(localSettings.name) || 'WP for ENTERPRISES'}</p>
                    </div>
                  )}
                  <div className="newsletter-preview-footer" style={{ 
                      borderTop: `1px solid ${getColorValue(localSettings.body?.dividerColor, '#e5eff5')}`,
                      paddingTop: '16px',
                      marginTop: '24px',
                      fontSize: '12px',
                      color: '#738a94',
                      textAlign: 'center',
                    }}>
                  {localSettings.emailFooter?.text && (
                    <p style={{ fontFamily: getBodyFontFamily() }}>{extractText(localSettings.emailFooter.text)}</p>
                  )}
                   <p style={{ fontFamily: getBodyFontFamily() }}>WP for ENTERPRISES © 2025 - <a href="#" style={{ color: getColorValue(localSettings.body?.linkColor, '#ffbd59'), textDecoration: localSettings.body?.linkStyle === 'underline' ? 'underline' : localSettings.body?.linkStyle === 'regular' ? 'none' : 'none', fontWeight: localSettings.body?.linkStyle === 'bold' ? 'bold' : 'normal', fontFamily: getBodyFontFamily() }}>Unsubscribe</a>
                   </p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Settings */}
          <div className="newsletter-editor-settings">
            <div className="newsletter-settings-tabs">
              <button
                className={`newsletter-settings-tab ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                General
              </button>
              <button
                className={`newsletter-settings-tab ${activeTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveTab('content')}
              >
                Content
              </button>
              <button
                className={`newsletter-settings-tab ${activeTab === 'design' ? 'active' : ''}`}
                onClick={() => setActiveTab('design')}
              >
                Design
              </button>
            </div>

            <div className="newsletter-settings-scroll">
              {loading ? (
                <div className="newsletter-settings-loading">Loading settings...</div>
              ) : activeTab === 'general' ? (
                <>
                  <div className="newsletter-setting-group">
                    <h3 className="newsletter-setting-group-title">Name and description</h3>
                    
                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Name</label>
                      <input
                        type="text"
                        value={localSettings.name || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })}
                        className="newsletter-setting-input"
                        placeholder="WP for ENTERPRISES"
                      />
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Description</label>
                      <textarea
                        value={localSettings.description || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, description: e.target.value })}
                        className="newsletter-setting-textarea"
                        rows={2}
                        placeholder="Where we go behind the scenes of BILLION-DOLLAR WordPress websites"
                      />
                    </div>
                  </div>

                  <div className="newsletter-setting-group">
                    <h3 className="newsletter-setting-group-title">Email info</h3>
                    
                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Sender name</label>
                      <input
                        type="text"
                        value={localSettings.emailInfo?.senderName || ''}
                        onChange={(e) => setLocalSettings({ 
                          ...localSettings, 
                          emailInfo: { 
                            ...localSettings.emailInfo, 
                            senderName: e.target.value 
                          } 
                        })}
                        className="newsletter-setting-input"
                        placeholder="WP for ENTERPRISES"
                      />
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Reply-to email</label>
                      <input
                        type="email"
                        value={localSettings.emailInfo?.replyToEmail || ''}
                        onChange={(e) => setLocalSettings({ 
                          ...localSettings, 
                          emailInfo: { 
                            ...localSettings.emailInfo, 
                            replyToEmail: e.target.value 
                          } 
                        })}
                        className="newsletter-setting-input"
                        placeholder="wp-for-enterprises@ghost.io"
                      />
                    </div>
                  </div>

                  <div className="newsletter-setting-group">
                    <h3 className="newsletter-setting-group-title">Member settings</h3>
                    
                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Subscribe new members on signup</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.memberSettings?.subscribeNewMembersOnSignup ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            memberSettings: {
                              ...localSettings.memberSettings,
                              subscribeNewMembersOnSignup: !localSettings.memberSettings?.subscribeNewMembersOnSignup
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : activeTab === 'content' ? (
                <>
                  <div className="newsletter-setting-group">
                    <h3 className="newsletter-setting-group-title">Header</h3>
                    
                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Header image</label>
                      {(() => {
                        const headerImage = localSettings.header?.headerImage
                        const isImageObject = headerImage && typeof headerImage === 'object' && headerImage.asset
                        const imageUrl = isImageObject && headerImage.asset?._ref 
                          ? urlFor(headerImage).width(800).url() 
                          : null
                        
                        return imageUrl ? (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ position: 'relative', marginBottom: '8px' }}>
                              <img 
                                src={imageUrl} 
                                alt="Header image" 
                                style={{ 
                                  width: '100%', 
                                  height: 'auto', 
                                  borderRadius: '8px',
                                  maxHeight: '200px',
                                  objectFit: 'cover'
                                }} 
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalSettings({
                                    ...localSettings,
                                    header: {
                                      ...localSettings.header,
                                      headerImage: true, // Reset to boolean true
                                    }
                                  })
                                  setHeaderImageFile(null)
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  background: 'rgba(255, 255, 255, 0.9)',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                                title="Remove image"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </div>
                            <label 
                              className="newsletter-image-upload-button"
                              style={{ 
                                display: 'inline-block',
                                padding: '8px 16px',
                                background: '#f1f3f4',
                                border: '1px solid #e6e9eb',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#15171a'
                              }}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    setHeaderImageFile(file)
                                    handleHeaderImageUpload(file)
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                              Change image
                            </label>
                          </div>
                        ) : (
                          <>
                            <label 
                              className="newsletter-image-upload-placeholder"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '32px',
                                border: '2px dashed #e6e9eb',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: '#f8f9fa',
                                transition: 'background 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f1f3f4'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f8f9fa'
                              }}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    setHeaderImageFile(file)
                                    handleHeaderImageUpload(file)
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '8px', color: '#738a94' }}>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                              <span style={{ color: '#738a94', fontSize: '14px' }}>Click to upload header image</span>
                            </label>
                          </>
                        )
                      })()}
                      <p className="newsletter-setting-description">1200×600 recommended. Use a transparent PNG for best results on any background.</p>
                    </div>

                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Publication icon</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.header?.publicationIcon ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            header: {
                              ...localSettings.header,
                              publicationIcon: !localSettings.header?.publicationIcon
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Publication title</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.header?.publicationTitle ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            header: {
                              ...localSettings.header,
                              publicationTitle: !localSettings.header?.publicationTitle
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Newsletter name</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.header?.newsletterName ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            header: {
                              ...localSettings.header,
                              newsletterName: !localSettings.header?.newsletterName
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="newsletter-setting-group">
                    <h3 className="newsletter-setting-group-title">Title section</h3>
                    
                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Post title</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.titleSection?.postTitle ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            titleSection: {
                              ...localSettings.titleSection,
                              postTitle: !localSettings.titleSection?.postTitle
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Post excerpt</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.titleSection?.postExcerpt ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            titleSection: {
                              ...localSettings.titleSection,
                              postExcerpt: !localSettings.titleSection?.postExcerpt
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Feature image</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.titleSection?.featureImage ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            titleSection: {
                              ...localSettings.titleSection,
                              featureImage: !localSettings.titleSection?.featureImage
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="newsletter-setting-group">
                    <h3 className="newsletter-setting-group-title">Footer</h3>
                    
                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Ask your readers for feedback</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.footer?.askReadersForFeedback ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            footer: {
                              ...localSettings.footer,
                              askReadersForFeedback: !localSettings.footer?.askReadersForFeedback
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Add a link to your comments</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.footer?.addLinkToComments ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            footer: {
                              ...localSettings.footer,
                              addLinkToComments: !localSettings.footer?.addLinkToComments
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Share your latest posts</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.footer?.shareLatestPosts ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            footer: {
                              ...localSettings.footer,
                              shareLatestPosts: !localSettings.footer?.shareLatestPosts
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <div className="newsletter-toggle-setting">
                        <label className="newsletter-setting-label">Show subscription details</label>
                        <button
                          className={`newsletter-toggle-switch ${localSettings.footer?.showSubscriptionDetails ? 'on' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            footer: {
                              ...localSettings.footer,
                              showSubscriptionDetails: !localSettings.footer?.showSubscriptionDetails
                            }
                          })}
                        >
                          <div className="newsletter-toggle-slider"></div>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Email footer</label>
                      <textarea
                        value={localSettings.emailFooter?.text || ''}
                        onChange={(e) => setLocalSettings({ 
                          ...localSettings, 
                          emailFooter: {
                            ...localSettings.emailFooter,
                            text: e.target.value
                          }
                        })}
                        className="newsletter-setting-textarea"
                        rows={2}
                        placeholder="Any extra information or legal text"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="newsletter-setting-group">
                    <h3 className="newsletter-setting-group-title">Global</h3>
                    
                    <div className="newsletter-setting-item bg-color-setting-item">
                      <label className="newsletter-setting-label">Background color</label>
                      <div className="newsletter-color-input-wrapper">
                        <input
                          type="color"
                          value={getColorValue(localSettings.global?.backgroundColor, '#ffffff')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            global: {
                              ...localSettings.global,
                              backgroundColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-input"
                        />
                        <input
                          type="text"
                          value={getColorValue(localSettings.global?.backgroundColor, '#ffffff')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            global: {
                              ...localSettings.global,
                              backgroundColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-text-input"
                        />
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <GoogleFontInput
                        label="Heading font"
                        value={localSettings.global?.headingFont || ''}
                        onChange={(value) => setLocalSettings({ 
                          ...localSettings, 
                          global: {
                            ...localSettings.global,
                            headingFont: value || 'Clean sans-serif'
                          }
                        })}
                      />
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Heading weight</label>
                      <select
                        value={localSettings.global?.headingWeight || '700'}
                        onChange={(e) => setLocalSettings({ 
                          ...localSettings, 
                          global: {
                            ...localSettings.global,
                            headingWeight: e.target.value
                          }
                        })}
                        className="newsletter-setting-select"
                      >
                        <option value="100">100</option>
                        <option value="200">200</option>
                        <option value="300">300</option>
                        <option value="400">400</option>
                        <option value="500">500</option>
                        <option value="600">600</option>
                        <option value="700">700</option>
                        <option value="800">800</option>
                        <option value="900">900</option>
                      </select>
                    </div>

                    <div className="newsletter-setting-item">
                      <GoogleFontInput
                        label="Body font"
                        value={localSettings.global?.bodyFont || ''}
                        onChange={(value) => setLocalSettings({ 
                          ...localSettings, 
                          global: {
                            ...localSettings.global,
                            bodyFont: value || 'Clean sans-serif'
                          }
                        })}
                      />
                    </div>
                  </div>

                  <div className="newsletter-setting-group design-settings-group">
                    <h3 className="newsletter-setting-group-title">Header</h3>
                    
                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Header background color</label>
                      <div className="newsletter-color-input-wrapper">
                        <input
                          type="color"
                          value={getColorValue(localSettings.headerDesign?.headerBackgroundColor, '#ffffff')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            headerDesign: {
                              ...localSettings.headerDesign,
                              headerBackgroundColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-input"
                        />
                        <input
                          type="text"
                          value={getColorValue(localSettings.headerDesign?.headerBackgroundColor, '#ffffff')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            headerDesign: {
                              ...localSettings.headerDesign,
                              headerBackgroundColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-text-input"
                        />
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Post title color</label>
                      <div className="newsletter-color-input-wrapper">
                        <input
                          type="color"
                          value={getColorValue(localSettings.headerDesign?.postTitleColor, '#15171a')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            headerDesign: {
                              ...localSettings.headerDesign,
                              postTitleColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-input"
                        />
                        <input
                          type="text"
                          value={getColorValue(localSettings.headerDesign?.postTitleColor, '#15171a')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            headerDesign: {
                              ...localSettings.headerDesign,
                              postTitleColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-text-input"
                        />
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Title alignment</label>
                      <div className="newsletter-alignment-buttons">
                        <button
                          className={`newsletter-alignment-button ${localSettings.headerDesign?.titleAlignment === 'left' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            headerDesign: {
                              ...localSettings.headerDesign,
                              titleAlignment: 'left'
                            }
                          })}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="15" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                          </svg>
                        </button>
                        <button
                          className={`newsletter-alignment-button ${localSettings.headerDesign?.titleAlignment === 'center' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            headerDesign: {
                              ...localSettings.headerDesign,
                              titleAlignment: 'center'
                            }
                          })}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="9" y1="12" x2="15" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="newsletter-setting-group design-settings-group">
                    <h3 className="newsletter-setting-group-title">Body</h3>
                    
                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Section title color</label>
                      <div className="newsletter-color-input-wrapper">
                        <input
                          type="color"
                          value={getColorValue(localSettings.body?.sectionTitleColor, '#15171a')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              sectionTitleColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-input"
                        />
                        <input
                          type="text"
                          value={getColorValue(localSettings.body?.sectionTitleColor, '#15171a')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              sectionTitleColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-text-input"
                        />
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Button color</label>
                      <div className="newsletter-color-input-wrapper">
                        <input
                          type="color"
                          value={getColorValue(localSettings.body?.buttonColor, '#ffbd59')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              buttonColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-input"
                        />
                        <input
                          type="text"
                          value={getColorValue(localSettings.body?.buttonColor, '#ffbd59')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              buttonColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-text-input"
                        />
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Button style</label>
                      <div className="newsletter-style-buttons">
                        <button
                          className={`newsletter-style-button ${localSettings.body?.buttonStyle === 'fill' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              buttonStyle: 'fill'
                            }
                          })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none size-5 "><path fill='#15171a' d="M17 2H7C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ></path></svg>
                          <span>Fill</span>
                        </button>
                        <button
                          className={`newsletter-style-button ${localSettings.body?.buttonStyle === 'outline' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              buttonStyle: 'outline'
                            }
                          })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none size-5 "><path d="M17 2H7C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ></path></svg>
                          <span>Outline</span>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Button corners</label>
                      <div className="newsletter-corners-buttons">
                        <button
                          className={`newsletter-corners-button ${localSettings.body?.buttonCorners === 'square' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              buttonCorners: 'square'
                            }
                          })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none size-5 "><path d="M22 2H2V22H22V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ></path></svg>
                          <span>Square</span>
                        </button>
                        <button
                          className={`newsletter-corners-button ${localSettings.body?.buttonCorners === 'rounded' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              buttonCorners: 'rounded'
                            }
                          })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none size-5 "><path d="M17 2H7C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ></path></svg>
                          <span>Rounded</span>
                        </button>
                        <button
                          className={`newsletter-corners-button ${localSettings.body?.buttonCorners === 'circle' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              buttonCorners: 'circle'
                            }
                          })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none size-5 "><path d="M12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1C5.92487 1 1 5.92487 1 12C1 18.0751 5.92487 23 12 23Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ></path></svg>
                          <span>Circle</span>
                          </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Link color</label>
                      <div className="newsletter-color-input-wrapper">
                        <input
                          type="color"
                          value={getColorValue(localSettings.body?.linkColor, '#ffbd59')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              linkColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-input"
                        />
                        <input
                          type="text"
                          value={getColorValue(localSettings.body?.linkColor, '#ffbd59')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              linkColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-text-input"
                        />
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Link style</label>
                      <div className="newsletter-link-style-buttons">
                        <button
                          className={`newsletter-link-style-button ${localSettings.body?.linkStyle === 'underline' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              linkStyle: 'underline'
                            }
                          })}
                        >
                          <span style={{ textDecoration: 'underline' }}>U</span>
                        </button>
                        <button
                          className={`newsletter-link-style-button ${localSettings.body?.linkStyle === 'regular' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              linkStyle: 'regular'
                            }
                          })}
                        >
                          <span>T</span>
                        </button>
                        <button
                          className={`newsletter-link-style-button ${localSettings.body?.linkStyle === 'bold' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              linkStyle: 'bold'
                            }
                          })}
                        >
                          <span style={{ fontWeight: 'bold' }}>B</span>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Image corners</label>
                      <div className="newsletter-corners-buttons">
                        <button
                          className={`newsletter-corners-button ${localSettings.body?.imageCorners === 'square' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              imageCorners: 'square'
                            }
                          })}
                        >
                           <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none size-5 "><path d="M22 2H2V22H22V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ></path></svg>
                           <span>Square</span>
                        </button>
                        <button
                          className={`newsletter-corners-button ${localSettings.body?.imageCorners === 'rounded' ? 'active' : ''}`}
                          onClick={() => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              imageCorners: 'rounded'
                            }
                          })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none size-5 "><path d="M17 2H7C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ></path></svg>
                          <span>Rounded</span>
                        </button>
                      </div>
                    </div>

                    <div className="newsletter-setting-item">
                      <label className="newsletter-setting-label">Divider color</label>
                      <div className="newsletter-color-input-wrapper">
                        <input
                          type="color"
                          value={getColorValue(localSettings.body?.dividerColor, '#e5eff5')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              dividerColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-input"
                        />
                        <input
                          type="text"
                          value={getColorValue(localSettings.body?.dividerColor, '#e5eff5')}
                          onChange={(e) => setLocalSettings({ 
                            ...localSettings, 
                            body: {
                              ...localSettings.body,
                              dividerColor: { 
                                _type: 'simplerColor',
                                label: 'Custom', 
                                value: e.target.value 
                              }
                            }
                          })}
                          className="newsletter-color-text-input"
                        />
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

