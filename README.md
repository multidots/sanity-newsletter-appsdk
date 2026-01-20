# 📨 **Sanity Newsletter App**

A powerful, full-featured Newsletter Management Platform built with React, TypeScript, and Sanity CMS.
This application provides an end-to-end solution for managing subscribers, publishing content, designing email templates, and tracking performance — all from a modern, highly customizable admin interface.

Built using the Sanity App SDK, enabling deep customization of the admin experience with custom tools, workflows, and interfaces.

![Sanity Newsletter App](https://img.shields.io/badge/Sanity-Newsletter%20App-ff6b6b?style=for-the-badge\&logo=sanity)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge\&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1-3178c6?style=for-the-badge\&logo=typescript)

---

## 🚀 Features

### 📊 Analytics Dashboard

* Real-time visitor & subscriber statistics
* Post performance metrics (views, opens, clicks)
* Growth tracking with interactive charts
* Top-performing content insights

### 📝 Post Management

* Rich-text editor with **Portable Text**
* Draft & publish workflow
* Featured images with Sanity image optimization
* Author & tag management
* SEO metadata & excerpts

### 📄 Page Management

* Create & manage static pages
* Custom page layouts
* Navigation editor integration

### 👥 Member Management

* Full subscriber database (CRUD)
* Subscription lifecycle tracking
* Labels & segmentation
* Source tracking (web, email, social)
* Advanced filtering & search

### ✉️ Email Templates

* Automated email template generation
* Custom header & footer controls
* Latest posts auto-insertion
* Fully responsive email layout

### ⚙️ Settings

* Site configuration
* Email customization
* Branding design editor
* Navigation management

---

## 🧱 Tech Stack

* **Frontend:** React 19, TypeScript 5.1
* **CMS:** Sanity.io
* **Email Engine:** Custom email rendering
* **Deployment:** Vercel / Static Hosting

---

## 🧩 Prerequisites

* Node.js **v18+**
* npm or yarn
* A **Sanity.io** account

---

## 🛠 Getting Started

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/sanity-newsletter-app.git
cd sanity-newsletter-app
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Configure Sanity

**`src/App.tsx`**

```ts
const sanityConfigs: SanityConfig[] = [
  {
    projectId: 'your-project-id',
    dataset: 'production',
    studioMode: {
      enabled: true,
    },
  }
]
```

**`src/lib/sanity-client.ts`**

```ts
const projectId = 'your-project-id'
const dataset = 'production'
const apiVersion = '2025-11-26'
```

### 4️⃣ Update CLI Configuration

**`sanity.cli.ts`**

```ts
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: 'your-organization-id',
    entry: './src/App.tsx',
  },
  deployment: {
    appId: 'your-app-id',
  },
})
```

### 5️⃣ Start Development Server

```bash
npm run dev
```

App will run at:

```
http://localhost:3333
```

---

## 🧬 Sanity Schema Requirements

### 📰 **post**

```js
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
```

### 👤 **member**

```js
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
```

### 🧑 **author**

```js
{
  name: 'author',
  type: 'document',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'avatar', type: 'image' },
  ]
}
```

### 🏷 **tag**

```js
{
  name: 'tag',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
  ]
}
```

### 📄 **page**

```js
{
  name: 'page',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'body', type: 'array', of: [{ type: 'block' }] },
  ]
}
```

### 🏗 **siteSettings** (Singleton)

```js
{
  name: 'siteSettings',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'text' },
    { name: 'logo', type: 'image' },
  ]
}
```

### ✉️ **emailSettings** (Singleton)

```js
{
  name: 'emailSettings',
  type: 'document',
  fields: [
    { name: 'header', type: 'object' },
    { name: 'titleSection', type: 'object' },
    { name: 'footer', type: 'object' },
  ]
}
```

---

## 📜 Available Scripts

| Script          | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |
| `npm run start` | Start production server  |

---

## 🚢 Deployment

### Vercel (Recommended)

1. Connect repository to **Vercel**
2. Vercel auto-detects configuration
3. Deploy 🎉

Includes:

* Build command → `npm run build`
* Output directory → `dist`
* SPA routing via rewrites

### Manual Deployment

```bash
npm run build
```

Deploy contents of **`dist/`** to any static hosting provider.

---

## 🌍 Environment Variables

| Variable                 | Purpose                             |
| ------------------------ | ----------------------------------- |
| `NEXT_PUBLIC_SITE_URL`   | Public site URL for email templates |
| `NEXT_PUBLIC_VERCEL_URL` | Provided automatically by Vercel    |

---

## 🧪 Screenshots

Dashboard

![Sanity Newsletter App](https://raw.githubusercontent.com/multidots/sanity-newsletter-appsdk/refs/heads/main/src/preview/dashboard.png)

Post & Page Editor

![Sanity Newsletter App - Post & Page Editor ](https://raw.githubusercontent.com/multidots/sanity-newsletter-appsdk/refs/heads/main/src/preview/editor.png)

Post Preview ( Web + Email )

![Sanity Newsletter App - Preview ](https://raw.githubusercontent.com/multidots/sanity-newsletter-appsdk/refs/heads/main/src/preview/preview.png)

Publish Workflow ( Web + Email )

![Sanity Newsletter App - Publish Workflow ](https://raw.githubusercontent.com/multidots/sanity-newsletter-appsdk/refs/heads/main/src/preview/publish-workflow.png)

Setting - Design Customize

![Sanity Newsletter App - Design Customize](https://raw.githubusercontent.com/multidots/sanity-newsletter-appsdk/refs/heads/main/src/preview/design-customize.png)

Setting - Navigation

![Sanity Newsletter App - Navigation](https://raw.githubusercontent.com/multidots/sanity-newsletter-appsdk/refs/heads/main/src/preview/navigation.png)

Setting - Email Setting

![Sanity Newsletter App -  Email Setting](https://raw.githubusercontent.com/multidots/sanity-newsletter-appsdk/refs/heads/main/src/preview/emailsetting.png)


---

## 🆘 Support

* [Sanity Documentation](https://www.sanity.io/docs)
* [Sanity SDK](https://www.sanity.io/docs/sdk)
* Create an issue in this repository

---

## 🏁 Conclusion

**Sanity Newsletter App** provides a production-ready content & newsletter platform built for scalability, speed, and editorial efficiency.

> Built with ❤️ using **Sanity** and **React**

---
