import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export function Logo() {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'

  return (
    <Link href={`https://${rootDomain}`} className="flex items-center justify-center h-10">
      {/* Light mode logo (black text on light background) */}
      <Image
        src="/pb_black.PNG"
        alt="PodBridge Logo"
        width={112}
        height={32}
        className="dark:hidden"
        priority
        unoptimized
      />
      {/* Dark mode logo (white text on dark background) */}
      <Image
        src="/pb_white.PNG"
        alt="PodBridge Logo"
        width={112}
        height={32}
        className="hidden dark:block"
        priority
        unoptimized
      />
    </Link>
  )
}