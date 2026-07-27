# 스티커 넣는 곳

여기에 SVG 파일을 넣으면 노트에 붙일 수 있는 스티커가 됩니다.

노트 위쪽 스티커 통에서 하나 누르면 "집어든" 상태가 되고,
그 뒤 페이지 아무 데나 누르면 그 자리에 붙습니다.
붙인 스티커는 끌어서 옮기고, 마우스를 올리면 나오는 ✕ 로 뗍니다.

## 넣는 방법 (2단계)

### 1) SVG 파일을 이 폴더에 넣습니다

```
public/stickers/heart.svg   ← 이런 식으로
```

파일 이름은 **영어 소문자**로 지어주세요. 한글이나 띄어쓰기가 들어가면
주소로 만들 때 깨집니다. (`하트.svg` ❌ → `heart.svg` ✅)

### 2) 목록에 한 줄 추가합니다

`src/lib/stickers.ts` 를 열어서 목록에 추가하세요.

```ts
export const STICKERS = [
  { key: 'circle', label: '동그라미', src: '/stickers/circle.svg' },
  { key: 'star', label: '별', src: '/stickers/star.svg' },
  { key: 'heart', label: '하트', src: '/stickers/heart.svg' },  // ← 추가
]
```

저장하면 도구 막대에 바로 나타납니다.

> `src` 는 `public` 을 뺀 경로입니다.
> `public/stickers/heart.svg` → `/stickers/heart.svg`

## SVG 어디서 구하나

무료로 쓸 수 있고 출처 표기 조건이 느슨한 곳들입니다.

| 사이트 | 특징 |
|---|---|
| [Lucide](https://lucide.dev) | 선이 얇고 깔끔함. 이 노트 느낌과 잘 맞음 |
| [Heroicons](https://heroicons.com) | 단순하고 잘 다듬어져 있음 |
| [Phosphor](https://phosphoricons.com) | 종류가 아주 많음 |
| [SVG Repo](https://www.svgrepo.com) | 손그림풍 등 개성 있는 것 많음 |

받을 때 **SVG** 형식으로 받으세요. PNG는 확대하면 깨집니다.

> ⚠️ 상업적으로 쓸 계획이면 라이선스를 확인하세요.
> 포트폴리오용이면 위 사이트들은 대부분 문제 없습니다.

## 잘 보이는 스티커 만들기

- **크기**: 노트에서 16px 정도로 작게 보입니다. 선이 너무 가늘면 안 보여요
- **`viewBox` 는 정사각형**으로 (`viewBox="0 0 24 24"`)
- **색**: SVG 안에 색이 박혀 있으면 그 색으로 나옵니다.
  색을 바꾸고 싶으면 `fill="currentColor"` 나 `stroke="currentColor"` 로
  고쳐두면 글자색을 따라갑니다

## 지금 들어있는 것

| 파일 | 모양 |
|---|---|
| `circle.svg` | 빨간 동그라미 — 중요한 날에 표시 |
| `star.svg` | 빨간 별 — 꼭 해야 하는 것 |

> 형광펜·굵게·기울임·펜 색·체크박스는 스티커가 아닙니다.
> 글을 적던 자리에서 **`/`** 를 치면 나옵니다.
> 형광펜 색은 `src/lib/stickers.ts` 의 `HIGHLIGHT` 에 있습니다.
