'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type PixelTrailOptions, pixelTrail } from './core'

type Props = PixelTrailOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof PixelTrailOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function PixelTrail({
  as = 'div',
  size,
  gap,
  fade,
  radius,
  color,
  trailColor,
  idle,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return pixelTrail(ref.current, { size, gap, fade, radius, color, trailColor, idle })
  }, [size, gap, fade, radius, color, trailColor, idle])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
