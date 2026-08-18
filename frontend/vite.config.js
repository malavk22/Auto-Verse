import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Without this, Vite only bound to the IPv6 loopback ([::1]) on this
    // machine - nothing was listening on 127.0.0.1 at all. Browsers that
    // resolve "localhost" to IPv4 first got a flat connection refused
    // (looks like "the site won't load"), even though the dev server was
    // running fine. `host: true` binds every local interface (0.0.0.0 and
    // ::), so localhost resolves either way.
    host: true,
    proxy: {
      // Explicit 127.0.0.1, not 'localhost' - the backend only binds the
      // IPv4 wildcard (0.0.0.0), not IPv6. Node's proxy resolving
      // "localhost" to ::1 first (common default) would then stall on a
      // connection nothing's listening on before ever falling back to
      // IPv4 - the same class of bug host:true fixed on the other side.
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
