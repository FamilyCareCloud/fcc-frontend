import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Deployed fcc-backend-dev API Gateway (see fcc-backend/docs/DEPLOYMENT.md).
// Proxying keeps local dev same-origin so the browser never hits the backend's
// CORS check (which only allows the Amplify frontend origin).
const DEFAULT_DEV_PROXY_TARGET =
  'https://uwv0zhujxf.execute-api.ap-northeast-2.amazonaws.com'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_PROXY_TARGET || DEFAULT_DEV_PROXY_TARGET
  const proxy = Object.fromEntries(
    ['/auth', '/me', '/groups', '/invitations', '/health'].map((path) => [
      path,
      { target, changeOrigin: true },
    ]),
  )
  return {
    plugins: [react()],
    server: { proxy },
  }
})
