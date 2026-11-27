'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type GrainOptions, grain } from './core'

type Props = GrainOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof GrainOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function Grain({ as = 'div', opacity, fps, scale, overlay, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return grain(ref.current, { opacity, fps, scale, overlay })
  }, [opacity, fps, scale, overlay])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
