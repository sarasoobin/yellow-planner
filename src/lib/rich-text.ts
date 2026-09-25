/**
 * 노트에 적은 글은 HTML로 저장한다.
 * 한 칸 안에서 어떤 글자만 굵게, 어떤 글자만 빨갛게 할 수 있어야 하는데
 * 글자만 담아서는 그 정보를 담을 곳이 없다.
 *
 * 이 파일은 브라우저에서도 쓴다. 걸러내는 일(sanitize)은 서버에서만
 * 하면 되고 라이브러리도 크기 때문에 lib/sanitize.ts 로 따로 뒀다.
 */

/** &, <, > 를 글자 그대로 보이게 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const TEXT_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

const textEntityPattern = /&(nbsp|amp|lt|gt|quot|#39);/g

/**
 * HTML 엔티티를 글자로 되돌린다.
 *
 * 예전 일정에는 `&amp;amp;`처럼 엔티티가 여러 번 저장된 경우가 있다.
 * 안정적으로 복구할 수 있게 몇 겹이든(현실적인 범위 안에서) 벗긴다.
 */
function decodeTextEntities(value: string): string {
  let decoded = value
  for (let depth = 0; depth < 8; depth += 1) {
    const next = decoded.replace(textEntityPattern, (entity) => TEXT_ENTITIES[entity] ?? entity)
    if (next === decoded) return decoded
    decoded = next
  }
  return decoded
}

/**
 * HTML 안의 이중 이스케이프만 한 겹씩 벗긴다.
 * `&lt;`를 실제 태그 문자 `<`로 바꾸지는 않으므로, 저장된 HTML의 안전성은 유지한다.
 */
export function normalizeRichHtmlEntities(html: string): string {
  let normalized = html
  for (let depth = 0; depth < 8; depth += 1) {
    const next = normalized.replace(/&amp;(?=(?:nbsp|amp|lt|gt|quot|#39);)/g, '&')
    if (next === normalized) return normalized
    normalized = next
  }
  return normalized
}

/**
 * 저장된 내용을 화면에 뿌릴 HTML로.
 *
 * HTML로 바꾸기 전에 적어둔 것들은 그냥 글자다. 태그가 하나도 없으면
 * 옛 글로 보고 줄바꿈만 <br> 로 바꿔준다. 그 칸을 한 번 고치면 HTML이 된다.
 *
 * 이미 HTML인 것은 그대로 둔다. 저장할 때 이미 걸러냈기 때문이다.
 */
export function toDisplayHtml(stored: string): string {
  if (!stored) return ''
  if (!/<[a-z/]/i.test(stored)) {
    return escapeHtml(decodeTextEntities(stored)).replace(/\n/g, '<br>')
  }
  return normalizeRichHtmlEntities(stored)
}

/**
 * 태그를 걷어낸 글자만.
 * 체크한 네모를 세거나 첫 줄을 뽑을 때 쓴다.
 */
export function toPlainText(html: string): string {
  if (!html) return ''
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    // 크기 자리표로 넣어둔 눈에 안 보이는 글자 (paper-block.tsx ZERO_WIDTH).
    // 이걸 안 걷어내면 아무것도 안 적은 칸이 "적은 것 있음"으로 보인다.
    .replace(/​/g, '')
  return decodeTextEntities(text)
}

/** 적은 게 있는가. 태그만 있고 글자가 없으면 빈 칸으로 본다. */
export function isBlank(html: string): boolean {
  return toPlainText(html).trim().length === 0
}
