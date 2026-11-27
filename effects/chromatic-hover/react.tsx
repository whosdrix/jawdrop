'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type ChromaticHoverOptions, chromaticHover } from './core'

type Props = ChromaticHoverOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof ChromaticHoverOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function ChromaticHover({
  as = 'div',
  split,
  wobble,
  radius,
  resolution,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return chromaticHover(ref.current, { split, wobble, radius, resolution })
  }, [split, wobble, radius, resolution])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
