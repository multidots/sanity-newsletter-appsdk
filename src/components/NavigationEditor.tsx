import React, { useState, useEffect } from 'react'
import '../css/NavigationEditor.css'
import { sanityClient } from '../lib/sanity-client'

interface NavigationEditorProps {
  isOpen: boolean
  onClose: () => void
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

export function NavigationEditor({ isOpen, onClose }: NavigationEditorProps) {
  const [navigationSettings, setNavigationSettings] = useState<NavigationSettings>({})
  const [menuItems, setMenuItems] = useState<NavigationMenuItem[]>([])
  const [pages, setPages] = useState<Array<{ _id: string; title?: string; slug?: { current?: string } }>>([])
  const [posts, setPosts] = useState<Array<{ _id: string; title?: string; slug?: { current?: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingPages, setLoadingPages] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen) {
      fetchNavigationSettings()
      fetchPagesAndPosts()
    }
  }, [isOpen])

  const fetchNavigationSettings = async () => {
    setLoading(true)
    try {
      // Use the fixed singleton documentId
      const documentId = 'navigationSettings'
      const navigation = await sanityClient.fetch<NavigationSettings>(
        `*[_id == $documentId][0] {
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
        }`,
        { documentId }
      )
      // Always set the documentId for singleton, even if document doesn't exist yet
      setNavigationSettings(navigation || { _id: documentId })
      const items = navigation?.navbarMenuItems || []
      setMenuItems(items)
      // All items closed by default
      setExpandedItems(new Set())
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Error fetching navigation settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPagesAndPosts = async () => {
    setLoadingPages(true)
    try {
      const [pagesData, postsData] = await Promise.all([
        sanityClient.fetch<Array<{ _id: string; title?: string; slug?: { current?: string } }>>(
          `*[_type == "page"] | order(title asc) {
            _id,
            title,
            slug {
              current
            }
          }`
        ),
        sanityClient.fetch<Array<{ _id: string; title?: string; slug?: { current?: string } }>>(
          `*[_type == "post"] | order(title asc) {
            _id,
            title,
            slug {
              current
            }
          }`
        ),
      ])
      setPages(pagesData || [])
      setPosts(postsData || [])
    } catch (err) {
      console.error('Error fetching pages and posts:', err)
    } finally {
      setLoadingPages(false)
    }
  }

  const handleMenuItemChange = () => {
    setHasUnsavedChanges(true)
  }

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      // If clicking an open item, close it
      newExpanded.delete(index)
    } else {
      // If opening an item, close all others first (only one open at a time)
      newExpanded.clear()
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const addMenuItem = () => {
    const newItem: NavigationMenuItem = {
      _key: `menu-item-${Date.now()}-${Math.random()}`,
      menuItemType: 'single',
      title: '',
      linkType: 'internal',
      pageReference: undefined,
      externalUrl: '',
      isButton: false,
      pageReferences: [],
    }
    const newItems = [...menuItems, newItem]
    setMenuItems(newItems)
    // Expand only the new item (close all others)
    setExpandedItems(new Set([newItems.length - 1]))
    handleMenuItemChange()
  }

  const removeMenuItem = (index: number) => {
    const updated = menuItems.filter((_, i) => i !== index)
    setMenuItems(updated)
    handleMenuItemChange()
  }

  const updateMenuItem = (index: number, field: string, value: any) => {
    const updated = [...menuItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Reset dependent fields when menuItemType changes
    if (field === 'menuItemType') {
      if (value === 'single') {
        updated[index].pageReferences = []
        updated[index].linkType = 'internal'
        updated[index].pageReference = undefined
        updated[index].externalUrl = ''
      } else {
        updated[index].linkType = undefined
        updated[index].pageReference = undefined
        updated[index].externalUrl = ''
        updated[index].isButton = false
        updated[index].pageReferences = []
      }
    }
    
    // Reset link fields when linkType changes
    if (field === 'linkType') {
      if (value === 'internal') {
        updated[index].externalUrl = ''
      } else {
        updated[index].pageReference = undefined
      }
    }

    setMenuItems(updated)
    handleMenuItemChange()
  }

  const addPageReference = (itemIndex: number) => {
    const updated = [...menuItems]
    if (!updated[itemIndex].pageReferences) {
      updated[itemIndex].pageReferences = []
    }
    updated[itemIndex].pageReferences!.push(undefined as any)
    setMenuItems(updated)
    handleMenuItemChange()
  }

  const removePageReference = (itemIndex: number, refIndex: number) => {
    const updated = [...menuItems]
    updated[itemIndex].pageReferences = updated[itemIndex].pageReferences!.filter((_, i) => i !== refIndex)
    setMenuItems(updated)
    handleMenuItemChange()
  }

  const updatePageReference = (itemIndex: number, refIndex: number, value: string) => {
    const updated = [...menuItems]
    if (!updated[itemIndex].pageReferences) {
      updated[itemIndex].pageReferences = []
    }
    const allReferences = [...pages, ...posts]
    const selectedRef = allReferences.find(ref => ref._id === value)
    updated[itemIndex].pageReferences![refIndex] = selectedRef ? {
      _id: selectedRef._id,
      _ref: selectedRef._id,
      title: selectedRef.title,
      slug: selectedRef.slug,
    } : undefined as any
    setMenuItems(updated)
    handleMenuItemChange()
  }

  const updateSinglePageReference = (itemIndex: number, value: string) => {
    const updated = [...menuItems]
    const allReferences = [...pages, ...posts]
    const selectedRef = allReferences.find(ref => ref._id === value)
    updated[itemIndex].pageReference = selectedRef ? {
      _id: selectedRef._id,
      _ref: selectedRef._id,
      title: selectedRef.title,
      slug: selectedRef.slug,
    } : undefined
    setMenuItems(updated)
    handleMenuItemChange()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Prepare menu items for saving
      const menuItemsToSave = menuItems.map((item) => {
        const menuItem: any = {
          _key: item._key || `menu-item-${Date.now()}-${Math.random()}`,
          menuItemType: item.menuItemType || 'single',
          title: item.title || '',
        }

        if (item.menuItemType === 'single') {
          menuItem.linkType = item.linkType || 'internal'
          if (item.linkType === 'internal' && (item.pageReference?._ref || item.pageReference?._id)) {
            menuItem.pageReference = {
              _type: 'reference',
              _ref: item.pageReference._ref || item.pageReference._id,
            }
          } else if (item.linkType === 'external') {
            menuItem.externalUrl = item.externalUrl || ''
          }
          menuItem.isButton = item.isButton || false
        } else if (item.menuItemType === 'group') {
          if (item.pageReferences && item.pageReferences.length > 0) {
            menuItem.pageReferences = item.pageReferences
              .filter((ref) => ref?._ref || ref?._id)
              .map((ref) => ({
                _type: 'reference',
                _ref: ref._ref || ref._id,
              }))
          } else {
            menuItem.pageReferences = []
          }
        }

        return menuItem
      })

      // Use the fixed singleton documentId
      const documentId = 'navigationSettings'
      
      // Check if document exists
      const existingDoc = await sanityClient.fetch(
        `*[_id == $documentId][0]`,
        { documentId }
      )

      if (existingDoc) {
        // Update existing document
        await sanityClient
          .patch(documentId)
          .set({ navbarMenuItems: menuItemsToSave })
          .commit()
      } else {
        // Create new document with fixed documentId (singleton pattern)
        await sanityClient.create({
          _id: documentId,
          _type: 'navigationSettings',
          navbarMenuItems: menuItemsToSave,
        })
      }

      // Update state with the fixed documentId
      setNavigationSettings({ _id: documentId, navbarMenuItems: menuItemsToSave })
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Error saving navigation settings:', err)
      alert('Failed to save navigation settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="navigation-editor-overlay" onClick={onClose}>
      <div className="navigation-editor-container" onClick={(e) => e.stopPropagation()}>
        <div className="navigation-editor-header">
          <div className="navigation-editor-header-left">
            <h2 className="navigation-editor-title">Navigation</h2>
            {hasUnsavedChanges && !saving && (
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
          <div className="navigation-editor-header-actions">
            <button className="navigation-close-button" onClick={onClose} disabled={saving}>
              Close
            </button>
            <button 
              className="navigation-save-button" 
              onClick={handleSave} 
              disabled={saving || loading || !hasUnsavedChanges}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="navigation-editor-content">
          {loading ? (
            <div className="navigation-editor-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <div className="navigation-editor-main">
              <div className="navigation-editor-form">
                <div className="menu-items-editor">
                  {menuItems.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="3" y1="12" x2="21" y2="12"></line>
                          <line x1="3" y1="6" x2="21" y2="6"></line>
                          <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                      </div>
                      <h3 className="empty-state-title">No menu items</h3>
                      <p className="empty-state-description">Get started by adding your first menu item.</p>
                      <button
                        type="button"
                        className="add-menu-item-button-primary"
                        onClick={addMenuItem}
                      >
                        + Add Menu Item
                      </button>
                    </div>
                  ) : (
                    <>
                      {menuItems.map((item, index) => {
                        const isExpanded = expandedItems.has(index)
                        return (
                          <div key={item._key || index} className="menu-item-editor-card">
                            <div 
                              className="menu-item-editor-header"
                              onClick={() => toggleItem(index)}
                            >
                              <div className="menu-item-header-left">
                                <button
                                  type="button"
                                  className="menu-item-toggle"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleItem(index)
                                  }}
                                >
                                  <svg 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                    className={isExpanded ? 'expanded' : ''}
                                  >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </button>
                                <div className="menu-item-header-info">
                                  <div className="menu-item-number">Item {index + 1}</div>
                                  {item.title && (
                                    <div className="menu-item-title-preview">{item.title}</div>
                                  )}
                                  {!item.title && (
                                    <div className="menu-item-title-placeholder">Untitled menu item</div>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="remove-menu-item-button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeMenuItem(index)
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          
                            {isExpanded && (
                              <div className="menu-item-fields">
                            <div className="navigation-field">
                              <label className="navigation-label">Menu Item Type</label>
                              <select
                                value={item.menuItemType || 'single'}
                                onChange={(e) => updateMenuItem(index, 'menuItemType', e.target.value)}
                                className="navigation-select"
                              >
                                <option value="single">Single</option>
                                <option value="group">Group</option>
                              </select>
                            </div>

                            <div className="navigation-field">
                              <label className="navigation-label">Title</label>
                              <input
                                type="text"
                                value={item.title || ''}
                                onChange={(e) => updateMenuItem(index, 'title', e.target.value)}
                                className="navigation-input"
                                placeholder="Menu item title"
                              />
                            </div>

                            {item.menuItemType === 'single' && (
                              <>
                                <div className="navigation-field">
                                  <label className="navigation-label">Link Type</label>
                                  <select
                                    value={item.linkType || 'internal'}
                                    onChange={(e) => updateMenuItem(index, 'linkType', e.target.value)}
                                    className="navigation-select"
                                  >
                                    <option value="internal">Internal</option>
                                    <option value="external">External</option>
                                  </select>
                                </div>

                                {item.linkType === 'internal' && (
                                  <div className="navigation-field">
                                    <label className="navigation-label">Page Reference</label>
                                    <select
                                      value={item.pageReference?._id || ''}
                                      onChange={(e) => updateSinglePageReference(index, e.target.value)}
                                      className="navigation-select"
                                      disabled={loadingPages}
                                    >
                                      <option value="">Select a page or post</option>
                                      {pages.length > 0 && (
                                        <optgroup label="Pages">
                                          {pages.map((page) => (
                                            <option key={page._id} value={page._id}>
                                              {page.title || 'Untitled'}
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                      {posts.length > 0 && (
                                        <optgroup label="Posts">
                                          {posts.map((post) => (
                                            <option key={post._id} value={post._id}>
                                              {post.title || 'Untitled'}
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </select>
                                  </div>
                                )}

                                {item.linkType === 'external' && (
                                  <div className="navigation-field">
                                    <label className="navigation-label">External URL</label>
                                    <input
                                      type="url"
                                      value={item.externalUrl || ''}
                                      onChange={(e) => updateMenuItem(index, 'externalUrl', e.target.value)}
                                      className="navigation-input"
                                      placeholder="https://example.com"
                                    />
                                  </div>
                                )}

                                <div className="navigation-field">
                                  <label className="navigation-checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={item.isButton || false}
                                      onChange={(e) => updateMenuItem(index, 'isButton', e.target.checked)}
                                      className="navigation-checkbox"
                                    />
                                    <span>Show as Button</span>
                                  </label>
                                </div>
                              </>
                            )}

                            {item.menuItemType === 'group' && (
                              <div className="navigation-field">
                                <label className="navigation-label">Page References</label>
                                <div className="page-references-list">
                                  {(item.pageReferences || []).map((ref, refIndex) => (
                                    <div key={refIndex} className="page-reference-item">
                                      <select
                                        value={ref?._id || ''}
                                        onChange={(e) => updatePageReference(index, refIndex, e.target.value)}
                                        className="navigation-select"
                                        disabled={loadingPages}
                                      >
                                        <option value="">Select a page or post</option>
                                        {pages.length > 0 && (
                                          <optgroup label="Pages">
                                            {pages.map((page) => (
                                              <option key={page._id} value={page._id}>
                                                {page.title || 'Untitled'}
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                        {posts.length > 0 && (
                                          <optgroup label="Posts">
                                            {posts.map((post) => (
                                              <option key={post._id} value={post._id}>
                                                {post.title || 'Untitled'}
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                      </select>
                                      <button
                                        type="button"
                                        className="remove-reference-button"
                                        onClick={() => removePageReference(index, refIndex)}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <line x1="18" y1="6" x2="6" y2="18"></line>
                                          <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="add-reference-button"
                                    onClick={() => addPageReference(index)}
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="12" y1="5" x2="12" y2="19"></line>
                                      <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Add Page Reference
                                  </button>
                                </div>
                              </div>
                            )}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <button
                        type="button"
                        className="add-menu-item-button"
                        onClick={addMenuItem}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Menu Item
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

