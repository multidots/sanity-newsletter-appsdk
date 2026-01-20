import React, { useState, useEffect } from 'react'
import '../css/Sidebar.css'
import mdincLogo from '/src/assets/mdinc-logo.svg'

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  memberCount?: number
}

export function Sidebar({ activeView, onViewChange, memberCount = 0 }: SidebarProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or system preference
    const savedTheme = localStorage.getItem('theme')
    let shouldBeDark = false
    
    if (savedTheme) {
      shouldBeDark = savedTheme === 'dark'
    } else {
      // Fallback to system preference
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    
    // Apply theme immediately to prevent flash
    const root = document.documentElement
    if (shouldBeDark) {
      root.classList.add('dark-mode')
    } else {
      root.classList.remove('dark-mode')
    }
    
    return shouldBeDark
  })

  // Apply dark mode to document and persist preference
  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  // Listen for system theme changes (optional)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('theme')
      if (!savedTheme) {
        setIsDarkMode(e.matches)
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <a href="/">
              <img src={mdincLogo} alt="Newsletter" />
            </a>
          </div>
        </div>
        <button className="search-button" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          <button
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => onViewChange('analytics')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>Analytics</span>
          </button>
          <button
            className={`nav-item ${activeView === 'view-site' ? 'active' : ''}`}
            onClick={() => window.open(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', '_blank')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>View site</span>
          </button>
        </div>

        <div className="nav-group">
          <button
            className={`nav-item ${activeView === 'posts' ? 'active' : ''}`}
            onClick={() => onViewChange('posts')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Posts</span>
          </button>
          <button
            className={`nav-item ${activeView === 'pages' ? 'active' : ''}`}
            onClick={() => onViewChange('pages')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Pages</span>
          </button>
          <button
            className={`nav-item ${activeView === 'tags' ? 'active' : ''}`}
            onClick={() => onViewChange('tags')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <circle cx="7" cy="7" r="1.5"></circle>
            </svg>
            <span>Tags</span>
          </button>
          <button
            className={`nav-item ${activeView === 'members' ? 'active' : ''}`}
            onClick={() => onViewChange('members')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Members</span>
            {memberCount > 0 && <span className="nav-count">{memberCount.toLocaleString()}</span>}
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="footer-button user-button" aria-label="User menu">
          <div className="user-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button className="footer-button" aria-label="Settings" onClick={() => onViewChange('settings')}>
          <svg viewBox="0 0 24 24" aria-labelledby="f82c24bc-44e4-4d1f-9000-866b7ce9c8af">
            <title id="f82c24bc-44e4-4d1f-9000-866b7ce9c8af">Settings (CTRL/⌘ + ,)</title><path className="settings_svg__a" d="M10.546 2.438a1.957 1.957 0 002.908 0L14.4 1.4a1.959 1.959 0 013.41 1.413l-.071 1.4a1.958 1.958 0 002.051 2.054l1.4-.071a1.959 1.959 0 011.41 3.41l-1.042.94a1.96 1.96 0 000 2.909l1.042.94a1.959 1.959 0 01-1.413 3.41l-1.4-.071a1.958 1.958 0 00-2.056 2.056l.071 1.4A1.959 1.959 0 0114.4 22.6l-.941-1.041a1.959 1.959 0 00-2.908 0L9.606 22.6A1.959 1.959 0 016.2 21.192l.072-1.4a1.958 1.958 0 00-2.056-2.056l-1.4.071A1.958 1.958 0 011.4 14.4l1.041-.94a1.96 1.96 0 000-2.909L1.4 9.606A1.958 1.958 0 012.809 6.2l1.4.071a1.958 1.958 0 002.058-2.06L6.2 2.81A1.959 1.959 0 019.606 1.4z"></path><circle className="settings_svg__a" cx="12" cy="12.001" r="4.5"></circle></svg>
        </button>
        <button 
          className={`footer-button theme-toggle ${isDarkMode ? 'dark' : ''}`}
          onClick={() => setIsDarkMode(!isDarkMode)}
          aria-label="Toggle theme"
        >
          <div className="theme-toggle-inner">
            {isDarkMode ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}

