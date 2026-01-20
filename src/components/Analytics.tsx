import React, { useState, useMemo } from 'react'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import '../css/Analytics.css'
import { usePosts, Post } from '../hooks/use-posts'
import { useMemberCount } from '../hooks/use-members'
import { urlFor } from '../lib/image'

type TabType = 'overview' | 'web-traffic' | 'newsletters' | 'growth' | 'locations'
type ContentFilterType = 'all' | 'posts' | 'pages'
type GrowthFilterType = 'all' | 'posts' | 'pages' | 'sources'

export function Analytics() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [dateRange, setDateRange] = useState('Last 30 days')
  const [contentFilter, setContentFilter] = useState<ContentFilterType>('all')
  const [growthFilter, setGrowthFilter] = useState<GrowthFilterType>('all')
  const { posts, loading: postsLoading } = usePosts()
  const { count: memberCount } = useMemberCount()

  // Generate mock visitor data for the last 30 days
  const visitorData = useMemo(() => {
    const data = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        visitors: Math.floor(Math.random() * 50) + 10,
        members: Math.floor(Math.random() * 20) + 5
      })
    }
    return data
  }, [])

  // Calculate total unique visitors
  const totalVisitors = useMemo(() => {
    return visitorData.reduce((sum, day) => sum + day.visitors, 0)
  }, [visitorData])

  // Get published posts from the last 30 days
  const recentPosts = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return posts
      .filter(post => {
        if (post.isDraft) return false
        const postDate = new Date(post._createdAt)
        return postDate >= thirtyDaysAgo
      })
      .sort((a, b) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime())
      .slice(0, 5)
  }, [posts])

  // Get latest post
  const latestPost = useMemo(() => {
    return posts
      .filter(post => !post.isDraft)
      .sort((a, b) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime())[0]
  }, [posts])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  // Calculate member growth percentage (mock)
  const memberGrowth = 7

  // Generate mock pageviews data for web traffic
  const pageviewsData = useMemo(() => {
    const data = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pageviews: Math.floor(Math.random() * 150) + 20
      })
    }
    return data
  }, [])

  // Generate mock newsletter data
  const newsletterData = useMemo(() => {
    const data = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        opens: Math.floor(Math.random() * 10) + 40, // 40-50%
        clicks: Math.floor(Math.random() * 2) + 1 // 1-3%
      })
    }
    return data
  }, [])

  // Generate mock member growth data
  const memberGrowthData = useMemo(() => {
    const data = []
    const today = new Date()
    const baseMembers = memberCount - 200
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const growth = Math.floor((29 - i) * 7) + baseMembers
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        members: growth + Math.floor(Math.random() * 20)
      })
    }
    return data
  }, [memberCount])

  // Mock traffic sources
  const trafficSources = useMemo(() => [
    { source: 'Direct', visitors: 243 },
    { source: 'wp for enterprises newsletter', visitors: 72 },
    { source: 'Google', visitors: 34 },
    { source: 'multidotsinc.eversign.com', visitors: 13 },
    { source: 'newsletter.multidots.com', visitors: 11 },
    { source: 'multidots.com', visitors: 6 },
    { source: 'Bing', visitors: 3 },
    { source: 'Philstack', visitors: 3 },
    { source: 'DuckDuckGo', visitors: 2 }
  ], [])

  // Mock location data
  const locationData = useMemo(() => [
    { country: 'India', code: 'IN', visitors: 107 },
    { country: 'United States', code: 'US', visitors: 106 },
    { country: 'People\'s Republic of China', code: 'CN', visitors: 65 },
    { country: 'United Kingdom', code: 'GB', visitors: 9 },
    { country: 'France', code: 'FR', visitors: 5 },
    { country: 'Ukraine', code: 'UA', visitors: 4 },
    { country: 'Canada', code: 'CA', visitors: 4 },
    { country: 'Belgium', code: 'BE', visitors: 3 },
    { country: 'Russian Federation', code: 'RU', visitors: 3 },
    { country: 'Bangladesh', code: 'BD', visitors: 3 }
  ], [])

  // Calculate total pageviews
  const totalPageviews = useMemo(() => {
    return pageviewsData.reduce((sum, day) => sum + day.pageviews, 0)
  }, [pageviewsData])

  // Mock performance metrics for posts
  const getPostMetrics = (post: Post) => {
    // Generate mock metrics based on post age
    const daysSincePublished = Math.floor(
      (new Date().getTime() - new Date(post._createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    const baseViews = Math.max(20, 100 - daysSincePublished * 2)
    const views = baseViews + Math.floor(Math.random() * 50)
    const openRate = Math.floor(Math.random() * 20) + 35 // 35-55%
    const clicks = Math.floor(openRate * 0.05) // ~5% of open rate
    return { views, openRate, clicks, members: 0 }
  }

  // Get top content sorted by views
  const topContent = useMemo(() => {
    type ContentItem = (Post & { type: 'post' | 'page', views: number }) | { _id: string, title: string, _createdAt: string, _updatedAt: string, type: 'page', views: number, isDraft: boolean }
    
    const content: ContentItem[] = recentPosts.map(post => ({
      ...post,
      type: 'post' as const,
      views: getPostMetrics(post).views
    }))
    
    // Add homepage as a page
    content.unshift({
      _id: 'homepage',
      title: 'Homepage',
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
      type: 'page' as const,
      views: 149,
      isDraft: false
    })

    return content
      .sort((a, b) => b.views - a.views)
      .filter(item => {
        if (contentFilter === 'posts') return item.type === 'post'
        if (contentFilter === 'pages') return item.type === 'page'
        return true
      })
      .slice(0, 8)
  }, [recentPosts, contentFilter])

  // Newsletter metrics
  const newsletterMetrics = useMemo(() => {
    const totalSubscribers = memberCount
    const avgOpenRate = 43
    const avgClickRate = 2
    const subscriberGrowth = 7.2
    return { totalSubscribers, avgOpenRate, avgClickRate, subscriberGrowth }
  }, [memberCount])

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'web-traffic' as TabType, label: 'Web traffic' },
    { id: 'newsletters' as TabType, label: 'Newsletters' },
    { id: 'growth' as TabType, label: 'Growth' },
    { id: 'locations' as TabType, label: 'Locations' }
  ]

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Analytics</h1>
        <div className="analytics-header-right">
          <div className="website-info">
            <span className="website-url">newsletter.multidots.com</span>
            <span className="online-status">0 online</span>
          </div>
          <div className="date-range-selector">
            <button className="date-range-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {dateRange}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="analytics-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`analytics-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="analytics-content">
          {/* Key Metrics Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <h3>Unique visitors</h3>
              </div>
              <div className="metric-value">{totalVisitors.toLocaleString()}</div>
              <div className="metric-chart">
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={visitorData}>
                    <defs>
                      <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#visitorGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h3>Members</h3>
                <span className="metric-growth positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {memberGrowth}%
                </span>
              </div>
              <div className="metric-value">{memberCount.toLocaleString()}</div>
              <div className="metric-chart">
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={visitorData}>
                    <defs>
                      <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="members"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#memberGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Latest Post Performance */}
          {latestPost && (
            <div className="latest-post-section">
              <h2 className="section-title">Latest post performance</h2>
              <div className="latest-post-card">
                <div className="latest-post-thumbnail">
                  {latestPost.image?.asset ? (
                    <img
                      src={urlFor(latestPost.image).width(200).height(120).url()}
                      alt={latestPost.image?.altText || latestPost.title}
                    />
                  ) : (
                    <div className="post-thumbnail-placeholder">
                      <div className="placeholder-content">
                        <span className="placeholder-text">
                          {latestPost.title?.split(' ').slice(0, 4).join(' ').substring(0, 30).toUpperCase() || 'POST'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="latest-post-content">
                  <h3 className="latest-post-title">{latestPost.title || 'Untitled'}</h3>
                  <div className="latest-post-meta">
                    <span>
                      By {latestPost.author?.[0]?.name || 'Unknown'} - {formatDate(latestPost._createdAt)}
                    </span>
                    <span className="post-status">Published and sent</span>
                  </div>
                  <div className="latest-post-actions">
                    <button className="action-button">Share post</button>
                    <button className="action-button">Analytics</button>
                  </div>
                  <div className="latest-post-metrics">
                    <div className="post-metric">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span>{getPostMetrics(latestPost).views}</span>
                    </div>
                    <div className="post-metric">
                      <span>Members</span>
                      <span>{getPostMetrics(latestPost).members}</span>
                    </div>
                    <div className="post-metric">
                      <span>Opens</span>
                      <span>{getPostMetrics(latestPost).openRate}%</span>
                    </div>
                    <div className="post-metric">
                      <span>Clicks</span>
                      <span>{getPostMetrics(latestPost).clicks}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Posts */}
          <div className="top-posts-section">
            <h2 className="section-title">Top posts in the last 30 days</h2>
            {postsLoading ? (
              <div className="loading-state">Loading posts...</div>
            ) : recentPosts.length === 0 ? (
              <div className="empty-state">No posts found in the last 30 days.</div>
            ) : (
              <div className="top-posts-list">
                {recentPosts.map((post) => {
                  const metrics = getPostMetrics(post)
                  const firstAuthor = post.author?.[0]
                  
                  return (
                    <div key={post._id} className="top-post-item">
                      <div className="top-post-thumbnail">
                        {post.image?.asset ? (
                          <img
                            src={urlFor(post.image).width(100).height(60).url()}
                            alt={post.image?.altText || post.title}
                          />
                        ) : (
                          <div className="post-thumbnail-placeholder">
                            <div className="placeholder-content">
                              <span className="placeholder-text">
                                {post.title?.split(' ').slice(0, 3).join(' ').substring(0, 20).toUpperCase() || 'POST'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="top-post-content">
                        <h3 className="top-post-title">{post.title || 'Untitled'}</h3>
                        <div className="top-post-meta">
                          <span>
                            By {firstAuthor?.name || 'Unknown'} - {formatDate(post._createdAt)}
                          </span>
                          <span className="post-status">Published and sent</span>
                        </div>
                      </div>
                      <div className="top-post-metrics">
                        <div className="post-metric-small">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          <span>{metrics.views}</span>
                        </div>
                        <div className="post-metric-small">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                          <span>{metrics.openRate}%</span>
                        </div>
                        <div className="post-metric-small">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          <span>{metrics.members}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Web Traffic Tab */}
      {activeTab === 'web-traffic' && (
        <div className="analytics-content">
          <div className="web-traffic-chart">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pageviewsData}>
                <defs>
                  <linearGradient id="pageviewGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#738a94' }}
                  axisLine={{ stroke: '#e5eff5' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#738a94' }}
                  axisLine={{ stroke: '#e5eff5' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5eff5',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pageviews"
                  stroke="none"
                  fillOpacity={1}
                  fill="url(#pageviewGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="pageviews"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="web-traffic-sections">
            <div className="top-content-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Top content</h2>
                  <p className="section-subtitle">Your highest viewed posts or pages in the last 30 days</p>
                </div>
                <div className="content-filter-tabs">
                  <button 
                    className={`filter-tab ${contentFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setContentFilter('all')}
                  >
                    Posts & pages
                  </button>
                  <button 
                    className={`filter-tab ${contentFilter === 'posts' ? 'active' : ''}`}
                    onClick={() => setContentFilter('posts')}
                  >
                    Posts
                  </button>
                  <button 
                    className={`filter-tab ${contentFilter === 'pages' ? 'active' : ''}`}
                    onClick={() => setContentFilter('pages')}
                  >
                    Pages
                  </button>
                </div>
              </div>
              <div className="content-list">
                {topContent.map((item, index) => (
                  <div key={item._id} className="content-item">
                    <span className="content-number">{index + 1}</span>
                    <span className="content-title">{item.title || 'Untitled'}</span>
                    <span className="content-visitors">{item.views} visitors</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="top-sources-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Top sources</h2>
                  <p className="section-subtitle">How readers found your site in the last 30 days</p>
                </div>
              </div>
              <div className="sources-list">
                {trafficSources.map((source, index) => (
                  <div key={index} className="source-item">
                    <span className="source-name">{source.source}</span>
                    <span className="source-visitors">{source.visitors} visitors</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Newsletters Tab */}
      {activeTab === 'newsletters' && (
        <div className="analytics-content">
          <div className="newsletter-metrics-grid">
            <div className="newsletter-metric-card">
              <div className="metric-header">
                <h3>• Total subscribers</h3>
                <span className="metric-growth positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  +{newsletterMetrics.subscriberGrowth}%
                </span>
              </div>
              <div className="metric-value">{newsletterMetrics.totalSubscribers.toLocaleString()}</div>
            </div>
            <div className="newsletter-metric-card">
              <div className="metric-header">
                <h3>• Avg. open rate</h3>
              </div>
              <div className="metric-value">{newsletterMetrics.avgOpenRate}%</div>
            </div>
            <div className="newsletter-metric-card">
              <div className="metric-header">
                <h3>• Avg. click rate</h3>
              </div>
              <div className="metric-value">{newsletterMetrics.avgClickRate}%</div>
            </div>
          </div>

          <div className="newsletter-charts">
            <div className="newsletter-chart-card">
              <h3 className="chart-title">Newsletters opens in this period</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={newsletterData.slice(-1)}>
                  <XAxis dataKey="date" hide />
                  <YAxis 
                    domain={[0, 50]}
                    tick={{ fontSize: 12, fill: '#738a94' }}
                    axisLine={{ stroke: '#e5eff5' }}
                  />
                  <Bar dataKey="opens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="newsletter-chart-card">
              <h3 className="chart-title">Newsletters clicks in this period</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={newsletterData.slice(-1)}>
                  <XAxis dataKey="date" hide />
                  <YAxis 
                    domain={[0, 10]}
                    tick={{ fontSize: 12, fill: '#738a94' }}
                    axisLine={{ stroke: '#e5eff5' }}
                  />
                  <Bar dataKey="clicks" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="top-newsletters-section">
            <h2 className="section-title">Top newsletters</h2>
            <p className="section-subtitle">Your best performing newsletters in the last 30 days</p>
            <div className="newsletters-table">
              <div className="table-header">
                <div className="table-col">DATE</div>
                <div className="table-col">SENT</div>
                <div className="table-col">OPENS ↑↓</div>
                <div className="table-col">CLICKS</div>
              </div>
              {recentPosts.slice(0, 5).map((post) => {
                const metrics = getPostMetrics(post)
                return (
                  <div key={post._id} className="table-row">
                    <div className="table-col">
                      <div className="newsletter-title">{post.title || 'Untitled'}</div>
                      <div className="newsletter-date">{formatDate(post._createdAt)}</div>
                    </div>
                    <div className="table-col">{memberCount.toLocaleString()}</div>
                    <div className="table-col">{metrics.openRate}%</div>
                    <div className="table-col">{metrics.clicks}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Growth Tab */}
      {activeTab === 'growth' && (
        <div className="analytics-content">
          <div className="growth-section">
            <div className="growth-header">
              <div>
                <h2 className="section-title">Total members</h2>
                <div className="growth-value">
                  <span className="growth-number">{memberCount.toLocaleString()}</span>
                  <span className="metric-growth positive">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    {memberGrowth}%
                  </span>
                </div>
              </div>
            </div>
            <div className="growth-chart">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={memberGrowthData}>
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#738a94' }}
                    axisLine={{ stroke: '#e5eff5' }}
                  />
                  <YAxis 
                    domain={[Math.min(...memberGrowthData.map(d => d.members)) - 100, Math.max(...memberGrowthData.map(d => d.members)) + 100]}
                    tick={{ fontSize: 12, fill: '#738a94' }}
                    axisLine={{ stroke: '#e5eff5' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5eff5',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="members"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#growthGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="growth-content-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Top content</h2>
                <p className="section-subtitle">Which posts or pages drove the most growth in the last 30 days</p>
              </div>
              <div className="content-filter-tabs">
                <button 
                  className={`filter-tab ${growthFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setGrowthFilter('all')}
                >
                  Posts & pages
                </button>
                <button 
                  className={`filter-tab ${growthFilter === 'posts' ? 'active' : ''}`}
                  onClick={() => setGrowthFilter('posts')}
                >
                  Posts
                </button>
                <button 
                  className={`filter-tab ${growthFilter === 'pages' ? 'active' : ''}`}
                  onClick={() => setGrowthFilter('pages')}
                >
                  Pages
                </button>
                <button 
                  className={`filter-tab ${growthFilter === 'sources' ? 'active' : ''}`}
                  onClick={() => setGrowthFilter('sources')}
                >
                  Sources
                </button>
              </div>
            </div>
            <div className="growth-content-list">
              {topContent.slice(0, 5).map((item, index) => (
                <div key={item._id} className="growth-content-item">
                  <div className="growth-content-info">
                    <span className="growth-content-title">{item.title || 'Untitled'}</span>
                    {item.type === 'post' && (
                      <span className="growth-content-meta">Published on {formatDate(item._createdAt)}</span>
                    )}
                  </div>
                  <div className="growth-content-metrics">
                    <span className="growth-badge">+{Math.floor(Math.random() * 3) + 1}</span>
                    <span className="growth-label">FREE MEMBERS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="analytics-content">
          <div className="locations-section">
            <h2 className="section-title">Top Locations</h2>
            <p className="section-subtitle">A geographic breakdown of your readers in the last 30 days</p>
            
            <div className="locations-content">
              <div className="world-map-container">
                <div className="world-map-placeholder">
                  <svg viewBox="0 0 1000 500" className="world-map">
                    {/* Simplified world map representation */}
                    <path d="M100,200 L200,180 L250,200 L280,220 L300,200 L320,180 L350,200 L400,190 L450,200 L500,180 L550,200 L600,190 L650,200 L700,180 L750,200 L800,190 L850,200 L900,180" 
                      stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.3"/>
                    <text x="500" y="250" textAnchor="middle" fontSize="16" fill="#738a94">World Map Visualization</text>
                    <text x="500" y="270" textAnchor="middle" fontSize="12" fill="#abb4be">Interactive map showing visitor locations</text>
                  </svg>
                </div>
              </div>
              
              <div className="locations-list">
                <div className="locations-table-header">
                  <div className="locations-col">COUNTRY</div>
                  <div className="locations-col">VISITORS</div>
                </div>
                {locationData.map((location, index) => (
                  <div key={index} className="location-item">
                    <div className="location-info">
                      <span className="location-flag">{location.code}</span>
                      <span className="location-name">{location.country}</span>
                    </div>
                    <span className="location-visitors">{location.visitors}</span>
                  </div>
                ))}
                <div className="locations-pagination">
                  <button className="pagination-button" disabled>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <span className="pagination-info">Pages 1 of 4</span>
                  <button className="pagination-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
