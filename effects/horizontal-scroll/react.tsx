'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type HorizontalScrollOptions, horizontalScroll } from './core'

type Props = HorizontalScrollOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof HorizontalScrollOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function HorizontalScroll({ as = 'div', top, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return horizontalScroll(ref.current, { top })
  }, [top])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
