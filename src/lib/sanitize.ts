import sanitizeHtml from 'sanitize-html'

/**
 * 저장 직전에 HTML을 걸러낸다.
 *
 * HTML을 저장한다는 건 붙여넣기로 들어온 코드도 함께 저장될 수 있다는 뜻이다.
 * 그대로 두면 그 글을 보는 사람 화면에서 실행된다.
 *
 * 그리는 순간이 아니라 저장하는 순간에 거른다. 한 번만 거치면 되고,
 * 이후 어디서 읽어와도 안전한 값이 나온다.
 *
 * 서버에서만 부른다. 이 라이브러리는 브라우저로 내려보내기엔 크다.
 */
export function sanitizeRich(html: string): string {
  return sanitizeHtml(html, {
    // 우리가 만드는 서식에 필요한 것만 남긴다
    allowedTags: ['b', 'strong', 'i', 'em', 'u', 'span', 'div', 'br'],
    allowedAttributes: { '*': ['style'] },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s.,%]+\)$/],
        'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s.,%]+\)$/],
        'font-size': [/^\d{1,3}px$/],
        'font-weight': [/^(bold|bolder|[1-9]00)$/],
        'font-style': [/^italic$/],
        'text-decoration': [/^underline$/],
        'text-decoration-line': [/^underline$/],
      },
    },
    /*
     * 목록에 없는 태그는 껍데기만 버리고 안의 글자는 살린다.
     * 서식이 좀 날아가더라도 적어둔 내용이 사라지면 안 된다.
     * (script 처럼 통째로 지워야 하는 것은 sanitize-html 이 알아서 지운다)
     */
    disallowedTagsMode: 'discard',
  })
}
