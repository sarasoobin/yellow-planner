import CoverPage from './cover-page'

export const metadata = {
  title: 'Cover · 正 PLANNER',
}

export default function CurrentYearCoverPage() {
  const year = new Date().getFullYear()
  return <CoverPage year={year} path="/cover" />
}
