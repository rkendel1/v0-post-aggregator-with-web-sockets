import { redirect } from 'next/navigation'

// This is a temporary file to resolve a persistent build error after the original was deleted.
// It redirects to the new admin page.
export default function DeprecatedAdminTagsPage() {
  redirect('/admin')
}