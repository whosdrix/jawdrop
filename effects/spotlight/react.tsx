'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type SpotlightOptions, spotlight } from './core'

type Props = SpotlightOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof SpotlightOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function Spotlight({ as = 'div', size, color, border, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return spotlight(ref.current, { size, color, border })
  }, [size, color, border])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
