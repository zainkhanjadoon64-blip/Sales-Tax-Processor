import type { Plugin, ResolvedConfig } from 'vite'
import JavaScriptObfuscator from 'javascript-obfuscator'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const ENC_KEY = 'txc0mply_2024!'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(8).toString('hex')
  let result = iv
  for (let i = 0; i < text.length; i++) {
    const k = ENC_KEY.charCodeAt(i % ENC_KEY.length)
    result += String.fromCharCode(text.charCodeAt(i) ^ k)
  }
  return btoa(result)
}

function makeBootstrap(encrypted: string): string {
  const key = ENC_KEY
  const decScript = `<script>
var _k="${key}";
var _e="${encrypted}";
var _r='';
var _d=atob(_e).slice(8);
for(var _i=0;_i<_d.length;_i++){_r+=String.fromCharCode(_d.charCodeAt(_i)^_k.charCodeAt(_i%_k.length))}
document.write(_r);
document.close();
</script>`
  return '<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>\u200B</title></head>\n<body>' + decScript + '\n</body>\n</html>'
}

export function obfuscatorPlugin(): Plugin {
  let config: ResolvedConfig

  return {
    name: 'obfuscator',
    configResolved(resolved) {
      config = resolved
    },
    generateBundle(_, bundle) {
      if (config.command !== 'build') return

      for (const [, output] of Object.entries(bundle)) {
        if (output.type === 'chunk' && output.fileName.endsWith('.js')) {
          const obfuscated = JavaScriptObfuscator.obfuscate(output.code, {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,
            selfDefending: false,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.5,
            rotateStringArray: true,
            shuffleStringArray: true,
            splitStrings: true,
            splitStringsChunkLength: 5,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
          })
          output.code = obfuscated.getObfuscatedCode()
        }
      }
    },
    closeBundle() {
      if (config.command !== 'build') return
      const htmlPath = path.resolve(config.build.outDir, 'index.html')
      if (!fs.existsSync(htmlPath)) return
      const html = fs.readFileSync(htmlPath, 'utf-8')
      const enc = encrypt(html)
      fs.writeFileSync(htmlPath, makeBootstrap(enc), 'utf-8')
    },
  }
}
