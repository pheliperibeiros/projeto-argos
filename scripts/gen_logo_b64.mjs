import { readFileSync, writeFileSync } from 'fs'

const data = readFileSync('public/logo_login.png')
const b64 = data.toString('base64')
const content = `// Auto-generated — do not edit manually\nexport const LOGO_B64 = "data:image/png;base64,${b64}";\n`
writeFileSync('src/lib/logo_login_b64.ts', content)
console.log('Logo base64 written to src/lib/logo_login_b64.ts')
