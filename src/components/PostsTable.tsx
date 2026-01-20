import React, { useState, useMemo } from 'react'
import '../css/PostsTable.css'
import { usePosts, useAuthors, useTags, Post } from '../hooks/use-posts'
import { urlFor } from '../lib/image'
import Select from 'react-select'
import {useDocuments} from '@sanity/sdk-react'

type StatusFilter = 'all' | 'draft' | 'published'
type SortOption = 'newest' | 'oldest' | 'recent-updated'

interface PostsTableProps {
  onNewPost?: () => void
  onEditPost?: (postId: string) => void
}

export function PostsTable({ onNewPost, onEditPost }: PostsTableProps) {
  const { posts, loading, error } = usePosts()

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

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts]

    // Apply status filter
    if (statusFilter === 'draft') {
      result = result.filter(post => post.isDraft === true)
    } else if (statusFilter === 'published') {
      result = result.filter(post => post.isDraft !== true)
    }

    // Apply author filter
    if (selectedAuthor) {
      result = result.filter(post => 
        post.author?.some(a => a && a._id === selectedAuthor) || false
      )
    }

    // Apply tag filter
    if (selectedTag) {
      result = result.filter(post =>
        post.tag?.some(t => t && t._id === selectedTag) || false
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
  }, [posts, statusFilter, selectedAuthor, selectedTag, sortOption])

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
    { value: 'all', label: 'All posts' },
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
      <div className="posts-table-container">
        <div className="posts-header">
          <h1>Posts</h1>
        </div>
        <div className="loading-state">
          <p>Loading posts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="posts-table-container">
        <div className="posts-header">
          <h1>Posts</h1>
        </div>
        <div className="error-state">
          <p>Error loading posts: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="posts-table-container">
      <div className="posts-header">
        <h1>Posts</h1>

      <div className="posts-filters">
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
        {onNewPost && (
          <button className="new-post-button" onClick={onNewPost}>
            New post
          </button>
        )}
      </div>
      </div>

      <div className="posts-list">
        {filteredAndSortedPosts.length === 0 ? (
          <div className="empty-state">
            <p>No posts found.</p>
          </div>
        ) : (
          filteredAndSortedPosts.map((post) => {
            const firstAuthor = post.author?.find(a => a && a._id) || null
            const firstTag = post.tag?.find(t => t && t._id) || null
            const imageUrl = post.image?.asset 
              ? urlFor(post.image).width(200).height(200).url()
              : null

            return (
              <div
                key={post._id}
                className="post-item"
                onClick={() => onEditPost?.(post._id)}
              >
                <div className="post-thumbnail">
                  {imageUrl ? (
                    <img src={imageUrl} alt={post.image?.altText || post.title} />
                  ) : (
                    <div className="post-thumbnail-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="post-content">
                  <h3 className="post-title">{post.title || 'Untitled'}</h3>
                  <div className="post-meta">
                    {firstAuthor && (
                      <span className="post-author">
                        By {firstAuthor.name || 'Unknown'}
                        {firstTag && firstTag.title && ` in ${firstTag.title}`}
                      </span>
                    )}
                    {!firstAuthor && firstTag && firstTag.title && (
                      <span className="post-tag">In {firstTag.title}</span>
                    )}
                    <span className="post-date">
                      - {formatDate(post._createdAt)}
                    </span>
                  </div>
                </div>
                <div className="post-actions">
                  {getStatusBadge(post.isDraft === true)}
                  <button
                    className="post-edit-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditPost?.(post._id)
                    }}
                    aria-label="Edit post"
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

