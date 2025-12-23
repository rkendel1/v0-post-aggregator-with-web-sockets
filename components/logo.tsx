import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="flex items-center justify-center h-12">
      {/* Light mode logo (black text on light background) */}
      <Image
        src="/pb_black.PNG"
        alt="PodBridge Logo"
        width={140}
        height={40}
        className="dark:hidden"
        priority
        unoptimized
      />
      {/* Dark mode logo (white text on dark background) */}
      <Image
        src="/pb_white.PNG"
        alt="PodBridge Logo"
        width={140}
        height={40}
        className="hidden dark:block"
        priority
        unoptimized
      />
    </Link>
  )
}