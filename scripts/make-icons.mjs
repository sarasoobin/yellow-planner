/**
 * 아이콘 만들기 — `npm run icons`
 *
 * 원본은 src/app/icon.svg 한 장뿐이다. 여기서 나머지를 전부 만들어낸다.
 * 正 모양을 고칠 일이 생기면 그 SVG 하나만 고치고 이 명령을 다시 돌리면 된다.
 *
 * 만들어지는 것
 *   src/app/apple-icon.png    180x180   아이폰 홈 화면
 *   src/app/favicon.ico        32x32    주소창 옆, 즐겨찾기
 *   public/icon-192.png       192x192   안드로이드 홈 화면 (manifest.ts 가 가리킨다)
 *   public/icon-512.png       512x512   설치 화면·스플래시
 *   public/icon-maskable.png  512x512   안드로이드가 제 마음대로 잘라내는 판
 *
 * 잘라내기(maskable)용은 글자를 작게 넣는다. 안드로이드는 아이콘을 동그라미나
 * 둥근 네모로 잘라내는데, 꽉 채워 그리면 획 끝이 잘려나간다.
 *
 * sharp 는 Next 가 이미 쓰고 있어 따로 설치하지 않았다.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(root, 'src/app/icon.svg')

/** icon.svg 의 배경색. 잘라내기용 여백을 채울 때 쓴다 */
const FRAME = '#FFF099'

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error(
    'sharp 를 찾지 못했습니다. `npm install` 을 먼저 돌려주세요.\n' +
      '(Next 가 쓰는 라이브러리라 따로 설치할 필요는 없습니다)'
  )
  process.exit(1)
}

const svg = await readFile(SOURCE)

/** SVG를 정해진 크기의 PNG로. density 를 올려야 획이 뭉개지지 않는다 */
function render(size) {
  return sharp(svg, { density: 384 }).resize(size, size).png()
}

async function writePng(path, size, { flatten = false } = {}) {
  await mkdir(dirname(path), { recursive: true })

  // 아이폰은 투명한 자리를 검게 칠한다. 둥근 모서리를 표지색으로 메워둔다
  const image = flatten ? render(size).flatten({ background: FRAME }) : render(size)

  await image.toFile(path)
  console.log(`  ${path.slice(root.length + 1)}  ${size}x${size}`)
}

/**
 * ICO 는 sharp 가 못 만든다. 껍데기를 직접 씌운다.
 * 요즘 브라우저는 ICO 안에 PNG가 그대로 들어 있어도 읽는다.
 */
async function writeIco(path, size) {
  const png = await render(size).toBuffer()

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // 예약, 항상 0
  header.writeUInt16LE(1, 2) // 1 = 아이콘
  header.writeUInt16LE(1, 4) // 들어 있는 그림 수

  const entry = Buffer.alloc(16)
  entry.writeUInt8(size < 256 ? size : 0, 0) // 가로 (256이면 0으로 적는 규칙)
  entry.writeUInt8(size < 256 ? size : 0, 1) // 세로
  entry.writeUInt8(0, 2) // 색 수 — PNG라 0
  entry.writeUInt8(0, 3) // 예약
  entry.writeUInt16LE(1, 4) // 평면 수
  entry.writeUInt16LE(32, 6) // 픽셀당 비트
  entry.writeUInt32LE(png.length, 8) // 그림 크기
  entry.writeUInt32LE(header.length + entry.length, 12) // 그림이 시작하는 위치

  await writeFile(path, Buffer.concat([header, entry, png]))
  console.log(`  ${path.slice(root.length + 1)}  ${size}x${size}`)
}

/** 안드로이드 잘라내기용 — 글자를 60%로 줄이고 둘레를 표지색으로 채운다 */
async function writeMaskable(path, size) {
  const inner = Math.round(size * 0.6)
  const pad = Math.round((size - inner) / 2)

  await mkdir(dirname(path), { recursive: true })
  await render(inner)
    // 둥근 모서리를 먼저 메운다. 안 그러면 네 귀퉁이만 투명하게 남아 얼룩진다
    .flatten({ background: FRAME })
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background: FRAME,
    })
    .toFile(path)
  console.log(`  ${path.slice(root.length + 1)}  ${size}x${size} (잘라내기용)`)
}

console.log('src/app/icon.svg 에서 아이콘을 만듭니다')
await writePng(join(root, 'src/app/apple-icon.png'), 180, { flatten: true })
await writeIco(join(root, 'src/app/favicon.ico'), 32)
await writePng(join(root, 'public/icon-192.png'), 192)
await writePng(join(root, 'public/icon-512.png'), 512)
await writeMaskable(join(root, 'public/icon-maskable.png'), 512)
console.log('끝')
