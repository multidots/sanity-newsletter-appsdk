# Sanity Newsletter App

A powerful, full-featured newsletter management application built with React and Sanity. This app provides a complete solution for managing newsletter subscriptions, creating and publishing posts, managing pages, and tracking analytics.

![Sanity Newsletter App](https://img.shields.io/badge/Sanity-Newsletter%20App-ff6b6b?style=for-the-badge&logo=sanity)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1-3178c6?style=for-the-badge&logo=typescript)

## Features

### Analytics Dashboard
- Real-time visitor and member statistics
- Post performance metrics (views, opens, clicks)
- Growth tracking with interactive charts
- Top performing content insights

### Post Management
- Rich text editor with Portable Text support
- Draft and publish workflow
- Featured images with Sanity image optimization
- Author and tag management
- Excerpt and SEO metadata

### Page Management
- Create and manage static pages
- Custom page layouts
- Navigation editor integration

### Member Management
- Subscriber database with CRUD operations
- Subscription status tracking (active, inactive, unsubscribed, bounced)
- Member labels and categorization
- Source tracking (website, email, social media)
- Filter and search capabilities

### Email Templates
- Automated email template generation
- Customizable header and footer
- Latest posts integration
- Responsive email design

### Settings
- Site settings configuration
- Email settings customization
- Design editor for branding
- Navigation management

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Sanity.io](https://www.sanity.io/) account

## Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/your-username/sanity-newsletter-app.git
cd sanity-newsletter-app
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Sanity

Update the Sanity configuration in \`src/App.tsx\`:

\`\`\`typescript
const sanityConfigs: SanityConfig[] = [
  {
    projectId: 'your-project-id',  // Replace with your Sanity project ID
    dataset: 'production',          // Or your dataset name
    studioMode: {
      enabled: true,
    },
  }
]
\`\`\`

Also update \`src/lib/sanity-client.ts\`:

\`\`\`typescript
const projectId = 'your-project-id'  // Replace with your Sanity project ID
const dataset = 'production'          // Or your dataset name
const apiVersion = '2025-11-26'       // Use current date or your preferred version
\`\`\`

### 4. Update CLI Configuration

Edit \`sanity.cli.ts\` with your organization and app details:

\`\`\`typescript
import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: 'your-organization-id',
    entry: './src/App.tsx',
  },
  deployment: {
    appId: 'your-app-id',
  },
})
\`\`\`

### 5. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

The app will be available at \`http://localhost:3333\` (or the port specified by Sanity CLI).

## Sanity Schema Requirements

This app expects the following document types in your Sanity schema:

### post

\`\`\`javascript
{
  name: 'post',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'excerpt', type: 'text' },
    { name: 'body', type: 'array', of: [{ type: 'block' }] },
    { name: 'image', type: 'image' },
    { name: 'author', type: 'array', of: [{ type: 'reference', to: [{ type: 'author' }] }] },
    { name: 'tag', type: 'array', of: [{ type: 'reference', to: [{ type: 'tag' }] }] },
  ]
}
\`\`\`

### member

\`\`\`javascript
{
  name: 'member',
  type: 'document',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'subscriptionStatus', type: 'string' },
    { name: 'subscriptionDate', type: 'datetime' },
    { name: 'source', type: 'string' },
    { name: 'notes', type: 'text' },
    { name: 'labels', type: 'array', of: [{ type: 'reference', to: [{ type: 'label' }] }] },
  ]
}
\`\`\`

### author

\`\`\`javascript
{
  name: 'author',
  type: 'document',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'avatar', type: 'image' },
  ]
}
\`\`\`

### tag

\`\`\`javascript
{
  name: 'tag',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
  ]
}
\`\`\`

### page

\`\`\`javascript
{
  name: 'page',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'body', type: 'array', of: [{ type: 'block' }] },
  ]
}
\`\`\`

### siteSettings (singleton)

\`\`\`javascript
{
  name: 'siteSettings',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'text' },
    { name: 'logo', type: 'image' },
  ]
}
\`\`\`

### emailSettings (singleton)

\`\`\`javascript
{
  name: 'emailSettings',
  type: 'document',
  fields: [
    { name: 'header', type: 'object' },
    { name: 'titleSection', type: 'object' },
    { name: 'footer', type: 'object' },
  ]
}
\`\`\`

## Available Scripts

| Script | Description |
|--------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production (outputs to \`dist/\`) |
| \`npm run start\` | Start production server |

## Deployment

### Vercel (Recommended)

This project includes a \`vercel.json\` configuration for easy deployment:

1. Connect your repository to Vercel
2. Vercel will automatically detect the configuration
3. Deploy!

The configuration handles:
- Build command: \`npm run build\`
- Output directory: \`dist\`
- SPA routing with rewrites

### Manual Deployment

\`\`\`bash
npm run build
\`\`\`

The \`dist/\` folder contains your production-ready files. Deploy to any static hosting service.

## Environment Variables

For production deployments, you may need to set:

| Variable | Description |
|----------|-------------|
| \`NEXT_PUBLIC_SITE_URL\` | Your site's public URL (for email templates) |
| \`NEXT_PUBLIC_VERCEL_URL\` | Automatically set by Vercel |


## Screenshots


## Support

For issues and questions:
- Check the [Sanity documentation](https://www.sanity.io/docs)
- Review the [Sanity SDK documentation](https://www.sanity.io/docs/sdk)
- Open an issue in this repository

---

Built with [Sanity](https://www.sanity.io/) and [React](https://react.dev/)
