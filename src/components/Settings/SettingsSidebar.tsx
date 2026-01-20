import React from 'react'
import '../../css/SettingsSidebar.css'

interface SettingsSidebarProps {
  activeSetting: string
  onSettingChange: (setting: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const settingsGroups = [
    {
      title: 'General settings',
      items: [
        { id: 'title-description', label: 'Title & description', icon: 'monitor' },
        { id: 'timezone', label: 'Timezone', icon: 'clock' },
        { id: 'publication-language', label: 'Publication language', icon: 'globe' },
        { id: 'meta-data', label: 'Meta data', icon: 'tag' },
        { id: 'social-accounts', label: 'Social accounts', icon: 'link' },
        { id: 'analytics', label: 'Analytics', icon: 'chart' },
        { id: 'private-site', label: 'Make this site private', icon: 'lock' },
      ],
    },
    {
      title: 'Site',
      items: [
        { id: 'design-branding', label: 'Design & branding', icon: 'palette' },
        { id: 'theme', label: 'Theme', icon: 'paint' },
        { id: 'navigation', label: 'Navigation', icon: 'list' },
       ],
    },
    {
      title: 'Membership',
      items: [
        { id: 'access', label: 'Access', icon: 'key' },
        { id: 'newsletters', label: 'Newsletters', icon: 'envelope' },
      ],
    },
  ]

export function SettingsSidebar({
  activeSetting,
  onSettingChange,
  searchQuery,
  onSearchChange,
}: SettingsSidebarProps) {
  // Filter settings based on search query
  const filteredSettingsGroups = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return settingsGroups
    }

    const query = searchQuery.toLowerCase().trim()
    
    return settingsGroups
      .map((group) => {
        const filteredItems = group.items.filter((item) =>
          item.label.toLowerCase().includes(query)
        )
        
        // Only include group if it has matching items
        if (filteredItems.length > 0) {
          return {
            ...group,
            items: filteredItems,
          }
        }
        return null
      })
      .filter((group): group is typeof settingsGroups[0] => group !== null)
  }, [searchQuery])

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactElement> = {
      monitor: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      ),
      clock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      globe: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      ),
      users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      tag: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <circle cx="7" cy="7" r="1.5"></circle>
        </svg>
      ),
      link: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      ),
      chart: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      ),
      lock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      ),
      palette: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="13.5" cy="6.5" r=".5"></circle>
          <circle cx="17.5" cy="10.5" r=".5"></circle>
          <circle cx="8.5" cy="7.5" r=".5"></circle>
          <circle cx="6.5" cy="12.5" r=".5"></circle>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
        </svg>
      ),
      paint: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      ),
      list: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      ),
      megaphone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11l18-5v12L3 13v-2z"></path>
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>
        </svg>
      ),
      key: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
        </svg>
      ),
      'user-plus': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
      ),
      envelope: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      ),
    }
    return icons[iconName] || icons.monitor
  }

  return (
    <div className="settings-sidebar">
      <div className="settings-search">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search settings"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <nav className="settings-nav">
        {filteredSettingsGroups.length > 0 ? (
          filteredSettingsGroups.map((group) => (
            <div key={group.title} className="settings-group">
              <div className="settings-group-title">{group.title}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`settings-nav-item ${activeSetting === item.id ? 'active' : ''}`}
                  onClick={() => onSettingChange(item.id)}
                >
                  <span className="settings-nav-icon">{getIcon(item.icon)}</span>
                  <span className="settings-nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))
        ) : (
          <div className="settings-no-results">
            <p>No settings found matching "{searchQuery}"</p>
          </div>
        )}
      </nav>
    </div>
  )
}

