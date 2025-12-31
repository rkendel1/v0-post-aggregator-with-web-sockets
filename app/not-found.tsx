import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">Page Not Found</h1>
      <p className="text-muted-foreground">
        Sorry, we couldn't find the page you were looking for. This could be a user that doesn't exist or a broken link.
      </p>
      <Button asChild>
        <Link href="/">Return to the Main Feed</Link>
      </Button>
    </div>
  )
}