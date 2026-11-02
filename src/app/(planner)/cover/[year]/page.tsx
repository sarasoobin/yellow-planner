import { notFound } from 'next/navigation'
import CoverPage from '../cover-page'

type Params = { params: Promise<{ year: string }> }

function parsePlannerYear(value: string): number | null {
  if (!/^[1-9]\d{3}$/.test(value)) return null
  return Number(value)
}

export async function generateMetadata({ params }: Params) {
  const { year } = await params
  return { title: `${year} Cover · 正 PLANNER` }
}

export default async function YearCoverPage({ params }: Params) {
  const { year: rawYear } = await params
  const year = parsePlannerYear(rawYear)
  if (!year) notFound()

  return <CoverPage year={year} />
}
