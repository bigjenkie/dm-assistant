/**
 * Generate simple SVG-based PNG icons for PWA.
 * Run: npx tsx scripts/generate-icons.ts
 */
import { writeFileSync } from 'fs'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1a1708"/>
  <text x="256" y="300" font-family="serif" font-size="280" font-weight="bold" fill="#d4a843" text-anchor="middle" dominant-baseline="central">P</text>
</svg>`

writeFileSync('public/icon.svg', svg)
console.log('Generated public/icon.svg')
console.log('Note: For production PNG icons, convert this SVG to 192x192 and 512x512 PNG files.')
console.log('For now, the SVG works as favicon and the PWA will use it.')
