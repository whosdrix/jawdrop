'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type DrawPathOptions, drawPath } from './core'

type Props = DrawPathOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof DrawPathOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function DrawPath({ as = 'div', start, end, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return drawPath(ref.current, { start, end })
  }, [start, end])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
