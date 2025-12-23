import React from 'react'
import Image from 'next/image'

export function Logo() {
  return (
    <div className="flex items-center justify-center h-10">
      {/* Light mode logo (black text on light background) */}
      <Image
        src="/pb_black.PNG"
        alt="PodBridge Logo"
        width={120}
        height={32}
        className="dark:hidden"
        priority
        unoptimized
      />
      {/* Dark mode logo (white text on dark background) */}
      <Image
        src="/pb_white.PNG"
        alt="PodBridge Logo"
        width={120}
        height={32}
        className="hidden dark:block"
        priority
        unoptimized
      />
    </div>
  )
}