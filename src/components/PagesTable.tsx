import React, { useState, useMemo } from 'react'
import '../css/PagesTable.css'
import { usePages, Page } from '../hooks/use-pages'
import { useAuthors, useTags } from '../hooks/use-posts'
import { urlFor } from '../lib/image'
import Select from 'react-select'
import {useDocuments} from '@sanity/sdk-react'

type StatusFilter = 'all' | 'draft' | 'published'
type SortOption = 'newest' | 'oldest' | 'recent-updated'

interface PagesTableProps {
  onNewPage?: () => void
  onEditPage?: (pageId: string) => void
}

export function PagesTable({ onNewPage, onEditPage }: PagesTableProps) {
  const { pages, loading, error } = usePages()

  // Use the same authors and tags hooks as posts
  const { authors } = useAuthors()
  const { tags } = useTags()


  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('newest')


  const formatDate = (dateString: string) => {
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

  const getStatusBadge = (isDraft: boolean) => {
    if (isDraft) {
      return <span className="status-badge status-draft">Draft</span>
    }
    return <span className="status-badge status-published">Published</span>
  }

  // Filter and sort pages
  const filteredAndSortedPages = useMemo(() => {
    let result = [...pages]

    // Apply status filter
    if (statusFilter === 'draft') {
      result = result.filter(page => page.isDraft === true)
    } else if (statusFilter === 'published') {
      result = result.filter(page => page.isDraft !== true)
    }

    // Apply author filter
    if (selectedAuthor) {
      result = result.filter(page => 
        page.author?.some(a => a && a._id === selectedAuthor) || false
      )
    }

    // Apply tag filter
    if (selectedTag) {
      result = result.filter(page =>
        page.tag?.some(t => t && t._id === selectedTag) || false
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime()
        case 'oldest':
          return new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime()
        case 'recent-updated':
          return new Date(b._updatedAt).getTime() - new Date(a._updatedAt).getTime()
        default:
          return 0
      }
    })

    return result
  }, [pages, statusFilter, selectedAuthor, selectedTag, sortOption])

  const authorOptions = [
    { value: '', label: 'All authors' },
    ...authors.map(author => ({
      value: author._id,
      label: author.name || 'Unnamed'
    }))
  ]

  const tagOptions = [
    { value: '', label: 'All tags' },
    ...tags.map(tag => ({
      value: tag._id,
      label: tag.title || 'Unnamed'
    }))
  ]

  const statusOptions = [
    { value: 'all', label: 'All pages' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' }
  ]

  const sortOptions = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'recent-updated', label: 'Recent updated' }
  ]

  const getSelectStyles = (isActive: boolean = false) => ({
    control: (provided: any) => ({
      ...provided,
      minHeight: '34px',
      height: '34px',
      border: '1px solid #e6e9eb',
      borderRadius: '5px',
      fontSize: '13px',
      boxShadow: 'none',
      color: isActive ? '#394047' : '#394047',
      backgroundColor: '#ffffff',
      '&:hover': {
        backgroundColor: '#f1f3f4'
      }
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      height: '34px',
      padding: '0 12px',
    }),
    input: (provided: any) => ({
      ...provided,
      margin: '0px'
    }),
    indicatorsContainer: (provided: any) => ({
      ...provided,
      height: '34px'
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#f8f9fa' : state.isFocused ? '#f8f9fa' : 'white',
      color: state.isSelected ? '#394047' : '#394047',
      '&:hover': {
        backgroundColor: state.isSelected ? '#f8f9fa' : '#f8f9fa'
      },
      fontSize: '13px',
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: '#edeeee'
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: isActive ? '#394047' : '#394047',
      fontSize: '13px',
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: '#15171a',
      '&:hover': {
        backgroundColor: '#d4edda',
        color: '#155724'
      }
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: isActive ? '#30cf43' : '#15171a',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#738a94'
    })
  })

  if (loading) {
    return (
      <div className="pages-table-container">
        <div className="pages-header">
          <h1>Pages</h1>
        </div>
        <div className="loading-state">
          <p>Loading pages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pages-table-container">
        <div className="pages-header">
          <h1>Pages</h1>
        </div>
        <div className="error-state">
          <p>Error loading pages: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pages-table-container">
      <div className="pages-header">
        <h1>Pages</h1>

      <div className="pages-filters">
        <div className="filter-group">
          <Select
            options={statusOptions}
            value={statusOptions.find(opt => opt.value === statusFilter)}
            onChange={(option) => setStatusFilter((option?.value as StatusFilter) || 'all')}
            styles={getSelectStyles(statusFilter !== 'all')}
            isSearchable={false}
          />
        </div>

        <div className="filter-group">
          <Select
            options={authorOptions}
            value={authorOptions.find(opt => 
              selectedAuthor ? opt.value === selectedAuthor : opt.value === ''
            )}
            onChange={(option) => setSelectedAuthor(option?.value && option.value !== '' ? option.value : null)}
            styles={getSelectStyles(selectedAuthor !== null)}
            isSearchable={false}
          />
        </div>

        <div className="filter-group">
          <Select
            options={tagOptions}
            value={tagOptions.find(opt => 
              selectedTag ? opt.value === selectedTag : opt.value === ''
            )}
            onChange={(option) => setSelectedTag(option?.value && option.value !== '' ? option.value : null)}
            styles={getSelectStyles(selectedTag !== null)}
            isSearchable={true}
          />
        </div>

        <div className="filter-group">
          <Select
            options={sortOptions}
            value={sortOptions.find(opt => opt.value === sortOption)}
            onChange={(option) => setSortOption((option?.value as SortOption) || 'newest')}
            styles={getSelectStyles(sortOption !== 'newest')}
            isSearchable={false}
          />
        </div>
        {onNewPage && (
          <button className="new-page-button" onClick={onNewPage}>
            New page
          </button>
        )}
      </div>
      </div>

      <div className="pages-list">
        {filteredAndSortedPages.length === 0 ? (
          <div className="empty-state">
            <p>No pages found.</p>
          </div>
        ) : (
          filteredAndSortedPages.map((page) => {
            const firstAuthor = page.author?.find(a => a && a._id) || null
            const firstTag = page.tag?.find(t => t && t._id) || null
            const imageUrl = page.image?.asset 
              ? urlFor(page.image).width(200).height(200).url()
              : null

            return (
              <div
                key={page._id}
                className="page-item"
                onClick={() => onEditPage?.(page._id)}
              >
                <div className="page-thumbnail">
                  {imageUrl ? (
                    <img src={imageUrl} alt={page.image?.altText || page.title} />
                  ) : (
                    <div className="page-thumbnail-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="page-content">
                  <h3 className="page-title">{page.title || 'Untitled'}</h3>
                  <div className="page-meta">
                    {firstAuthor && (
                      <span className="page-author">
                        By {firstAuthor.name || 'Unknown'}
                        {firstTag && firstTag.title && ` in ${firstTag.title}`}
                      </span>
                    )}
                    {!firstAuthor && firstTag && firstTag.title && (
                      <span className="page-tag">In {firstTag.title}</span>
                    )}
                    <span className="page-date">
                      - {formatDate(page._createdAt)}
                    </span>
                  </div>
                </div>
                <div className="page-actions">
                  {getStatusBadge(page.isDraft === true)}
                  <button
                    className="page-edit-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditPage?.(page._id)
                    }}
                    aria-label="Edit page"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

