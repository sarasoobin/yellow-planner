import { redirect } from 'next/navigation'

/** The first four-year spread begins with the planner’s original year. */
export default function ContentsIndexPage() {
  redirect('/contents/2026')
}
