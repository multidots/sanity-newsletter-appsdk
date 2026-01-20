import React, { useState, useMemo } from 'react'
import '../css/MembersTable.css'
import { useMembers } from '../hooks/use-members'
import { FilterModal } from './FilterModal'
import { urlFor } from '../lib/image'
import md5 from 'md5'

interface MembersTableProps {
  onNewMember: () => void
  onEditMember: (memberId: string) => void
}

interface Filter {
  field: string
  operator: string
  value: string
}

export function MembersTable({ onNewMember, onEditMember }: MembersTableProps) {
  const { members, loading, error } = useMembers()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFilters] = useState<Filter[]>([])

  const backgroundColorOptions = [
    '#b7e236','#dde236','#36e2a9','#369be2','#e236b2','#e24d36','#5336e2','#e2366a','#e26d36'
  ];
  const getStatusBadge = (status: string) => {
    // Map Sanity subscriptionStatus to display status
    const statusMap: Record<string, string> = {
      'active': 'active',
      'inactive': 'inactive',
      'unsubscribed': 'inactive',
      'bounced': 'inactive',
    }
    const displayStatus = statusMap[status] || 'inactive'
    const statusClass = `status-badge status-${displayStatus}`
    const displayText = status.charAt(0).toUpperCase() + status.slice(1)
    return <span className={statusClass}>{displayText}</span>
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  // Filter and search members
  const filteredMembers = useMemo(() => {
    let result = [...members]

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((member) => {
        const name = (member.name || '').toLowerCase()
        const email = (member.email || '').toLowerCase()
        return name.includes(query) || email.includes(query)
      })
    }

    // Apply filters
    if (filters.length > 0) {
      result = result.filter((member) => {
        return filters.every((filter) => {
          if (!filter.value || (typeof filter.value === 'string' && !filter.value.trim())) return true

          // Handle labels field
          if (filter.field === 'labels') {
            const memberLabelIds = (member.labels || []).map((l) => l._id)
            return memberLabelIds.includes(filter.value)
          }

          // Handle date fields
          if (filter.field === 'createdAt') {
            const memberDate = member.createdAt ? new Date(member.createdAt).getTime() : 0
            const filterDate = new Date(filter.value).getTime()

            switch (filter.operator) {
              case 'before':
                return memberDate < filterDate
              case 'after':
                return memberDate > filterDate
              case 'on or before':
                return memberDate <= filterDate
              case 'on or after':
                return memberDate >= filterDate
              default:
                return true
            }
          }

          // Handle subscriptionStatus field
          if (filter.field === 'subscriptionStatus') {
            return member.subscriptionStatus === filter.value
          }

          // Handle text fields (name, email)
          const fieldValue = String(member[filter.field as keyof typeof member] || '').toLowerCase()
          const filterValue = filter.value.toLowerCase()

          switch (filter.operator) {
            case 'is':
              return fieldValue === filterValue
            case 'contains':
              return fieldValue.includes(filterValue)
            case 'starts with':
              return fieldValue.startsWith(filterValue)
            case 'ends with':
              return fieldValue.endsWith(filterValue)
            case 'does not contain':
              return !fieldValue.includes(filterValue)
            default:
              return true
          }
        })
      })
    }

    return result
  }, [members, searchQuery, filters])

  const handleApplyFilters = () => {
    setShowFilterModal(false)
  }

  const handleResetFilters = () => {
    setFilters([])
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className="members-table-container">
        <div className="members-header">
          <h1>Members</h1>
        </div>
        <div className="loading-state">
          <p>Loading members...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="members-table-container">
        <div className="members-header">
          <h1>Members</h1>
        </div>
        <div className="error-state">
          <p>Error loading members: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="members-table-container">
      <div className="members-header">
        <div>
          <h1>Members</h1>
          <p className="members-count">{filteredMembers.length} {filteredMembers.length === 1 ? 'MEMBER' : 'MEMBERS'}</p>
        </div>
        <div className="members-header-actions">
          <div className="search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="filter-button"
            onClick={() => setShowFilterModal(true)}
            aria-label="Filter"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
            <span>Filter</span>
          </button>
          <button className="new-member-button" onClick={onNewMember}>
            New member
          </button>
        </div>
      </div>
      <div className="table-wrapper">
        {filteredMembers.length === 0 ? (
          <div className="empty-state">
            <p>{searchQuery || filters.length > 0 ? 'No members match your filters.' : 'No members found.'}</p>
          </div>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th>Member Name & Email</th>
                <th>Status</th>
                <th>Source</th>
                <th>Subscription Date</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member._id} onClick={() => onEditMember(member._id)} className="member-row">
                  <td>
                    <div className="member-info">
                      <div className="member-avatar">
                          <div className="avatar-placeholder">
                            <span className="avatar-placeholder-text">
                              {(member.name && member.name.trim().charAt(0).toUpperCase()) ||
                                (member.email && member.email.trim().charAt(0).toUpperCase()) ||
                                "?"}
                            </span>
                          </div>
                        {member.avatar?.asset?._ref ? (
                          <img
                            src={urlFor(member.avatar.asset._ref).url()}
                            alt={member.name ? `${member.name}'s avatar` : 'Avatar'}
                            className="avatar-image"
                          />
                        ) : member.email && (
                          <img
                            src={`https://www.gravatar.com/avatar/${md5(
                              member.email.trim().toLowerCase()
                            )}?s=250&r=g&d=blank`}
                            alt={member.name ? `${member.name}'s gravatar` : 'Gravatar'}
                            className="avatar-image"
                          />
                        )}
                      </div>
                      <div className="member-info-text">
                        <div className="member-name">{member.name || 'Unnamed'}</div>
                        <div className="member-email">{member.email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{getStatusBadge(member.subscriptionStatus || 'inactive')}</td>
                  <td>{member.source ? member.source.replace('_', ' ') : 'N/A'}</td>
                  <td>{formatDate(member.subscriptionDate)}</td>
                  <td>{formatDate(member.createdAt)}
                  {/* Show time ago */}
                  <span style={{ color: '#abb4be', fontSize: '13px', display: 'block' }}>
                    {member.createdAt
                      ? (() => {
                          const now = new Date();
                          const created = new Date(member.createdAt);
                          const diff = Math.floor((now.getTime() - created.getTime()) / 1000);
                          if (diff < 60) return `${diff}s ago`;
                          if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                          if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                          // Calculate days ago
                          const days = Math.floor(diff / 86400);
                          if (days === 1) return "1 day ago";
                          return `${days} days ago`;
                        })()
                      : ''}
                  </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </div>
  )
}

