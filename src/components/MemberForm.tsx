import React, { useState, useEffect, useMemo } from 'react'
import '../css/MemberForm.css'
import { sanityClient } from '../lib/sanity-client'
import { Member } from '../hooks/use-members'
import { useToast } from '../contexts/ToastContext'
import Select from 'react-select'

interface Label {
  _id: string
  title?: string
}

interface MemberFormProps {
  memberId?: string
  onSave: () => void
  onCancel: () => void
}

export function MemberForm({ memberId, onSave, onCancel }: MemberFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [newsletterEnabled, setNewsletterEnabled] = useState(true)
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [member, setMember] = useState<Member | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    // Fetch labels
    async function fetchLabels() {
      try {
        const query = `*[_type == "label"] | order(title asc) {
          _id,
          title
        }`
        const data = await sanityClient.fetch<Label[]>(query)
        setLabels(data)
      } catch (err) {
        console.error('Error fetching labels:', err)
      }
    }

    fetchLabels()
  }, [])

  useEffect(() => {
    // Fetch member if editing
    if (memberId) {
      async function fetchMember() {
        setLoading(true)
        try {
          const query = `*[_type == "member" && _id == $id][0] {
            _id,
            name,
            email,
            subscriptionStatus,
            subscriptionDate,
            createdAt,
            source,
            notes,
            labels[]-> {
              _id,
              title
            }
          }`
          const data = await sanityClient.fetch<any>(query, { id: memberId })
          if (data) {
            setMember(data)
            setName(data.name || '')
            setEmail(data.email || '')
            setNotes(data.notes || '')
            setSelectedLabels(data.labels?.map((l: Label) => l._id) || [])
            setNewsletterEnabled(data.subscriptionStatus === 'active')
          }
        } catch (err) {
          console.error('Error fetching member:', err)
        } finally {
          setLoading(false)
        }
      }
      fetchMember()
    }
  }, [memberId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const memberData: any = {
        _type: 'member',
        name,
        email,
        notes: notes || undefined,
        subscriptionStatus: newsletterEnabled ? 'active' : 'inactive',
        subscriptionDate: memberId ? member?.subscriptionDate : new Date().toISOString(),
        createdAt: memberId ? member?.createdAt : new Date().toISOString(),
        source: memberId ? member?.source : 'website',
        labels: selectedLabels.length > 0 ? selectedLabels.map(labelId => ({
          _type: 'reference',
          _ref: labelId,
        })) : undefined,
      }

      if (memberId) {
        // Update existing member
        await sanityClient
          .patch(memberId)
          .set(memberData)
          .commit()
        
        // Refetch member data to show updated info
        const query = `*[_type == "member" && _id == $id][0] {
          _id,
          name,
          email,
          subscriptionStatus,
          subscriptionDate,
          createdAt,
          source,
          notes,
          labels[]-> {
            _id,
            title
          }
        }`
        const updatedData = await sanityClient.fetch<any>(query, { id: memberId })
        if (updatedData) {
          setMember(updatedData)
          setName(updatedData.name || '')
          setEmail(updatedData.email || '')
          setNotes(updatedData.notes || '')
          setSelectedLabels(updatedData.labels?.map((l: Label) => l._id) || [])
          setNewsletterEnabled(updatedData.subscriptionStatus === 'active')
        }
        
        showToast('Member updated successfully', 'success')
      } else {
        // Create new member
        await sanityClient.create(memberData)
        showToast('Member created successfully', 'success')
        // Clear form and stay on page
        setName('')
        setEmail('')
        setNotes('')
        setSelectedLabels([])
        setNewsletterEnabled(true)
        // Trigger refresh of members list
        onSave()
      }
    } catch (err: any) {
      console.error('Error saving member:', err)
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to save member. Please try again.'
      
      if (err?.message?.includes('Insufficient permissions')) {
        errorMessage = 'Permission denied. Please check that your Sanity API token has write permissions (Editor or Administrator role).'
      } else if (err?.message?.includes('token')) {
        errorMessage = 'Authentication error. Please check your Sanity API token configuration.'
      } else if (err?.message) {
        errorMessage = `Error: ${err.message}`
      }
      
      showToast(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Convert labels to react-select options format
  const labelOptions = useMemo(() => {
    return labels.map(label => ({
      value: label._id,
      label: label.title || 'Untitled'
    }))
  }, [labels])

  // Get selected options for react-select
  const selectedOptions = useMemo(() => {
    return labelOptions.filter(option => selectedLabels.includes(option.value))
  }, [labelOptions, selectedLabels])

  const handleLabelChange = (selected: any) => {
    const selectedIds = selected ? selected.map((option: any) => option.value) : []
    setSelectedLabels(selectedIds)
  }

  if (loading) {
    return (
      <div className="member-form-container">
        <div className="loading-state">Loading...</div>
      </div>
    )
  }

  const isEditMode = !!memberId
  const displayName = isEditMode ? (name || 'Unnamed') : 'New member'

  return (
    <div className="member-form-container">
      <div className="member-form-header">
        <div className="member-form-header-left">
          <div className="breadcrumbs">
            <button onClick={onCancel} className="breadcrumb-link">Members</button>
            <span className="breadcrumb-separator">
              <svg viewBox="0 0 18 27" width={9} height={9} style={{ margin: '1px 10px 0' }}><path d="M2.397 25.426l13.143-11.5-13.143-11.5" strokeWidth="3" stroke="#0B0B0A" fill="none" strokeLinejoin="round"></path></svg>
              Edit Member
            </span>
          </div>
          <h1 className="member-title">{isEditMode ? displayName : 'New member'}</h1>
        </div>
        <button
          type="submit"
          form="member-form"
          className="save-button"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="member-form-content">
        <div className="member-profile-header">
          <div className="member-avatar-large">
            {name ? name.charAt(0).toUpperCase() : 'N'}
          </div>
          <div className="member-details">
            <h3 className="member-form-title">{displayName}</h3>
            <span className="member-form-email">{email}</span>
          </div>
        </div>

        <form id="member-form" onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="member-email-name">
            <div className="form-field ">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter member name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter email address"
              />
            </div>
            </div>

            <div className="form-field">
              <label htmlFor="labels">Labels</label>
              <Select
                isMulti
                options={labelOptions}
                value={selectedOptions}
                onChange={handleLabelChange}
                isClearable
                isSearchable
                placeholder="Select labels..."
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: "6px",
                    borderColor: "#ccc",
                    border: 'none',
                    minHeight: "38px",
                    backgroundColor: "#f1f3f4",
              
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 20,
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: "#15171a",
                    borderRadius: "4px",
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: "#fff",
                    fontSize: "13px",
                    padding: "4px 8px",
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    borderRadius: "0 4px 4px 0",
                    color: "#fff",
                  }),
                }}
              />
            </div>

            <div className="form-field">
              <label htmlFor="notes">Note <span className='light-text'>(not visible to member)</span></label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <div className="char-counter">
                Maximum: 500 characters. You've used {notes.length}
              </div>
            </div>
          </div>
          <h4>NEWSLETTERS</h4>
          <div className="form-card">
            <div className="newsletter-toggle">
              <div>
                <div className="newsletter-name">Newsletter</div>
                <div className="newsletter-description">
                  If disabled, member will not receive newsletter emails
                </div>
              </div>
              <button
                type="button"
                className={`toggle-switch ${newsletterEnabled ? 'enabled' : ''}`}
                onClick={() => setNewsletterEnabled(!newsletterEnabled)}
              >
                <div className="toggle-slider"></div>
              </button>
            </div>
          </div>
          <h4>ACTIVITY</h4>
          <div className="form-card">
            <div className="activity-placeholder">
              <div className="activity-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </div>
              <p>Activity. All events related to this member will be shown here.</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

