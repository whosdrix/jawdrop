'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type DotGridOptions, dotGrid } from './core'

type Props = DotGridOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof DotGridOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function DotGrid({
  as = 'div',
  gap,
  size,
  color,
  activeColor,
  radius,
  strength,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return dotGrid(ref.current, { gap, size, color, activeColor, radius, strength })
  }, [gap, size, color, activeColor, radius, strength])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
