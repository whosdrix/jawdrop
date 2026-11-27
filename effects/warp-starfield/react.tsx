'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type WarpStarfieldOptions, warpStarfield } from './core'

type Props = WarpStarfieldOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof WarpStarfieldOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function WarpStarfield({
  as = 'div',
  density,
  speed,
  boost,
  color,
  trigger,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return warpStarfield(ref.current, { density, speed, boost, color, trigger })
  }, [density, speed, boost, color, trigger])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
