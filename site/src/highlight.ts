export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const KEYWORDS =
  'import|export|from|const|let|var|function|return|if|else|for|while|of|in|new|type|interface|extends|typeof|as|default|null|undefined|true|false|void|async|await|class|this|break|continue|throw|try|catch'

const TOKEN = new RegExp(
  [
    '(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*|<!--[\\s\\S]*?-->)', // 1 comment
    '(`(?:\\\\[\\s\\S]|[^`\\\\])*`|\'(?:\\\\.|[^\'\\\\\\n])*\'|"(?:\\\\.|[^"\\\\\\n])*")', // 2 string
    `\\b(${KEYWORDS})\\b`, // 3 keyword
    '\\b(\\d+(?:\\.\\d+)?)\\b', // 4 number
    '(<\\/?[A-Za-z][\\w.-]*)', // 5 tag
  ].join('|'),
  'g',
)

/** Just enough colour to make a snippet scannable. Not a parser. */
export function highlight(code: string): string {
  let out = ''
  let last = 0
  for (const m of code.matchAll(TOKEN)) {
    const i = m.index ?? 0
    out += esc(code.slice(last, i))
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : 't'
    out += `<span class="tk-${cls}">${esc(m[0])}</span>`
    last = i + m[0].length
  }
  return out + esc(code.slice(last))
}
