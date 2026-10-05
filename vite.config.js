import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { localInvitationApi } from './vite.local-api.js'

export default defineConfig({
  plugins: [react(), localInvitationApi()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
  },
})
