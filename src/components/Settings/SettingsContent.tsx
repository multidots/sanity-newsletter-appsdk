import React, { useState, useEffect } from 'react'
import '../../css/SettingsContent.css'
import { sanityClient } from '../../lib/sanity-client'
import { DesignEditor } from '../DesignEditor'
import { NewsletterEditor } from '../NewsletterEditor'
import { NavigationEditor } from '../NavigationEditor'
import { TimezoneInput } from '../TimezoneInput'
import { useToast } from '../../contexts/ToastContext'

interface SettingsContentProps {
  activeSetting: string
  onClose: () => void
}

interface GeneralSettings {
  _id?: string
  siteTitle?: string
  siteDescription?: string
  siteTimezone?: string
  publicationLanguage?: string
  newsletterSending?: boolean
  newsletterDefaultRecipients?: 'postAccess' | 'allMembers' | 'paidMembers' | 'specificPeople' | 'nobody'
  facebook?: string
  xProfile?: string
}

interface EmailSettings {
  _id?: string
  name?: string
  description?: string
  emailInfo?: {
    senderName?: string
    replyToEmail?: string
  }
}

interface MetaDataSettings {
  _id?: string
  meta?: {
    googleSearch?: {
      title?: string
      description?: string
    }
    xCard?: {
      title?: string
      description?: string
      image?: {
        asset?: {
          _ref?: string
          _type?: string
          url?: string
          _id?: string
        }
        url?: string
      }
    }
    facebookCard?: {
      title?: string
      description?: string
      image?: {
        asset?: {
          _ref?: string
          _type?: string
          url?: string
          _id?: string
        }
        url?: string
      }
    }
  }
}

interface NavigationMenuItem {
  _key?: string
  menuItemType?: 'single' | 'group'
  title?: string
  linkType?: 'internal' | 'external'
  pageReference?: {
    _ref?: string
    _type?: string
    _id?: string
    title?: string
    slug?: {
      current?: string
    }
  }
  externalUrl?: string
  isButton?: boolean
  pageReferences?: Array<{
    _ref?: string
    _type?: string
    _id?: string
    title?: string
    slug?: {
      current?: string
    }
  }>
}

interface NavigationSettings {
  _id?: string
  navbarMenuItems?: NavigationMenuItem[]
}

