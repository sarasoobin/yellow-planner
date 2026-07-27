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
    return escapeHtml(stored).replace(/\n/g, '<br>')
  }
  return stored
}

/**
 * 태그를 걷어낸 글자만.
 * 체크한 네모를 세거나 첫 줄을 뽑을 때 쓴다.
 */
export function toPlainText(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** 적은 게 있는가. 태그만 있고 글자가 없으면 빈 칸으로 본다. */
export function isBlank(html: string): boolean {
  return toPlainText(html).trim().length === 0
}
