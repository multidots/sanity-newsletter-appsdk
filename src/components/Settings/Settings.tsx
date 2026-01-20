import React, { useState, useEffect, useRef } from 'react'
import '../../css/Settings.css'
import { SettingsSidebar } from './SettingsSidebar'
import { SettingsContent } from './SettingsContent'

interface SettingsProps {
  onClose: () => void
}

// Valid setting IDs
const validSettings = [
  'title-description',
  'timezone',
  'publication-language',
  'meta-data',
  'social-accounts',
  'analytics',
  'private-site',
  'design-branding',
  'theme',
  'navigation',
  'access',
  'newsletters',
]

export function Settings({ onClose }: SettingsProps) {

  // Get setting from URL or default to 'title-description'
  const getSettingFromUrl = (): string => {
    const hash = window.location.hash.slice(1) // Remove the '#'
    if (hash && hash.startsWith('/settings/')) {
      const settingId = hash.replace('/settings/', '')
      if (validSettings.includes(settingId)) {
        return settingId
      }
    }
    return 'title-description'
  }

  const [activeSetting, setActiveSetting] = useState<string>(getSettingFromUrl())
  const [searchQuery, setSearchQuery] = useState('')
  const isProgrammaticScroll = useRef(false)
  const isScrollSpyUpdate = useRef(false)

  // Initialize from URL hash on mount
  useEffect(() => {
    const settingFromUrl = getSettingFromUrl()
    // Always set the active setting from URL on mount
    setActiveSetting(settingFromUrl)
    // Set URL if not present or doesn't match expected format
    const currentHash = window.location.hash.slice(1)
    if (!currentHash || !currentHash.startsWith('/settings/')) {
      window.history.replaceState(null, '', `#/settings/${settingFromUrl}`)
    }
  }, []) // Only run on mount

  // Update URL when setting changes and scroll to section
  useEffect(() => {
    // Only update URL if it's different (to avoid unnecessary updates)
    const currentHash = window.location.hash.slice(1)
    if (currentHash !== `/settings/${activeSetting}`) {
      window.history.replaceState(null, '', `#/settings/${activeSetting}`)
    }
    
    // Don't scroll if this update came from scroll spy
    if (isScrollSpyUpdate.current) {
      isScrollSpyUpdate.current = false
      return
    }
    
    // Scroll to section
    const element = document.getElementById(`setting-${activeSetting}`)
    if (element) {
      isProgrammaticScroll.current = true
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Reset flag after scroll animation completes (typically 500ms)
        setTimeout(() => {
          isProgrammaticScroll.current = false
        }, 600)
      }, 100)
    }
  }, [activeSetting])

  // Listen for hash changes (back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const settingFromUrl = getSettingFromUrl()
      if (settingFromUrl !== activeSetting) {
        setActiveSetting(settingFromUrl)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [activeSetting])

  // Scroll spy: Update active setting when scrolling to sections
  useEffect(() => {
    const observerOptions = {
      root: null, // Use viewport as root
      rootMargin: '-20% 0px -60% 0px', // Trigger when section is 20% from top
      threshold: 0,
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Don't update if we're programmatically scrolling
      if (isProgrammaticScroll.current) {
        return
      }

      // Find the entry that is most visible (highest intersection ratio)
      const visibleEntries = entries.filter(entry => entry.isIntersecting)
      if (visibleEntries.length > 0) {
        // Sort by intersection ratio, get the most visible one
        const mostVisible = visibleEntries.reduce((prev, current) => 
          (current.intersectionRatio > prev.intersectionRatio) ? current : prev
        )
        
        // Extract setting ID from element ID (format: "setting-{id}")
        const elementId = mostVisible.target.id
        if (elementId && elementId.startsWith('setting-')) {
          const settingId = elementId.replace('setting-', '')
          if (validSettings.includes(settingId) && settingId !== activeSetting) {
            // Mark this as a scroll spy update to prevent scroll effect from running
            isScrollSpyUpdate.current = true
            // Update URL without triggering scroll
            window.history.replaceState(null, '', `#/settings/${settingId}`)
            setActiveSetting(settingId)
          }
        }
      }
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // Wait for DOM to be ready, then observe all setting sections
    const timeoutId = setTimeout(() => {
      const sections = validSettings.map(settingId => 
        document.getElementById(`setting-${settingId}`)
      ).filter(Boolean) as HTMLElement[]

      sections.forEach(section => observer.observe(section))
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      // Unobserve all sections
      validSettings.forEach(settingId => {
        const section = document.getElementById(`setting-${settingId}`)
        if (section) {
          observer.unobserve(section)
        }
      })
    }
  }, [activeSetting])

  const handleSettingChange = (setting: string) => {
    isProgrammaticScroll.current = true
    setActiveSetting(setting)
    window.location.hash = `/settings/${setting}`
    // Reset flag after scroll animation completes
    setTimeout(() => {
      isProgrammaticScroll.current = false
    }, 600)
  }

  return (
    <div className="settings-container">
      <SettingsSidebar
        activeSetting={activeSetting}
        onSettingChange={handleSettingChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <SettingsContent
        activeSetting={activeSetting}
        onClose={onClose}
      />
    </div>
  )
}

