'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type HalftoneImageOptions, halftoneImage } from './core'

type Props = HalftoneImageOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof HalftoneImageOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function HalftoneImage({
  as = 'div',
  size,
  angle,
  radius,
  background,
  roam,
  resolution,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return halftoneImage(ref.current, { size, angle, radius, background, roam, resolution })
  }, [size, angle, radius, background, roam, resolution])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
