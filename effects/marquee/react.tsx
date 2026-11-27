'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type MarqueeOptions, marquee } from './core'

type Props = MarqueeOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof MarqueeOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function Marquee({
  as = 'div',
  speed,
  direction,
  scrollBoost,
  pauseOnHover,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return marquee(ref.current, { speed, direction, scrollBoost, pauseOnHover })
  }, [speed, direction, scrollBoost, pauseOnHover])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
