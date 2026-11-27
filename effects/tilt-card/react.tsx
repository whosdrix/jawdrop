'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type TiltCardOptions, tiltCard } from './core'

type Props = TiltCardOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof TiltCardOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function TiltCard({ as = 'div', max, scale, glare, perspective, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return tiltCard(ref.current, { max, scale, glare, perspective })
  }, [max, scale, glare, perspective])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
