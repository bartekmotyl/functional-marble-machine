import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The Android app: the built game (dist/) inside a full-screen web view, so it also works
 * offline. Build it with `npm run android:build`, or let GitHub Actions do it
 * (.github/workflows/android.yml).
 */
const config: CapacitorConfig = {
  appId: 'io.github.bartekmotyl.marblemachine',
  appName: 'Functional Marble Machine',
  webDir: 'dist',
}

export default config
