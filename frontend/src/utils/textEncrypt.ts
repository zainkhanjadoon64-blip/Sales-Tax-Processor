const KEY = 'txc0mply_2024!'

export function encrypt(text: string): string {
  const iv = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('')
  let result = iv
  for (let i = 0; i < text.length; i++) {
    const k = KEY.charCodeAt(i % KEY.length)
    result += String.fromCharCode(text.charCodeAt(i) ^ k)
  }
  return btoa(result)
}

export function decrypt(encoded: string): string {
  try {
    const raw = atob(encoded)
    const body = raw.slice(8)
    let result = ''
    for (let i = 0; i < body.length; i++) {
      const k = KEY.charCodeAt(i % KEY.length)
      result += String.fromCharCode(body.charCodeAt(i) ^ k)
    }
    return result
  } catch {
    return encoded
  }
}
