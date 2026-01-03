"use client"

import { parseEpisodeContent, stripHtml, type ParsedContentSegment } from "@/lib/utils/episode-content-parser"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface FormattedEpisodeContentProps {
  content: string
  className?: string
  maxLines?: number
  isExpanded?: boolean
}

export function FormattedEpisodeContent({ 
  content, 
  className,
  maxLines,
  isExpanded = true 
}: FormattedEpisodeContentProps) {
  const router = useRouter()
  
  // Strip HTML tags if present (RSS feeds often have HTML)
  const cleanContent = stripHtml(content)
  
  // Parse content into segments
  const segments = parseEpisodeContent(cleanContent)
  
  return (
    <div 
      className={cn(
        "text-sm leading-relaxed whitespace-pre-wrap break-words",
        className
      )}
      style={{
        wordBreak: 'break-word',
        overflowWrap: 'anywhere'
      }}
    >
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'timestamp':
            return (
              <span
                key={index}
                className="inline-flex items-center font-mono text-xs bg-accent/50 px-1.5 py-0.5 rounded text-accent-foreground"
                title="Timestamp"
              >
                {segment.content}
              </span>
            )
          
          case 'link':
            return (
              <a
                key={index}
                href={segment.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline break-all"
              >
                {segment.content}
              </a>
            )
          
          case 'hashtag':
            return (
              <span
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  const tag = segment.content.slice(1).toLowerCase()
                  router.push(`/show/${tag}`)
                }}
                className="text-primary hover:underline cursor-pointer"
              >
                {segment.content}
              </span>
            )
          
          case 'text':
          default:
            return <span key={index}>{segment.content}</span>
        }
      })}
    </div>
  )
}
