import {type SanityConfig} from '@sanity/sdk-react'
import {SanityApp} from '@sanity/sdk-react'
import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { MembersTable } from './components/MembersTable'
import { MemberForm } from './components/MemberForm'
import { PostsTable } from './components/PostsTable'
import { PostEditor } from './components/PostEditor'
import { PagesTable } from './components/PagesTable'
import { PageEditor } from './components/PageEditor'
import { Analytics } from './components/Analytics'
import { Settings } from './components/Settings/Settings'
import { useMemberCount } from './hooks/use-members'
import { ToastProvider } from './contexts/ToastContext'
import './App.css'

function AppContent() {
  // Get initial view from URL or default to 'analytics'
  const getViewFromUrl = (): string => {
    const hash = window.location.hash.slice(1) // Remove the '#'
    // Check if it's a settings URL
    if (hash && hash.startsWith('/settings/')) {
      return 'settings'
    }
    // Check if it's a post edit URL
    if (hash && hash.startsWith('/post/edit')) {
      return 'posts'
    }
    // Check if it's a page edit URL
    if (hash && hash.startsWith('/page/edit')) {
      return 'pages'
    }
    const validViews = ['analytics', 'network', 'view-site', 'posts', 'pages', 'tags', 'members', 'settings']
    if (hash && validViews.includes(hash)) {
      return hash
    }
    return 'analytics'
  }
  
  // Extract post ID from URL if present
  const getPostIdFromUrl = (): string | undefined => {
    const hash = window.location.hash.slice(1)
    if (hash && hash.startsWith('/post/edit')) {
      const match = hash.match(/\/post\/edit(?:\/([^\/]+))?/)
      return match?.[1]
    }
    return undefined
  }

  // Extract page ID from URL if present
  const getPageIdFromUrl = (): string | undefined => {
    const hash = window.location.hash.slice(1)
    if (hash && hash.startsWith('/page/edit')) {
      const match = hash.match(/\/page\/edit(?:\/([^\/]+))?/)
      return match?.[1]
    }
    return undefined
  }

  const [activeView, setActiveView] = useState<string>(getViewFromUrl())
  const [memberView, setMemberView] = useState<'list' | 'new' | 'edit'>('list')
  const [editingMemberId, setEditingMemberId] = useState<string | undefined>()
  const initialPostId = getPostIdFromUrl()
  const [postView, setPostView] = useState<'list' | 'new' | 'edit'>(initialPostId ? 'edit' : 'list')
  const [editingPostId, setEditingPostId] = useState<string | undefined>(initialPostId)
  const initialPageId = getPageIdFromUrl()
  const [pageView, setPageView] = useState<'list' | 'new' | 'edit'>(initialPageId ? 'edit' : 'list')
  const [editingPageId, setEditingPageId] = useState<string | undefined>(initialPageId)
  const [showSettings, setShowSettings] = useState(false)
  const { count: memberCount } = useMemberCount()

  // Set initial URL hash if not present (but not for settings)
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash && activeView !== 'settings') {
      window.history.replaceState(null, '', `#${activeView}`)
    }
  }, []) // Only run once on mount

  // Listen for URL hash changes (back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      // If URL is a settings URL, show settings view
      if (hash && hash.startsWith('/settings/')) {
        setActiveView('settings')
      } else if (hash && hash.startsWith('/post/edit')) {
        // Handle post edit URL
        setActiveView('posts')
        const postId = getPostIdFromUrl()
        if (postId) {
          setPostView('edit')
          setEditingPostId(postId)
        } else {
          setPostView('new')
          setEditingPostId(undefined)
        }
      } else if (hash && hash.startsWith('/page/edit')) {
        // Handle page edit URL
        setActiveView('pages')
        const pageId = getPageIdFromUrl()
        if (pageId) {
          setPageView('edit')
          setEditingPageId(pageId)
        } else {
          setPageView('new')
          setEditingPageId(undefined)
        }
      } else {
        const view = getViewFromUrl()
        setActiveView(view)
        if (view !== 'posts') {
          setPostView('list')
          setEditingPostId(undefined)
        }
        if (view !== 'pages') {
          setPageView('list')
          setEditingPageId(undefined)
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Load Google Fonts (fixed font - Inter)
  useEffect(() => {
    // Check if font is already loaded
    const existingLink = document.getElementById('google-fonts-inter')
    if (!existingLink) {
      const link = document.createElement('link')
      link.id = 'google-fonts-inter'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..700&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  // Reset member view when switching away from members
  useEffect(() => {
    if (activeView !== 'members' && memberView !== 'list') {
      setMemberView('list')
      setEditingMemberId(undefined)
    }
  }, [activeView, memberView])

  // Reset post view when switching away from posts
  useEffect(() => {
    if (activeView !== 'posts' && postView !== 'list') {
      setPostView('list')
      setEditingPostId(undefined)
    }
  }, [activeView, postView])

  // Reset page view when switching away from pages
  useEffect(() => {
    if (activeView !== 'pages' && pageView !== 'list') {
      setPageView('list')
      setEditingPageId(undefined)
    }
  }, [activeView, pageView])

  // Handle settings view
  useEffect(() => {
    if (activeView === 'settings') {
      setShowSettings(true)
    } else {
      setShowSettings(false)
    }
  }, [activeView])

  // Handle view change and update URL (except for settings, which handles its own URL)
  const handleViewChange = (view: string) => {
    setActiveView(view)
    // Don't update URL for settings - Settings.tsx handles its own URL
    if (view !== 'settings') {
      window.location.hash = view
    }
  }

  const handleNewMember = () => {
    setMemberView('new')
    setEditingMemberId(undefined)
  }

  const handleEditMember = (memberId: string) => {
    setMemberView('edit')
    setEditingMemberId(memberId)
  }

  const [refreshKey, setRefreshKey] = useState(0)

  const handleMemberSave = () => {
    // Trigger refresh of members list without navigating away
    setRefreshKey(prev => prev + 1)
  }

  const handleMemberCancel = () => {
    setMemberView('list')
    setEditingMemberId(undefined)
  }

  const handleNewPost = () => {
    setPostView('new')
    setEditingPostId(undefined)
    window.location.hash = '/post/edit'
  }

  const handleEditPost = (postId: string) => {
    setPostView('edit')
    setEditingPostId(postId)
    window.location.hash = `/post/edit/${postId}`
  }

  const [postRefreshKey, setPostRefreshKey] = useState(0)

  const handlePostSave = () => {
    setPostRefreshKey(prev => prev + 1)
    setPostView('list')
    setEditingPostId(undefined)
    window.location.hash = 'posts'
  }

  const handlePostCancel = () => {
    setPostView('list')
    setEditingPostId(undefined)
    window.location.hash = 'posts'
  }

  const handleNewPage = () => {
    setPageView('new')
    setEditingPageId(undefined)
    window.location.hash = '/page/edit'
  }

  const handleEditPage = (pageId: string) => {
    setPageView('edit')
    setEditingPageId(pageId)
    window.location.hash = `/page/edit/${pageId}`
  }

  const [pageRefreshKey, setPageRefreshKey] = useState(0)

  const handlePageSave = () => {
    setPageRefreshKey(prev => prev + 1)
    setPageView('list')
    setEditingPageId(undefined)
    window.location.hash = 'pages'
  }

  const handlePageCancel = () => {
    setPageView('list')
    setEditingPageId(undefined)
    window.location.hash = 'pages'
  }

  const renderContent = () => {
    switch (activeView) {
      case 'members':
        if (memberView === 'new' || memberView === 'edit') {
          return (
            <MemberForm
              memberId={editingMemberId}
              onSave={handleMemberSave}
              onCancel={handleMemberCancel}
            />
          )
        }
        return (
          <MembersTable
            key={refreshKey}
            onNewMember={handleNewMember}
            onEditMember={handleEditMember}
          />
        )
      case 'posts':
        if (postView === 'new' || postView === 'edit') {
          return (
            <PostEditor
              postId={editingPostId}
              onSave={handlePostSave}
              onCancel={handlePostCancel}
            />
          )
        }
        return (
          <PostsTable
            key={postRefreshKey}
            onNewPost={handleNewPost}
            onEditPost={handleEditPost}
          />
        )
      case 'pages':
        if (pageView === 'new' || pageView === 'edit') {
          return (
            <PageEditor
              pageId={editingPageId}
              onSave={handlePageSave}
              onCancel={handlePageCancel}
            />
          )
        }
        return (
          <PagesTable
            key={pageRefreshKey}
            onNewPage={handleNewPage}
            onEditPage={handleEditPage}
          />
        )
      case 'analytics':
      default:
        return <Analytics />
    }
  }

  if (showSettings) {
    return (
      <Settings
        onClose={() => {
          setShowSettings(false)
          handleViewChange('analytics')
        }}
      />
    )
  }

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onViewChange={handleViewChange} memberCount={memberCount} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

function App() {
  // apps can access many different projects or other sources of data
  const sanityConfigs: SanityConfig[] = [
    {
      projectId: '3fl01hkb',
      dataset: 'production',
      studioMode: {
        enabled: true,
      },
    }
  ]

  return (
    <div className="app-container">
      <SanityApp config={sanityConfigs} fallback={<div>Loading...</div>}>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </SanityApp> 
    </div>
  )
}

export default App
