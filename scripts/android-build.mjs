// Builds a debug APK of the game: web build -> copy into the Android project -> Gradle.
// Needs the Android SDK and JDK 21. The APK ends up in android/app/build/outputs/apk/debug/.
// GitHub Actions does the same in .github/workflows/android.yml.
import { execSync } from 'node:child_process'

const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd })
run('npm run build')
run('npx cap sync android')
run(process.platform === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug', 'android')
console.log('\nAPK: android/app/build/outputs/apk/debug/app-debug.apk')
