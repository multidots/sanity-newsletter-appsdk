import React, { useState, useEffect } from 'react'
import '../css/FilterModal.css'
import { sanityClient } from '../lib/sanity-client'

interface Filter {
  field: string
  operator: string
  value: string
}

interface Label {
  _id: string
  title?: string
}

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  filters: Filter[]
  onFiltersChange: (filters: Filter[]) => void
  onApply: () => void
  onReset: () => void
}

export function FilterModal({ isOpen, onClose, filters, onFiltersChange, onApply, onReset }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters)
  const [labels, setLabels] = useState<Label[]>([])

  // Initialize with default filter when modal opens
  useEffect(() => {
    if (isOpen) {
      if (filters.length === 0) {
        setLocalFilters([{ field: 'name', operator: 'is', value: '' }])
      } else {
        setLocalFilters(filters)
      }
    }
  }, [isOpen, filters])

  // Fetch labels when modal opens
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen])

  if (!isOpen) return null

  const addFilter = () => {
    setLocalFilters([...localFilters, { field: 'name', operator: 'is', value: '' }])
  }

  const updateFilter = (index: number, field: keyof Filter, value: string) => {
    const updated = [...localFilters]
    updated[index] = { ...updated[index], [field]: value }
    // Reset operator and value when field changes
    if (field === 'field') {
      const fieldType = getFieldType(value)
      updated[index].operator = getDefaultOperator(fieldType)
      updated[index].value = ''
    }
    // Reset value when operator changes
    if (field === 'operator') {
      updated[index].value = ''
    }
    setLocalFilters(updated)
  }

  const removeFilter = (index: number) => {
    setLocalFilters(localFilters.filter((_, i) => i !== index))
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
    onApply()
  }

  const handleReset = () => {
    const defaultFilter = [{ field: 'name', operator: 'is', value: '' }]
    setLocalFilters(defaultFilter)
    onFiltersChange(defaultFilter)
    onReset()
  }

  const getFieldType = (field: string): 'text' | 'date' | 'select' | 'labels' => {
    if (field === 'createdAt') return 'date'
    if (field === 'subscriptionStatus') return 'select'
    if (field === 'labels') return 'labels'
    return 'text'
  }

  const getDefaultOperator = (fieldType: string): string => {
    if (fieldType === 'date') return 'before'
    if (fieldType === 'select' || fieldType === 'labels') return 'is'
    return 'is'
  }

  const fieldOptions = [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'labels', label: 'Labels' },
    { value: 'createdAt', label: 'Created' },
    { value: 'subscriptionStatus', label: 'Newsletter subscription' },
  ]

  const getOperatorOptions = (field: string) => {
    const fieldType = getFieldType(field)
    
    if (fieldType === 'text') {
      return [
        { value: 'is', label: 'is' },
        { value: 'contains', label: 'Contains' },
        { value: 'starts with', label: 'Start with' },
        { value: 'ends with', label: 'End with' },
        { value: 'does not contain', label: 'Does not contain' },
      ]
    }
    
    if (fieldType === 'date') {
      return [
        { value: 'before', label: 'Before' },
        { value: 'after', label: 'After' },
        { value: 'on or before', label: 'On or before' },
        { value: 'on or after', label: 'On or after' },
      ]
    }
    
    if (fieldType === 'select') {
      return [
        { value: 'is', label: 'is' },
      ]
    }
    
    if (fieldType === 'labels') {
      return [
        { value: 'is', label: 'is' },
      ]
    }
    
    return []
  }

  const getValueInput = (filter: Filter, index: number) => {
    const fieldType = getFieldType(filter.field)

    if (fieldType === 'date') {
      return (
        <input
          type="date"
          className="filter-value-input filter-value-date"
          value={filter.value}
          onChange={(e) => updateFilter(index, 'value', e.target.value)}
        />
      )
    }

    if (fieldType === 'select') {
      return (
        <select
          className="filter-value-input filter-value-select"
          value={filter.value}
          onChange={(e) => updateFilter(index, 'value', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="active">Subscribe</option>
          <option value="unsubscribed">Unsubscribe</option>
          <option value="bounced">Email disabled</option>
          <option value="inactive">Inactive</option>
        </select>
      )
    }

    if (fieldType === 'labels') {
      return (
        <select
          className="filter-value-input filter-value-select"
          value={filter.value}
          onChange={(e) => updateFilter(index, 'value', e.target.value)}
        >
          <option value="">Select label...</option>
          {labels.map((label) => (
            <option key={label._id} value={label._id}>
              {label.title || 'Untitled'}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type="text"
        className="filter-value-input"
        value={filter.value}
        onChange={(e) => updateFilter(index, 'value', e.target.value)}
        placeholder="Enter value..."
      />
    )
  }

  return (
    <div className="filter-modal-overlay" onClick={onClose}>
      <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="filter-modal-header">
          <h2>Filter list</h2>
        </div>
        <div className="filter-modal-content">
          {localFilters.map((filter, index) => (
            <div key={index} className="filter-row">
              <select
                className="filter-field-select"
                value={filter.field}
                onChange={(e) => updateFilter(index, 'field', e.target.value)}
              >
                {fieldOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                className="filter-operator-select"
                value={filter.operator}
                onChange={(e) => updateFilter(index, 'operator', e.target.value)}
              >
                {getOperatorOptions(filter.field).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="filter-value-wrapper">
                {getValueInput(filter, index)}
                {filter.value && getFieldType(filter.field) !== 'select' && getFieldType(filter.field) !== 'labels' && (
                  <button
                    className="filter-clear-button"
                    onClick={() => updateFilter(index, 'value', '')}
                    aria-label="Clear"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
              {localFilters.length > 1 && (
                <button
                  className="filter-remove-button"
                  onClick={() => removeFilter(index)}
                  aria-label="Remove filter"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button className="add-filter-button" onClick={addFilter}>
            + Add filter
          </button>
        </div>
        <div className="filter-modal-footer">
          <button className="reset-filters-button" onClick={handleReset}>
            Reset all
          </button>
          <button className="apply-filters-button" onClick={handleApply}>
            Apply filters
          </button>
        </div>
      </div>
    </div>
  )
}

