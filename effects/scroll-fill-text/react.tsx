'use client'
import { type HTMLAttributes, useEffect, useRef } from 'react'
import { type ScrollFillTextOptions, scrollFillText } from './core'

type Props = ScrollFillTextOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof ScrollFillTextOptions> & {
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
    children: string
  }

export function ScrollFillText({
  as = 'p',
  dim,
  highlight,
  spread,
  start,
  end,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLParagraphElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the element remounts when children change
  useEffect(() => {
    if (!ref.current) return
    return scrollFillText(ref.current, { dim, highlight, spread, start, end })
  }, [dim, highlight, spread, start, end, children])
  const Tag = as as 'p'
  return (
    <Tag ref={ref} key={children} {...rest}>
      {children}
    </Tag>
  )
}
