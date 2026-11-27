'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type ZoomThroughOptions, zoomThrough } from './core'

type Props = ZoomThroughOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof ZoomThroughOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function ZoomThrough({
  as = 'div',
  color,
  distance,
  fit,
  focus,
  top,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return zoomThrough(ref.current, { color, distance, fit, focus, top })
  }, [color, distance, fit, focus, top])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
