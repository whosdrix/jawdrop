'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type MetaballsOptions, metaballs } from './core'

type Props = MetaballsOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof MetaballsOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function Metaballs({
  as = 'div',
  colors,
  count,
  size,
  speed,
  glow,
  background,
  resolution,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const colorsKey = colors?.join()
  // biome-ignore lint/correctness/useExhaustiveDependencies: colors is compared by value
  useEffect(() => {
    if (!ref.current) return
    return metaballs(ref.current, { colors, count, size, speed, glow, background, resolution })
  }, [colorsKey, count, size, speed, glow, background, resolution])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
