import { notFound } from 'next/navigation'
import ContentsPage from '../contents-page'

type Params = { params: Promise<{ start: string }> }

function parseStartYear(value: string): number | null {
  if (!/^[1-9]\d{3}$/.test(value)) return null
  const year = Number(value)
  return year >= 2026 && (year - 2026) % 4 === 0 ? year : null
}

export async function generateMetadata({ params }: Params) {
  const { start } = await params
  return { title: `${start}–${Number(start) + 3} Contents · 正 PLANNER` }
}

export default async function FourYearContentsPage({ params }: Params) {
  const { start } = await params
  const startYear = parseStartYear(start)
  if (!startYear) notFound()

  return <ContentsPage startYear={startYear} />
}
