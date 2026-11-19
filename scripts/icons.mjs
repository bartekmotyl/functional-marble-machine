// Renders the app icon from assets/icon-foreground.svg + assets/icon-background.svg:
//  - Android launcher icons (adaptive layers + legacy square/round PNGs) in android/app/src/main/res
//  - the web favicon (public/icon.svg) and a PNG for home screens (public/icon-192.png)
// Run after changing the SVGs:  npm run icons
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const fgSvg = readFileSync('assets/icon-foreground.svg', 'utf8')
const bgSvg = readFileSync('assets/icon-background.svg', 'utf8')
const inner = (svg) => svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

const SIZE = 1024
// the part of the 108dp adaptive layers a legacy (pre-Android 8) icon shows: the middle 72dp... plus a bit
const CROP = Math.round((SIZE * 16) / 108)

/** The full icon, cropped like a legacy launcher icon, with rounded corners (or a circle). */
function iconSvg(shape) {
  const v = SIZE - 2 * CROP
  const clip =
    shape === 'circle'
      ? `<circle cx="512" cy="512" r="${v / 2}"/>`
      : `<rect x="${CROP}" y="${CROP}" width="${v}" height="${v}" rx="${v * 0.22}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CROP} ${CROP} ${v} ${v}">
  <clipPath id="shape">${clip}</clipPath>
  <g clip-path="url(#shape)">${inner(bgSvg)}${inner(fgSvg)}</g>
</svg>
`
}

const png = (svg, size) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer()

const RES = 'android/app/src/main/res'
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

for (const [name, d] of Object.entries(DENSITIES)) {
  const layer = Math.round(108 * d)
  const legacy = Math.round(48 * d)
  const dir = `${RES}/mipmap-${name}`
  writeFileSync(`${dir}/ic_launcher_foreground.png`, await png(fgSvg, layer))
  writeFileSync(`${dir}/ic_launcher_background.png`, await png(bgSvg, layer))
  writeFileSync(`${dir}/ic_launcher.png`, await png(iconSvg('square'), legacy))
  writeFileSync(`${dir}/ic_launcher_round.png`, await png(iconSvg('circle'), legacy))
}

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
writeFileSync(`${RES}/mipmap-anydpi-v26/ic_launcher.xml`, adaptive)
writeFileSync(`${RES}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptive)

writeFileSync('public/icon.svg', iconSvg('square'))
writeFileSync('public/icon-192.png', await png(iconSvg('square'), 192))
console.log('icons written')