export function SettingsContent({ activeSetting, onClose }: SettingsContentProps) {
  const { showToast } = useToast()
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({})
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({})
  const [metaDataSettings, setMetaDataSettings] = useState<MetaDataSettings>({})
  const [navigationSettings, setNavigationSettings] = useState<NavigationSettings>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [showDesignEditor, setShowDesignEditor] = useState(false)
  const [showNewsletterEditor, setShowNewsletterEditor] = useState(false)
  const [showNavigationEditor, setShowNavigationEditor] = useState(false)
  const [newsletterSendingEnabled, setNewsletterSendingEnabled] = useState(true)
  const [defaultRecipients, setDefaultRecipients] = useState('whoever-has-access')

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true)
      try {
        const [general, email, metaData, navigation] = await Promise.all([
          sanityClient.fetch<GeneralSettings>(
            `*[_id == "generalSettings"][0] {
              _id,
              siteTitle,
              siteDescription,
              siteTimezone,
              publicationLanguage,
              newsletterSending,
              newsletterDefaultRecipients,
              facebook,
              xProfile
            }`
          ),
          sanityClient.fetch<EmailSettings>(
            `*[_type == "emailSettings"][0] {
              _id,
              name,
              description,
              emailInfo
            }`
          ),
          sanityClient.fetch<MetaDataSettings>(
            `*[_type == "generalSettings"][0] {
              _id,
              meta {
                googleSearch {
                  title,
                  description
                },
                xCard {
                  title,
                  description,
                  image {
                    asset-> {
                      _id,
                      url
                    }
                  }
                },
                facebookCard {
                  title,
                  description,
                  image {
                    asset-> {
                      _id,
                      url
                    }
                  }
                }
              }
            }`
          ),
          sanityClient.fetch<NavigationSettings>(
            `*[_type == "navigationSettings"][0] {
              _id,
              navbarMenuItems[] {
                _key,
                menuItemType,
                title,
                linkType,
                pageReference-> {
                  _id,
                  _type,
                  title,
                  slug {
                    current
                  }
                },
                externalUrl,
                isButton,
                pageReferences[]-> {
                  _id,
                  _type,
                  title,
                  slug {
                    current
                  }
                }
              }
            }`
          ),
        ])
        setGeneralSettings(general || {})
        setEmailSettings(email || {})
        setMetaDataSettings(metaData || {})
        setNavigationSettings(navigation || {})
        setNewsletterSendingEnabled(general?.newsletterSending ?? true)
        
        // Map schema values to UI values for default recipients
        const mapSchemaToUI = (schemaValue?: string): string => {
          const mapping: Record<string, string> = {
            'postAccess': 'whoever-has-access',
            'allMembers': 'all-members',
            'paidMembers': 'paid-members-only',
            'specificPeople': 'specific-people',
            'nobody': 'usually-nobody'
          }
          return mapping[schemaValue || 'postAccess'] || 'whoever-has-access'
        }
        setDefaultRecipients(mapSchemaToUI(general?.newsletterDefaultRecipients))
        setFormData({
          siteTitle: general?.siteTitle || '',
          siteDescription: general?.siteDescription || '',
          siteTimezone: general?.siteTimezone || '',
          publicationLanguage: general?.publicationLanguage || 'en',
          emailName: email?.name || '',
          emailDescription: email?.description || '',
          senderName: email?.emailInfo?.senderName || '',
          replyToEmail: email?.emailInfo?.replyToEmail || '',
          metaTitle: metaData?.meta?.googleSearch?.title || general?.siteTitle || '',
          metaDescription: metaData?.meta?.googleSearch?.description || general?.siteDescription || '',
          xTitle: metaData?.meta?.xCard?.title || general?.siteTitle || '',
          xDescription: metaData?.meta?.xCard?.description || general?.siteDescription || '',
          xImageUrl: (metaData?.meta?.xCard?.image?.asset as any)?.url || metaData?.meta?.xCard?.image?.url || '',
          xImageFile: null,
          facebookTitle: metaData?.meta?.facebookCard?.title || general?.siteTitle || '',
          facebookDescription: metaData?.meta?.facebookCard?.description || general?.siteDescription || '',
          facebookImageUrl: (metaData?.meta?.facebookCard?.image?.asset as any)?.url || metaData?.meta?.facebookCard?.image?.url || '',
          facebookImageFile: null,
          navbarMenuItems: navigation?.navbarMenuItems || [],
          facebook: general?.facebook || '',
          xProfile: general?.xProfile || '',
        })
      } catch (err) {
        console.error('Error fetching settings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async (settingId: string) => {
    setSaving(true)
    try {
      if (settingId === 'title-description' && generalSettings._id) {
        await sanityClient
          .patch(generalSettings._id)
          .set({
            siteTitle: formData.siteTitle,
            siteDescription: formData.siteDescription,
          })
          .commit()
        setGeneralSettings(prev => ({
          ...prev,
          siteTitle: formData.siteTitle,
          siteDescription: formData.siteDescription,
        }))
      } else if (settingId === 'timezone' && generalSettings._id) {
        await sanityClient
          .patch(generalSettings._id)
          .set({ siteTimezone: formData.siteTimezone })
          .commit()
        setGeneralSettings(prev => ({ ...prev, siteTimezone: formData.siteTimezone }))
      } else if (settingId === 'publication-language' && generalSettings._id) {
        await sanityClient
          .patch(generalSettings._id)
          .set({ publicationLanguage: formData.publicationLanguage })
          .commit()
        setGeneralSettings(prev => ({ ...prev, publicationLanguage: formData.publicationLanguage }))
      } else if (settingId === 'social-accounts') {
        const documentId = 'generalSettings'
        
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
              facebook: formData.facebook,
              xProfile: formData.xProfile,
            })
            .commit()
        } else {
          // Create new document with fixed documentId (singleton pattern)
          await sanityClient.create({
            _id: documentId,
            _type: 'generalSettings',
            facebook: formData.facebook,
            xProfile: formData.xProfile,
          })
        }
        
        setGeneralSettings(prev => ({
          ...prev,
          _id: documentId,
          facebook: formData.facebook,
          xProfile: formData.xProfile,
        }))
        setEditing(null)
        showToast('Social accounts saved successfully', 'success')
      } else if (settingId === 'newsletters' && emailSettings._id) {
        await sanityClient
          .patch(emailSettings._id)
          .set({
            name: formData.emailName,
            description: formData.emailDescription,
            emailInfo: {
              senderName: formData.senderName,
              replyToEmail: formData.replyToEmail,
            },
          })
          .commit()
        setEmailSettings(prev => ({
          ...prev,
          name: formData.emailName,
          description: formData.emailDescription,
          emailInfo: {
            senderName: formData.senderName,
            replyToEmail: formData.replyToEmail,
          },
        }))
      } else if (settingId === 'meta-data' && metaDataSettings._id) {
        // Handle image uploads - prioritize file uploads over URLs
        let xCardImage = undefined
        let facebookCardImage = undefined

        // Upload X card image if file is provided
        if (formData.xImageFile) {
          try {
            const asset = await sanityClient.assets.upload('image', formData.xImageFile, {
              filename: formData.xImageFile.name || `x-card-${Date.now()}.jpg`,
            })
            xCardImage = {
              _type: 'image',
              asset: {
                _type: 'reference',
                _ref: asset._id,
              },
            }
          } catch (err) {
            console.error('Error uploading X card image:', err)
            alert('Failed to upload X card image. Please try again.')
          }
        } else if (formData.xImageUrl) {
          // Fallback to URL if file is not provided
          try {
            const imageRes = await fetch(formData.xImageUrl)
            if (imageRes.ok) {
              const buffer = await imageRes.arrayBuffer()
              const asset = await sanityClient.assets.upload('image', Buffer.from(buffer), {
                filename: `x-card-${Date.now()}.jpg`,
              })
              xCardImage = {
                _type: 'image',
                asset: {
                  _type: 'reference',
                  _ref: asset._id,
                },
              }
            }
          } catch (err) {
            console.error('Error uploading X card image from URL:', err)
          }
        }

        // Upload Facebook card image if file is provided
        if (formData.facebookImageFile) {
          try {
            const asset = await sanityClient.assets.upload('image', formData.facebookImageFile, {
              filename: formData.facebookImageFile.name || `facebook-card-${Date.now()}.jpg`,
            })
            facebookCardImage = {
              _type: 'image',
              asset: {
                _type: 'reference',
                _ref: asset._id,
              },
            }
          } catch (err) {
            console.error('Error uploading Facebook card image:', err)
            alert('Failed to upload Facebook card image. Please try again.')
          }
        } else if (formData.facebookImageUrl) {
          // Fallback to URL if file is not provided
          try {
            const imageRes = await fetch(formData.facebookImageUrl)
            if (imageRes.ok) {
              const buffer = await imageRes.arrayBuffer()
              const asset = await sanityClient.assets.upload('image', Buffer.from(buffer), {
                filename: `facebook-card-${Date.now()}.jpg`,
              })
              facebookCardImage = {
                _type: 'image',
                asset: {
                  _type: 'reference',
                  _ref: asset._id,
                },
              }
            }
          } catch (err) {
            console.error('Error uploading Facebook card image from URL:', err)
          }
        }

        // Build the update object
        const updateData: any = {
          meta: {
            googleSearch: {
              title: formData.metaTitle,
              description: formData.metaDescription,
            },
            xCard: {
              title: formData.xTitle,
              description: formData.xDescription,
            },
            facebookCard: {
              title: formData.facebookTitle,
              description: formData.facebookDescription,
            },
          },
        }

        // Only update image if we have a new one
        if (xCardImage) {
          updateData.meta.xCard.image = xCardImage
        }

        if (facebookCardImage) {
          updateData.meta.facebookCard.image = facebookCardImage
        }

        await sanityClient
          .patch(metaDataSettings._id)
          .set(updateData)
          .commit()

        setMetaDataSettings(prev => ({
          ...prev,
          meta: {
            googleSearch: {
              title: formData.metaTitle,
              description: formData.metaDescription,
            },
            xCard: {
              title: formData.xTitle,
              description: formData.xDescription,
              image: xCardImage || prev.meta?.xCard?.image,
            },
            facebookCard: {
              title: formData.facebookTitle,
              description: formData.facebookDescription,
              image: facebookCardImage || prev.meta?.facebookCard?.image,
            },
          },
        }))
      }
      setEditing(null)
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-content">
        <div className="settings-content-header">
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="settings-content-body">
          <div className="settings-loading">Loading settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-content">
      <div className="settings-content-header">
        <button className="close-button" onClick={onClose} aria-label="Close settings">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="pointer-events-none size-5 text-gray-500"><title>close</title><line x1="0.75" y1="23.249" x2="23.25" y2="0.749" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5px"></line><line x1="23.25" y1="23.249" x2="0.75" y2="0.749" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5px"></line></svg>
        </button>
      </div>
      <div className="settings-content-body">
        <h2 className="settings-section-title">General settings</h2>
        <SettingSection
          id="title-description"
          title="Title & description"
          description="The details used to identify your publication around the web"
          editing={editing === 'title-description'}
          onEdit={() => setEditing('title-description')}
          onCancel={() => setEditing(null)}
          onSave={() => handleSave('title-description')}
          saving={saving}
        >
          {editing === 'title-description' ? (
            <>
              <div className="setting-field">
                <label>Site title</label>
                <input
                  type="text"
                  value={formData.siteTitle}
                  onChange={(e) => setFormData({ ...formData, siteTitle: e.target.value })}
                  className="setting-input"
                />
              </div>
              <div className="setting-field">
                <label>Site description</label>
                <textarea
                  value={formData.siteDescription}
                  onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                  className="setting-textarea"
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <div className="setting-field">
                <label>Site title</label>
                <div className="setting-value">{generalSettings.siteTitle || ''}</div>
              </div>
              <div className="setting-field">
                <label>Site description</label>
                <div className="setting-value">{generalSettings.siteDescription || ''}</div>
              </div>
            </>
          )}
        </SettingSection>

        <SettingSection
          id="timezone"
          title="Site timezone"
          description="Set the time and date of your publication, used for all published posts"
          editing={editing === 'timezone'}
          onEdit={() => setEditing('timezone')}
          onCancel={() => setEditing(null)}
          onSave={() => handleSave('timezone')}
          saving={saving}
        >
          {editing === 'timezone' ? (
            <div className="setting-field">
              <label>Timezone</label>
              <TimezoneInput
                value={formData.siteTimezone || ''}
                onChange={(value) => setFormData({ ...formData, siteTimezone: value })}
              />
              <div className="setting-hint">The local time here is currently {new Date().toLocaleString()}</div>
            </div>
          ) : (
            <div className="setting-field">
              <label>Timezone</label>
              <div className="setting-value">{generalSettings.siteTimezone || ''}</div>
              <div className="setting-hint">The local time here is currently {new Date().toLocaleString()}</div>
            </div>
          )}
        </SettingSection>

        <SettingSection
          id="publication-language"
          title="Publication Language"
          description="Set the language/locale which is used on your site"
          editing={editing === 'publication-language'}
          onEdit={() => setEditing('publication-language')}
          onCancel={() => setEditing(null)}
          onSave={() => handleSave('publication-language')}
          saving={saving}
        >
          {editing === 'publication-language' ? (
            <div className="setting-field">
              <label>Site language</label>
              <input
                type="text"
                value={formData.publicationLanguage}
                onChange={(e) => setFormData({ ...formData, publicationLanguage: e.target.value })}
                className="setting-input"
                placeholder="e.g., en, en-US"
              />
              <div className="setting-hint">Default: English (en); find out more about using Ghost in other languages</div>
            </div>
          ) : (
            <div className="setting-field">
              <label>Site language</label>
              <div className="setting-value">{generalSettings.publicationLanguage || 'en'}</div>
              <div className="setting-hint">Default: English (en); find out more about using Ghost in other languages</div>
            </div>
          )}
        </SettingSection>

        <SettingSection
          id="meta-data"
          title="Meta data"
          description="Extra content for search engines and social accounts"
          editing={editing === 'meta-data'}
          onEdit={() => setEditing('meta-data')}
          onCancel={() => setEditing(null)}
          onSave={() => handleSave('meta-data')}
          saving={saving}
        >
          <MetaDataEditor
            editing={editing === 'meta-data'}
            formData={formData}
            setFormData={setFormData}
            metaDataSettings={metaDataSettings}
          />
        </SettingSection>

        <SettingSection
          id="social-accounts"
          title="Social accounts"
          description="Link your social accounts for full structured data and rich card support"
          editing={editing === 'social-accounts'}
          onEdit={() => setEditing('social-accounts')}
          onCancel={() => setEditing(null)}
          onSave={() => handleSave('social-accounts')}
          saving={saving}
        >
          {editing === 'social-accounts' ? (
            <>
              <div className="setting-field">
                <label>URL of your publication's Facebook Page</label>
                <input
                  type="url"
                  value={formData.facebook || generalSettings.facebook || ''}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  className="setting-input"
                  placeholder="https://www.facebook.com/yourpage"
                />
              </div>
              <div className="setting-field">
                <label>URL of your X profile</label>
                <input
                  type="url"
                  value={formData.xProfile || generalSettings.xProfile || ''}
                  onChange={(e) => setFormData({ ...formData, xProfile: e.target.value })}
                  className="setting-input"
                  placeholder="https://x.com/yourprofile"
                />
              </div>
            </>
          ) : (
            <>
              <div className="setting-field">
                <label>URL of your publication's Facebook Page</label>
                <div className="setting-value">{generalSettings.facebook || 'Not set'}</div>
              </div>
              <div className="setting-field">
                <label>URL of your X profile</label>
                <div className="setting-value">{generalSettings.xProfile || 'Not set'}</div>
              </div>
            </>
          )}
        </SettingSection>

        <SettingSection
          id="analytics"
          title="Analytics"
          description="Configure analytics tracking"
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
        >
          <div className="settings-placeholder">
            <p className="placeholder-hint">Analytics settings coming soon.</p>
          </div>
        </SettingSection>

        <SettingSection
          id="private-site"
          title="Make this site private"
          description="Restrict access to your site"
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
        >
          <div className="settings-placeholder">
            <p className="placeholder-hint">Private site settings coming soon.</p>
          </div>
        </SettingSection>

        <h2 className="settings-section-title">Site</h2>
        <SettingSection
          id="design-branding"
          title="Design & branding"
          description="Customize your site's appearance"
          editing={false}
          onEdit={() => setShowDesignEditor(true)}
          onCancel={() => {}}
        >
          <div className="settings-placeholder">
            <p className="placeholder-hint">Click Edit to customize your design and branding</p>
          </div>
        </SettingSection>

        <SettingSection
          id="theme"
          title="Theme"
          description="Choose and customize your theme"
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
        >
          <div className="settings-placeholder">
            <p className="placeholder-hint">Theme settings coming soon.</p>
          </div>
        </SettingSection>

        <SettingSection
          id="navigation"
          title="Navigation"
          description="Configure site navigation"
          editing={false}
          onEdit={() => setShowNavigationEditor(true)}
          onCancel={() => {}}
        >
          <div className="settings-placeholder">
            <p className="placeholder-hint">Click Edit to configure your navigation menu</p>
          </div>
        </SettingSection>

        <h2 className="settings-section-title">Membership</h2>
        <SettingSection
          id="access"
          title="Access"
          description="Configure member access settings"
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
        >
          <div className="settings-placeholder">
            <p className="placeholder-hint">Access settings coming soon.</p>
          </div>
        </SettingSection>

        <h2 className="settings-section-title">Email Newsletters</h2>
        
        <SettingSection
          id="newsletter-sending"
          title="Newsletter sending"
          description="Newsletter features are active, posts can be sent by email"
          editing={false}
        >
          <div className="setting-field">
            <div className="newsletter-toggle-container">
              <div className="newsletter-toggle-label">
                <span className="newsletter-status-enabled">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {newsletterSendingEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <button
                className={`newsletter-sending-toggle ${newsletterSendingEnabled ? 'on' : ''}`}
                onClick={async () => {
                  const newValue = !newsletterSendingEnabled
                  setNewsletterSendingEnabled(newValue)
                  
                  // Save immediately when toggled
                  const documentId = 'generalSettings'
                  
                  try {
                    // Check if document exists
                    const existingDoc = await sanityClient.fetch(
                      `*[_id == $documentId][0]`,
                      { documentId }
                    )

                    if (existingDoc) {
                      // Update existing document
                      await sanityClient
                        .patch(documentId)
                        .set({ newsletterSending: newValue })
                        .commit()
                    } else {
                      // Create new document with fixed documentId (singleton pattern)
                      await sanityClient.create({
                        _id: documentId,
                        _type: 'generalSettings',
                        newsletterSending: newValue,
                      })
                    }
                    
                    setGeneralSettings(prev => ({ ...prev, _id: documentId, newsletterSending: newValue }))
                    showToast('Newsletter sending setting saved successfully', 'success')
                  } catch (err) {
                    console.error('Error saving newsletter sending setting:', err)
                    // Revert on error
                    setNewsletterSendingEnabled(!newValue)
                    showToast('Failed to save newsletter sending setting', 'error')
                  }
                }}
              >
                <div className="newsletter-sending-toggle-slider"></div>
              </button>
            </div>
          </div>
        </SettingSection>

        <SettingSection
          id="default-recipients"
          title="Default recipients"
          description="When you publish new content, who do you usually want to send it to?"
          editing={false}
        >
          <div className="setting-field">
            <label>Default Newsletter recipients</label>
            <select
              value={defaultRecipients}
              onChange={async (e) => {
                const newUIValue = e.target.value
                setDefaultRecipients(newUIValue)
                
                // Map UI values to schema values
                const mapUIToSchema = (uiValue: string): 'postAccess' | 'allMembers' | 'paidMembers' | 'specificPeople' | 'nobody' => {
                  const mapping: Record<string, 'postAccess' | 'allMembers' | 'paidMembers' | 'specificPeople' | 'nobody'> = {
                    'whoever-has-access': 'postAccess',
                    'all-members': 'allMembers',
                    'paid-members-only': 'paidMembers',
                    'specific-people': 'specificPeople',
                    'usually-nobody': 'nobody'
                  }
                  return mapping[uiValue] || 'postAccess'
                }
                
                const schemaValue = mapUIToSchema(newUIValue)
                const documentId = 'generalSettings'
                
                try {
                  // Check if document exists
                  const existingDoc = await sanityClient.fetch(
                    `*[_id == $documentId][0]`,
                    { documentId }
                  )

                  if (existingDoc) {
                    // Update existing document
                    await sanityClient
                      .patch(documentId)
                      .set({ newsletterDefaultRecipients: schemaValue })
                      .commit()
                  } else {
                    // Create new document with fixed documentId (singleton pattern)
                    await sanityClient.create({
                      _id: documentId,
                      _type: 'generalSettings',
                      newsletterDefaultRecipients: schemaValue,
                    })
                  }
                  
                  setGeneralSettings(prev => ({ ...prev, _id: documentId, newsletterDefaultRecipients: schemaValue }))
                  showToast('Default recipients setting saved successfully', 'success')
                } catch (err) {
                  console.error('Error saving default recipients setting:', err)
                  // Revert on error
                  const mapSchemaToUI = (schemaValue?: string): string => {
                    const mapping: Record<string, string> = {
                      'postAccess': 'whoever-has-access',
                      'allMembers': 'all-members',
                      'paidMembers': 'paid-members-only',
                      'specificPeople': 'specific-people',
                      'nobody': 'usually-nobody'
                    }
                    return mapping[schemaValue || 'postAccess'] || 'whoever-has-access'
                  }
                  setDefaultRecipients(mapSchemaToUI(generalSettings?.newsletterDefaultRecipients))
                  showToast('Failed to save default recipients setting', 'error')
                }
              }}
              className="setting-select"
            >
              <option value="whoever-has-access">Whoever has access to the post</option>
              <option value="all-members">All members</option>
              <option value="paid-members-only">Paid-members only</option>
              <option value="specific-people">Specific people</option>
              <option value="usually-nobody">Usually nobody</option>
            </select>
            <div className="setting-hint">
              {defaultRecipients === 'whoever-has-access' && 'Free posts to everyone, premium posts sent to paid members'}
              {defaultRecipients === 'all-members' && 'Everyone who is subscribed to newsletter updates, whether free or paid members'}
              {defaultRecipients === 'paid-members-only' && 'People who have a premium subscription'}
              {defaultRecipients === 'specific-people' && 'Only people with any of the selected tiers or labels'}
              {defaultRecipients === 'usually-nobody' && 'Newsletters are off for new posts, but can be enabled when needed'}
            </div>
          </div>
        </SettingSection>

        <SettingSection
          id="newsletters"
          title="Newsletters"
          description="Edit details and customize your design"
          editing={false}
          onEdit={() => setShowNewsletterEditor(true)}
          onCancel={() => {}}
        >
          <div className="settings-placeholder">
            <p className="placeholder-hint">Click Edit to customize your newsletter details and design</p>
          </div>
        </SettingSection>
      </div>
      <DesignEditor
        isOpen={showDesignEditor}
        onClose={() => setShowDesignEditor(false)}
      />
      <NewsletterEditor
        isOpen={showNewsletterEditor}
        onClose={() => setShowNewsletterEditor(false)}
      />
      <NavigationEditor
        isOpen={showNavigationEditor}
        onClose={() => setShowNavigationEditor(false)}
      />
    </div>
  )
}

