// sanity-app.config.ts
// Note: App configuration is primarily handled in sanity.cli.ts
// This file exports a plain configuration object for reference

export default {
  name: 'sanity-newsletter-app',
  title: 'Sanity Newsletter App',
  
  // This must match your App ID in manage.sanity.io
  app: {
    id: '', // your app id
  },

  // Required for Vercel deployments
  // In Vercel, VERCEL_URL is automatically set (without https://)
  baseUrl: process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'https://sanity-newsletter-app.vercel.app',
};