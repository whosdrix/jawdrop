'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type GlassLensOptions, glassLens } from './core'

type Props = GlassLensOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof GlassLensOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function GlassLens({
  as = 'div',
  radius,
  power,
  dispersion,
  hide,
  resolution,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return glassLens(ref.current, { radius, power, dispersion, hide, resolution })
  }, [radius, power, dispersion, hide, resolution])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