interface SettingSectionProps {
  id: string
  title: string
  description: string
  editing: boolean
  onEdit?: () => void
  onCancel?: () => void
  onSave?: () => void
  saving?: boolean
  children: React.ReactNode
}

interface MetaDataEditorProps {
  editing: boolean
  formData: any
  setFormData: (data: any) => void
  metaDataSettings: MetaDataSettings
}

function MetaDataEditor({ editing, formData, setFormData, metaDataSettings }: MetaDataEditorProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'x-card' | 'facebook-card'>('search')
  const [xImagePreview, setXImagePreview] = useState<string | null>(null)
  const [facebookImagePreview, setFacebookImagePreview] = useState<string | null>(null)

  // Initialize previews from existing images
  useEffect(() => {
    if (editing) {
      const xImageUrl = (metaDataSettings.meta?.xCard?.image?.asset as any)?.url || metaDataSettings.meta?.xCard?.image?.url
      const facebookImageUrl = (metaDataSettings.meta?.facebookCard?.image?.asset as any)?.url || metaDataSettings.meta?.facebookCard?.image?.url
      
      if (xImageUrl && !xImagePreview) {
        setXImagePreview(xImageUrl)
      }
      if (facebookImageUrl && !facebookImagePreview) {
        setFacebookImagePreview(facebookImageUrl)
      }
    }
  }, [editing, metaDataSettings, xImagePreview, facebookImagePreview])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'x' | 'facebook') => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        if (type === 'x') {
          setXImagePreview(result)
          setFormData({ ...formData, xImageFile: file, xImageUrl: '' })
        } else {
          setFacebookImagePreview(result)
          setFormData({ ...formData, facebookImageFile: file, facebookImageUrl: '' })
        }
      }
      reader.readAsDataURL(file)
    } else {
      // Clear preview if file is removed
      if (type === 'x') {
        setXImagePreview(null)
        setFormData({ ...formData, xImageFile: null, xImageUrl: '' })
      } else {
        setFacebookImagePreview(null)
        setFormData({ ...formData, facebookImageFile: null, facebookImageUrl: '' })
      }
    }
  }

  // Get preview URL - prioritize file preview, then existing image
  const getXImagePreview = () => {
    return xImagePreview || formData.xImageUrl || (metaDataSettings.meta?.xCard?.image?.asset as any)?.url || metaDataSettings.meta?.xCard?.image?.url
  }

  const getFacebookImagePreview = () => {
    return facebookImagePreview || formData.facebookImageUrl || (metaDataSettings.meta?.facebookCard?.image?.asset as any)?.url || metaDataSettings.meta?.facebookCard?.image?.url
  }

  return (
    <div className="meta-data-editor">
      <div className="meta-tabs">
        <button
          className={`meta-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          className={`meta-tab ${activeTab === 'x-card' ? 'active' : ''}`}
          onClick={() => setActiveTab('x-card')}
        >
          X card
        </button>
        <button
          className={`meta-tab ${activeTab === 'facebook-card' ? 'active' : ''}`}
          onClick={() => setActiveTab('facebook-card')}
        >
          Facebook card
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="meta-tab-content">
          {editing ? (
            <>
              <div className="setting-field">
                <label>Meta title</label>
                <input
                  type="text"
                  value={formData.metaTitle ||  ''}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  className="setting-input"
                  placeholder={formData.siteTitle || 'WP for ENTERPRISES'}
                />
                <div className="setting-hint">Recommended: 70 characters</div>
              </div>
              <div className="setting-field">
                <label>Meta description</label>
                <textarea
                  value={formData.metaDescription || ''}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  className="setting-textarea"
                  rows={3}
                  placeholder={formData.siteDescription || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}
                />
                <div className="setting-hint">Recommended: 156 characters</div>
              </div>
              <div className="meta-preview">
                <div className="preview-label">PREVIEW</div>
                <div className="google-preview">
                  <div className="google-header">
                    <div className="google-logo"><svg fill="none" viewBox="0 0 92 31" className="mr-7 h-7"><title>google</title><path d="M39.15 15.898c0 4.303-3.378 7.473-7.525 7.473s-7.526-3.17-7.526-7.473c0-4.334 3.38-7.474 7.526-7.474 4.147 0 7.526 3.14 7.526 7.474zm-3.294 0c0-2.69-1.958-4.529-4.231-4.529-2.273 0-4.231 1.84-4.231 4.529 0 2.662 1.958 4.528 4.231 4.528 2.273 0 4.231-1.87 4.231-4.528z" fill="#EA4335"></path><path d="M55.386 15.898c0 4.303-3.379 7.473-7.526 7.473-4.146 0-7.526-3.17-7.526-7.473 0-4.33 3.38-7.474 7.526-7.474 4.147 0 7.526 3.14 7.526 7.474zm-3.294 0c0-2.69-1.959-4.529-4.232-4.529s-4.231 1.84-4.231 4.529c0 2.662 1.958 4.528 4.231 4.528 2.273 0 4.232-1.87 4.232-4.528z" fill="#FBBC05"></path><path d="M70.945 8.875v13.418c0 5.52-3.267 7.774-7.13 7.774-3.636 0-5.825-2.423-6.65-4.404l2.868-1.19c.511 1.217 1.763 2.652 3.779 2.652 2.472 0 4.004-1.52 4.004-4.38V21.67h-.115c-.737.906-2.158 1.698-3.95 1.698-3.751 0-7.188-3.255-7.188-7.443 0-4.22 3.437-7.501 7.188-7.501 1.789 0 3.21.792 3.95 1.671h.115V8.88h3.129v-.004zm-2.895 7.05c0-2.632-1.763-4.556-4.005-4.556-2.273 0-4.177 1.924-4.177 4.556 0 2.604 1.904 4.501 4.177 4.501 2.242 0 4.005-1.897 4.005-4.501z" fill="#4285F4"></path><path d="M76.103 1.01v21.903H72.89V1.011h3.213z" fill="#34A853"></path><path d="M88.624 18.357l2.558 1.699c-.826 1.216-2.815 3.312-6.251 3.312-4.262 0-7.445-3.282-7.445-7.474 0-4.444 3.21-7.473 7.076-7.473 3.893 0 5.798 3.086 6.42 4.754l.341.85-10.028 4.137c.768 1.5 1.962 2.264 3.636 2.264 1.678 0 2.841-.822 3.693-2.069zm-7.87-2.688l6.703-2.774c-.368-.933-1.478-1.583-2.783-1.583-1.674 0-4.005 1.472-3.92 4.357z" fill="#EA4335"></path><path d="M11.936 13.953v-3.17h10.726c.105.552.159 1.206.159 1.914 0 2.378-.653 5.32-2.757 7.416-2.046 2.123-4.66 3.255-8.124 3.255-6.42 0-11.818-5.21-11.818-11.605C.122 5.368 5.52.158 11.94.158c3.551 0 6.081 1.389 7.982 3.198l-2.246 2.237c-1.363-1.273-3.21-2.264-5.74-2.264-4.688 0-8.354 3.764-8.354 8.434s3.666 8.434 8.354 8.434c3.041 0 4.773-1.216 5.882-2.322.9-.896 1.492-2.176 1.725-3.925l-7.607.003z" fill="#4285F4"></path></svg></div>
                    <div className="google-search-bar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="google-result">
                    <div className="google-result-header">
                      <div className="google-favicon">WP</div>
                      <div className="google-url">newsletter.multidots.com</div>
                    </div>
                    <div className="google-title">{formData.metaTitle || metaDataSettings.meta?.googleSearch?.title || 'WP for ENTERPRISES'}</div>
                    <div className="google-description">{formData.metaDescription || metaDataSettings.meta?.googleSearch?.description || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="setting-field">
                <label>Meta title</label>
                <div className="setting-value">{metaDataSettings.meta?.googleSearch?.title || formData.siteTitle || ''}</div>
              </div>
              <div className="setting-field">
                <label>Meta description</label>
                <div className="setting-value">{metaDataSettings.meta?.googleSearch?.description || formData.siteDescription || ''}</div>
              </div>
              <div className="meta-preview">
                <div className="preview-label">PREVIEW</div>
                <div className="google-preview">
                  <div className="google-header">
                    <div className="google-logo"><svg fill="none" viewBox="0 0 92 31" className="mr-7 h-7"><title>google</title><path d="M39.15 15.898c0 4.303-3.378 7.473-7.525 7.473s-7.526-3.17-7.526-7.473c0-4.334 3.38-7.474 7.526-7.474 4.147 0 7.526 3.14 7.526 7.474zm-3.294 0c0-2.69-1.958-4.529-4.231-4.529-2.273 0-4.231 1.84-4.231 4.529 0 2.662 1.958 4.528 4.231 4.528 2.273 0 4.231-1.87 4.231-4.528z" fill="#EA4335"></path><path d="M55.386 15.898c0 4.303-3.379 7.473-7.526 7.473-4.146 0-7.526-3.17-7.526-7.473 0-4.33 3.38-7.474 7.526-7.474 4.147 0 7.526 3.14 7.526 7.474zm-3.294 0c0-2.69-1.959-4.529-4.232-4.529s-4.231 1.84-4.231 4.529c0 2.662 1.958 4.528 4.231 4.528 2.273 0 4.232-1.87 4.232-4.528z" fill="#FBBC05"></path><path d="M70.945 8.875v13.418c0 5.52-3.267 7.774-7.13 7.774-3.636 0-5.825-2.423-6.65-4.404l2.868-1.19c.511 1.217 1.763 2.652 3.779 2.652 2.472 0 4.004-1.52 4.004-4.38V21.67h-.115c-.737.906-2.158 1.698-3.95 1.698-3.751 0-7.188-3.255-7.188-7.443 0-4.22 3.437-7.501 7.188-7.501 1.789 0 3.21.792 3.95 1.671h.115V8.88h3.129v-.004zm-2.895 7.05c0-2.632-1.763-4.556-4.005-4.556-2.273 0-4.177 1.924-4.177 4.556 0 2.604 1.904 4.501 4.177 4.501 2.242 0 4.005-1.897 4.005-4.501z" fill="#4285F4"></path><path d="M76.103 1.01v21.903H72.89V1.011h3.213z" fill="#34A853"></path><path d="M88.624 18.357l2.558 1.699c-.826 1.216-2.815 3.312-6.251 3.312-4.262 0-7.445-3.282-7.445-7.474 0-4.444 3.21-7.473 7.076-7.473 3.893 0 5.798 3.086 6.42 4.754l.341.85-10.028 4.137c.768 1.5 1.962 2.264 3.636 2.264 1.678 0 2.841-.822 3.693-2.069zm-7.87-2.688l6.703-2.774c-.368-.933-1.478-1.583-2.783-1.583-1.674 0-4.005 1.472-3.92 4.357z" fill="#EA4335"></path><path d="M11.936 13.953v-3.17h10.726c.105.552.159 1.206.159 1.914 0 2.378-.653 5.32-2.757 7.416-2.046 2.123-4.66 3.255-8.124 3.255-6.42 0-11.818-5.21-11.818-11.605C.122 5.368 5.52.158 11.94.158c3.551 0 6.081 1.389 7.982 3.198l-2.246 2.237c-1.363-1.273-3.21-2.264-5.74-2.264-4.688 0-8.354 3.764-8.354 8.434s3.666 8.434 8.354 8.434c3.041 0 4.773-1.216 5.882-2.322.9-.896 1.492-2.176 1.725-3.925l-7.607.003z" fill="#4285F4"></path></svg></div>
                    <div className="google-search-bar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="google-result">
                    <div className="google-result-header">
                      <div className="google-favicon">WP</div>
                      <div className="google-url">newsletter.multidots.com</div>
                    </div>
                    <div className="google-title">{metaDataSettings.meta?.googleSearch?.title || 'WP for ENTERPRISES'}</div>
                    <div className="google-description">{metaDataSettings.meta?.googleSearch?.description || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'x-card' && (
        <div className="meta-tab-content">
          {editing ? (
            <>
              <div className="setting-field">
                <label>X title</label>
                <input
                  type="text"
                  value={formData.xTitle || ''}
                  onChange={(e) => setFormData({ ...formData, xTitle: e.target.value })}
                  className="setting-input"
                  placeholder={formData.siteTitle || 'WP for ENTERPRISES'}
                />
              </div>
              <div className="setting-field">
                <label>X description</label>
                <textarea
                  value={formData.xDescription || ''}
                  onChange={(e) => setFormData({ ...formData, xDescription: e.target.value })}
                  className="setting-textarea"
                  rows={3}
                  placeholder={formData.siteDescription || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}
                />
              </div>
              <div className="setting-field">
                <label>X image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'x')}
                  className="setting-input-file"
                />
                <div className="setting-hint">Upload an image for the X card (recommended: 1200x630px)</div>
                {xImagePreview && (
                  <div className="image-preview-container">
                    <img src={xImagePreview} alt="X card preview" className="image-preview-thumbnail" />
                    <button
                      type="button"
                      className="image-remove-button"
                      onClick={() => {
                        setXImagePreview(null)
                        setFormData({ ...formData, xImageFile: null, xImageUrl: '' })
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="meta-preview">
                <div className="preview-label">PREVIEW</div>
                <div className="x-card-preview">
                  <div className="x-card-header">
                    <div className="x-logo">𝕏</div>
                    <div className="x-header-text">
                      <span className="x-account">WP for ENTERPRISES</span>
                      <span className="x-time">· 2h</span>
                    </div>
                  </div>
                  {getXImagePreview() && (
                    <div className="x-card-image">
                      <img src={getXImagePreview()} alt="X card preview" />
                    </div>
                  )}
                  <div className="x-card-content">
                    <div className="x-card-logo-section">
                      <span className="x-card-logo">WP</span>
                      <span className="x-card-for">for</span>
                    </div>
                    <div className="x-card-title">{formData.xTitle || metaDataSettings.meta?.xCard?.title || 'WP for ENTERPRISES'}</div>
                    <div className="x-card-description">{formData.xDescription || metaDataSettings.meta?.xCard?.description || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="setting-field">
                <label>X title</label>
                <div className="setting-value">{metaDataSettings.meta?.xCard?.title || formData.siteTitle || ''}</div>
              </div>
              <div className="setting-field">
                <label>X description</label>
                <div className="setting-value">{metaDataSettings.meta?.xCard?.description || formData.siteDescription || ''}</div>
              </div>
              <div className="setting-field">
                <label>X image</label>
                <div className="setting-value">
                  {metaDataSettings.meta?.xCard?.image?.asset && (metaDataSettings.meta.xCard.image.asset as any)?.url ? (
                    <img src={(metaDataSettings.meta.xCard.image.asset as any).url} alt="X card" style={{ maxWidth: '200px', height: 'auto' }} />
                  ) : ''}
                </div>
              </div>
              <div className="meta-preview">
                <div className="preview-label">PREVIEW</div>
                <div className="x-card-preview">
                  <div className="x-card-header">
                    <div className="x-logo">𝕏</div>
                    <div className="x-header-text">
                      <span className="x-account">WP for ENTERPRISES</span>
                      <span className="x-time">· 2h</span>
                    </div>
                  </div>
                  {metaDataSettings.meta?.xCard?.image?.asset && (metaDataSettings.meta.xCard.image.asset as any)?.url && (
                    <div className="x-card-image">
                      <img src={(metaDataSettings.meta.xCard.image.asset as any).url} alt="X card preview" />
                    </div>
                  )}
                  <div className="x-card-content">
                    <div className="x-card-logo-section">
                      <span className="x-card-logo">WP</span>
                      <span className="x-card-for">for</span>
                    </div>
                    <div className="x-card-title">{metaDataSettings.meta?.xCard?.title || 'WP for ENTERPRISES'}</div>
                    <div className="x-card-description">{metaDataSettings.meta?.xCard?.description || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'facebook-card' && (
        <div className="meta-tab-content">
          {editing ? (
            <>
              <div className="setting-field">
                <label>Facebook title</label>
                <input
                  type="text"
                  value={formData.facebookTitle || ''}
                  onChange={(e) => setFormData({ ...formData, facebookTitle: e.target.value })}
                  className="setting-input"
                  placeholder={formData.siteTitle || 'WP for ENTERPRISES'}
                />
              </div>
              <div className="setting-field">
                <label>Facebook description</label>
                <textarea
                  value={formData.facebookDescription || ''}
                  onChange={(e) => setFormData({ ...formData, facebookDescription: e.target.value })}
                  className="setting-textarea"
                  rows={3}
                  placeholder={formData.siteDescription || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}
                />
              </div>
              <div className="setting-field">
                <label>Facebook image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'facebook')}
                  className="setting-input-file"
                />
                <div className="setting-hint">Upload an image for the Facebook card (recommended: 1200x630px)</div>
                {facebookImagePreview && (
                  <div className="image-preview-container">
                    <img src={facebookImagePreview} alt="Facebook card preview" className="image-preview-thumbnail" />
                    <button
                      type="button"
                      className="image-remove-button"
                      onClick={() => {
                        setFacebookImagePreview(null)
                        setFormData({ ...formData, facebookImageFile: null, facebookImageUrl: '' })
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="meta-preview">
                <div className="preview-label">PREVIEW</div>
                <div className="facebook-card-preview">
                  <div className="facebook-card-header">
                    <div className="facebook-icon">f</div>
                    <div className="facebook-header-text">
                      <span className="facebook-account">WP for ENTERPRISES</span>
                      <span className="facebook-time">2h</span>
                    </div>
                  </div>
                  <div className="facebook-card-image-placeholder">
                    {getFacebookImagePreview() ? (
                      <img src={getFacebookImagePreview()} alt="Facebook card preview" />
                    ) : (
                      <div className="facebook-card-image-empty">Image placeholder</div>
                    )}
                  </div>
                  <div className="facebook-card-content">
                    <div className="facebook-card-logo-section">
                      <span className="facebook-card-logo">WP</span>
                      <span className="facebook-card-for">for</span>
                    </div>
                    <div className="facebook-card-title">{formData.facebookTitle || metaDataSettings.meta?.facebookCard?.title || 'WP for ENTERPRISES'}</div>
                    <div className="facebook-card-description">{formData.facebookDescription || metaDataSettings.meta?.facebookCard?.description || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="setting-field">
                <label>Facebook title</label>
                <div className="setting-value">{metaDataSettings.meta?.facebookCard?.title || formData.siteTitle || ''}</div>
              </div>
              <div className="setting-field">
                <label>Facebook description</label>
                <div className="setting-value">{metaDataSettings.meta?.facebookCard?.description || formData.siteDescription || ''}</div>
              </div>
              <div className="setting-field">
                <label>Facebook image</label>
                <div className="setting-value">
                  {metaDataSettings.meta?.facebookCard?.image?.asset && (metaDataSettings.meta.facebookCard.image.asset as any)?.url ? (
                    <img src={(metaDataSettings.meta.facebookCard.image.asset as any).url} alt="Facebook card" style={{ maxWidth: '200px', height: 'auto' }} />
                  ) : ''}
                </div>
              </div>
              <div className="meta-preview">
                <div className="preview-label">PREVIEW</div>
                <div className="facebook-card-preview">
                  <div className="facebook-card-header">
                    <div className="facebook-icon">f</div>
                    <div className="facebook-header-text">
                      <span className="facebook-account">WP for ENTERPRISES</span>
                      <span className="facebook-time">2h</span>
                    </div>
                  </div>
                  <div className="facebook-card-image-placeholder">
                    {metaDataSettings.meta?.facebookCard?.image?.asset && (metaDataSettings.meta.facebookCard.image.asset as any)?.url ? (
                      <img src={(metaDataSettings.meta.facebookCard.image.asset as any).url} alt="Facebook card preview" />
                    ) : (
                      <div className="facebook-card-image-empty">Image placeholder</div>
                    )}
                  </div>
                  <div className="facebook-card-content">
                    <div className="facebook-card-logo-section">
                      <span className="facebook-card-logo">WP</span>
                      <span className="facebook-card-for">for</span>
                    </div>
                    <div className="facebook-card-title">{metaDataSettings.meta?.facebookCard?.title || 'WP for ENTERPRISES'}</div>
                    <div className="facebook-card-description">{metaDataSettings.meta?.facebookCard?.description || 'Where we go behind the scenes of BILLION-DOLLAR WordPress websites'}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SettingSection({ id, title, description, editing, onEdit, onCancel, onSave, saving, children }: SettingSectionProps) {
  return (
    <div id={`setting-${id}`} className="setting-section">
      <div className="setting-section-header">
        <div>
          <h2 className="setting-section-title">{title}</h2>
          <p className="setting-section-description">{description}</p>
        </div>
        <div className="setting-section-actions">
          {editing && onSave && (
            <button 
              className="save-button-small" 
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {!editing && onEdit && (
            <button className="edit-button" onClick={onEdit}>
              {id == 'design-branding' ? 'Customize' : 'Edit'}
            </button>
          )}
          {editing && onCancel && (
            <button className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
      <div className="setting-section-content">
        {children}
      </div>
    </div>
  )
}

