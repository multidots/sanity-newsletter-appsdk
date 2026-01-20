import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: '', // your organization id
    entry: './src/App.tsx',
  },
  deployment: {
    appId: '', // your app id
  },

}) 
