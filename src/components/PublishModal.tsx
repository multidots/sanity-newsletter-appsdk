import React, { useState, useEffect } from 'react'
import '../css/PublishModal.css'
import { useMemberCount } from '../hooks/use-members'
import { sanityClient } from '../lib/sanity-client'
import Select from 'react-select'
import { useToast } from '../contexts/ToastContext'

interface Label {
  _id: string
  title?: string
}

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  onPreview?: () => void
  postId?: string
  pageId?: string
  isPage?: boolean
  onContinue?: (options: {
    publishType: 'publishAndEmail' | 'publishOnly' | 'emailOnly'
    audience: 'all' | 'specific'
    selectedLabels?: string[]
    scheduleType: 'now' | 'later'
    scheduledDate?: string
    scheduledTime?: string
  }) => void
}

export function PublishModal({ isOpen, onClose, onPreview, postId, pageId, isPage = false, onContinue }: PublishModalProps) {
  const { count: subscriberCount, loading: countLoading } = useMemberCount()
  const { showToast } = useToast()
  // For pages, only allow publishOnly; for posts, default to publishOnly but allow other options
  const [publishType, setPublishType] = useState<'publishAndEmail' | 'publishOnly' | 'emailOnly'>('publishOnly')
  const documentId = postId || pageId
  
  // Reset to publishOnly if it's a page and another type is selected
  useEffect(() => {
    if (isPage && publishType !== 'publishOnly') {
      setPublishType('publishOnly')
    }
  }, [isPage, publishType])
  const [audience, setAudience] = useState<'all' | 'specific'>('all')
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [labels, setLabels] = useState<Label[]>([])
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [loadingLabels, setLoadingLabels] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchLabels()
    }
  }, [isOpen])

  const fetchLabels = async () => {
    setLoadingLabels(true)
    try {
      const query = `*[_type == "label"] | order(title asc) {
        _id,
        title
      }`
      const data = await sanityClient.fetch<Label[]>(query)
      setLabels(data)
    } catch (err) {
      console.error('Error fetching labels:', err)
    } finally {
      setLoadingLabels(false)
    }
  }

  if (!isOpen) return null

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      // If the section is already open, close it
      if (prev.has(section)) {
        return new Set()
      }
      // Otherwise, close all others and open only this one
      return new Set([section])
    })
  }

  // Get member emails based on selected labels
  const getMemberEmails = async (): Promise<string[]> => {
    try {
      if (audience === 'all') {
        const members = await sanityClient.fetch<Array<{ email?: string }>>(
          '*[_type == "member" && subscriptionStatus == "active"]{email}'
        )
        return members.map(m => m.email).filter((email): email is string => !!email)
      } else if (selectedLabels.length > 0) {
        const labelIds = selectedLabels
        const members = await sanityClient.fetch<Array<{ email?: string }>>(
          '*[_type == "member" && subscriptionStatus == "active" && count(labels[@._ref in $labelIds]) > 0]{email}',
          { labelIds }
        )
        return members.map(m => m.email).filter((email): email is string => !!email)
      }
      return []
    } catch (err) {
      console.error('Error fetching member emails:', err)
      return []
    }
  }

  const handleContinue = async () => {
    // Validation
    if (!documentId) {
      showToast(`${isPage ? 'Page' : 'Post'} ID is required`, 'error')
      return
    }

    if (publishType !== 'publishOnly' && audience === 'specific' && selectedLabels.length === 0) {
      showToast('Please select at least one label for specific audience', 'error')
      return
    }

    if (scheduleType === 'later' && (!scheduledDate || !scheduledTime)) {
      showToast('Please select both date and time for scheduling', 'error')
      return
    }

    setProcessing(true)

    try {
      // Fetch the document first
      const documentData = await sanityClient.fetch(
        '*[_id in [$draftId, $publishedId]][0]',
        { 
          draftId: `drafts.${documentId}`, 
          publishedId: documentId 
        }
      )

      if (!documentData) {
        showToast(`${isPage ? 'Page' : 'Post'} not found. Please save the ${isPage ? 'page' : 'post'} first.`, 'error')
        setProcessing(false)
        return
      }

      const draftId = documentData._id.startsWith('drafts.') ? documentData._id : `drafts.${documentId}`

      // 1. Publish if needed (must happen first to ensure latest content is published)
      if (publishType === 'publishOnly' || publishType === 'publishAndEmail') {
        const publishDateTime = scheduleType === 'now' 
          ? new Date().toISOString() 
          : new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        
        // Publish the document with latest content
        await sanityClient
          .transaction()
          .createIfNotExists({ 
            ...documentData, 
            _id: documentId, 
            publishedAt: publishDateTime,
          })
          .delete(draftId)
          .commit()
        
        // Wait a moment to ensure the published document is fully committed
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verify the published document exists before proceeding
        const publishedDoc = await sanityClient.fetch(
          '*[_id == $documentId][0]',
          { documentId }
        )
        
        if (!publishedDoc) {
          showToast(`Failed to publish ${isPage ? 'page' : 'post'}. Please try again.`, 'error')
          setProcessing(false)
          return
        }
        
        if (publishType === 'publishOnly') {
          showToast(`${isPage ? 'Page' : 'Post'} published successfully!`, 'success')
          setTimeout(() => {
            onClose()
          }, 1500)
          setProcessing(false)
          return
        }
        
        // Show success message for publishing part
        showToast(`${isPage ? 'Page' : 'Post'} published successfully!`, 'success')
      }

      // 2. Send email if needed (after publishing is complete)
      if (publishType === 'publishAndEmail' || publishType === 'emailOnly') {
        const memberEmails = await getMemberEmails()
        
        if (memberEmails.length === 0) {
          showToast('No active members found to send email', 'error')
          setProcessing(false)
          return
        }

        // Use the published documentId to ensure we're sending the latest published content
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanity-newsletter.vercel.app'
        const res = await fetch(`${apiUrl}/api/email/send-post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: documentId, // This is the published document ID
            recipientEmails: memberEmails,
          }),
        })

        if (res.ok) {
          const result = await res.json()
          showToast(`Email sent to ${memberEmails.length} member(s) with latest content!`, 'success')
        } else {
          const error = await res.json()
          showToast(`Failed to send email: ${error.error || 'Unknown error'}`, 'error')
        }
      }

      // Call the onContinue callback if provided (for backward compatibility)
      if (onContinue) {
        onContinue({
          publishType,
          audience,
          selectedLabels: audience === 'specific' ? selectedLabels : undefined,
          scheduleType,
          scheduledDate: scheduleType === 'later' ? scheduledDate : undefined,
          scheduledTime: scheduleType === 'later' ? scheduledTime : undefined,
        })
      }

      // Close modal after successful operation
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Error during publish/email:', err)
      showToast(`Something went wrong: ${err?.message || 'Unknown error'}`, 'error')
    } finally {
      setProcessing(false)
    }
  }

  const labelOptions = labels.map(label => ({
    value: label._id,
    label: label.title || 'Unnamed label'
  }))

  const selectedLabelOptions = labelOptions.filter(opt => selectedLabels.includes(opt.value))

  const handleLabelChange = (selected: any) => {
    setSelectedLabels(selected ? selected.map((opt: any) => opt.value) : [])
  }

  return (
    <div className="publish-modal-overlay" onClick={onClose}>
      <div className="publish-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="publish-modal-header">
          <h2 className="publish-modal-title">Publish</h2>
          <div className="publish-modal-header-actions">
            <button className="publish-modal-close-button" onClick={onClose}>
              Close
            </button>
            {onPreview && (
              <button className="publish-modal-preview-button" onClick={onPreview}>
                Preview
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="publish-modal-content">
          {/* Headline */}
          <div className="publish-modal-headline">
            <div className="publish-modal-headline-primary">Ready, set, publish.</div>
            <div className="publish-modal-headline-secondary">Share it with the world.</div>
          </div>

          {/* Publish Options Section */}
          <div className="publish-modal-section">
            <div className="publish-modal-section-header" 
            onClick={() => isPage ? null : toggleSection('publishType')}>
              <div className="publish-modal-section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </div>
              <span className="publish-modal-section-label">
                {publishType === 'publishAndEmail' && 'Publish and email'}
                {publishType === 'publishOnly' && isPage ? 'Publish on Site' : 'Publish only'}
                {publishType === 'emailOnly' && 'Email only'}
              </span>
              {!isPage && (
              <svg
                className={`publish-modal-chevron ${expandedSections.has('publishType') ? 'expanded' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
              )}
            </div>
            {expandedSections.has('publishType') && (
              <div className="publish-modal-section-content">
                <div className="publish-modal-options">
                  {!isPage && (
                    <>
                      <button
                        className={`publish-modal-option ${publishType === 'publishAndEmail' ? 'active' : ''}`}
                        onClick={() => setPublishType('publishAndEmail')}
                      >
                        Publish and email
                      </button>
                      <button
                        className={`publish-modal-option ${publishType === 'emailOnly' ? 'active' : ''}`}
                        onClick={() => setPublishType('emailOnly')}
                      >
                        Email only
                      </button>
                    </>
                  )}
                  <button
                    className={`publish-modal-option ${publishType === 'publishOnly' ? 'active' : ''}`}
                    onClick={() => setPublishType('publishOnly')}
                  >
                   
                    {isPage ? 'Publish on Site' : 'Publish only'}
                  </button>
                </div>
              </div>
            )}
          </div>
         
          {/* Audience Section - Only show for posts when not publishOnly */}
          {!isPage && (
          <div className={`publish-modal-section ${publishType === 'publishOnly' ? 'hidden' : ''}`}>
            <div className="publish-modal-section-header" onClick={() => toggleSection('audience')}>
              <div className="publish-modal-section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <span className="publish-modal-section-label">
                {publishType === 'publishOnly' ? 'Not sent as newsletter' : ``}

                {publishType !== 'publishOnly' && audience === 'all'
                  ? `All ${countLoading ? '...' : subscriberCount.toLocaleString()} subscribers`
                  : publishType !== 'publishOnly' ? 'Specific people' : ''
                }
              </span>
              <svg
                className={`publish-modal-chevron ${expandedSections.has('audience') ? 'expanded' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            {expandedSections.has('audience') && (
              <div className="publish-modal-section-content">
                <div className="publish-modal-audience-options">
                  <button
                    className={`publish-modal-audience-option ${audience === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setAudience('all')
                      setSelectedLabels([])
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="publish-modal-check-icon">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Free ({countLoading ? '...' : subscriberCount.toLocaleString()})
                  </button>
                  <button
                    className={`publish-modal-audience-option ${audience === 'specific' ? 'active' : ''}`}
                    onClick={() => setAudience('specific')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="publish-modal-check-icon">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Specific people
                  </button>
                </div>
                {audience === 'specific' && (
                  <div className="publish-modal-labels-container">
                    {loadingLabels ? (
                      <div className="publish-modal-labels-loading">Loading labels...</div>
                    ) : (
                      <Select
                        isMulti
                        options={labelOptions}
                        value={selectedLabelOptions}
                        onChange={handleLabelChange}
                        isClearable
                        isSearchable
                        placeholder="Select labels..."
                        className="publish-modal-label-select"
                        classNamePrefix="publish-modal-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderRadius: "6px",
                            borderColor: "#dee3e7",
                            border: '1px solid #dee3e7',
                            minHeight: "38px",
                            backgroundColor: "#fff",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 10001,
                            height: "200px",
                            overflowY: "auto",
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: "#e6e9eb",
                            borderRadius: "21px",
                          }),
                          multiValueLabel: (base) => ({
                            ...base,
                            color: "#15171a",
                            fontSize: "14px",
                            padding: "5px 2px",
                            fontWeight: "500",
                            paddingLeft: "10px",
                          }),
                          multiValueRemove: (base) => ({
                            ...base,
                            borderRadius: "0 21px 21px 0",
                            color: "#15171a",
                          }),
                          placeholder: (base) => ({
                            ...base,
                            color: "#626d79",
                          }),
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          )}
          {/* Scheduling Section */}
          <div className="publish-modal-section">
            <div className="publish-modal-section-header" onClick={() => toggleSection('schedule')}>
              <div className="publish-modal-section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <span className="publish-modal-section-label">
                {scheduleType === 'now' ? 'Right now' : 'Schedule for later'}
              </span>
              <svg
                className={`publish-modal-chevron ${expandedSections.has('schedule') ? 'expanded' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            {expandedSections.has('schedule') && (
              <div className="publish-modal-section-content">
                <div className="publish-modal-schedule-options">
                  <button
                    className={`publish-modal-schedule-option ${scheduleType === 'now' ? 'active' : ''}`}
                    onClick={() => setScheduleType('now')}
                  >
                    Set it live now
                  </button>
                  <button
                    className={`publish-modal-schedule-option ${scheduleType === 'later' ? 'active' : ''}`}
                    onClick={() => setScheduleType('later')}
                  >
                    Schedule for later
                  </button>
                </div>
                {scheduleType === 'later' && (
                  <div className="publish-modal-schedule-datetime">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="publish-modal-date-input"
                    />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="publish-modal-time-input"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Continue Button */}
          <div className="publish-modal-footer">
            <button 
              className="publish-modal-continue-button" 
              onClick={handleContinue}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Continue, final review →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

