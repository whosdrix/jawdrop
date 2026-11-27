'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type TrailingInkOptions, trailingInk } from './core'

type Props = TrailingInkOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof TrailingInkOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function TrailingInk({ as = 'div', color, width, life, overlay, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return trailingInk(ref.current, { color, width, life, overlay })
  }, [color, width, life, overlay])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
