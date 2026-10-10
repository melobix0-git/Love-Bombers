import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localInvitationApi } from './vite.local-api.js'

export default defineConfig(({ mode }) => {
  // Load server-only environment values for the local API middleware.
  // They are not exposed to the browser bundle because only VITE_ variables
  // are available through import.meta.env in application code.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), localInvitationApi()],
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
    preview: {
      host: '0.0.0.0',
    },
  }
})
