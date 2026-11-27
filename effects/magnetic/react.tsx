'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type MagneticOptions, magnetic } from './core'

type Props = MagneticOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof MagneticOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function Magnetic({ as = 'div', strength, reach, inner, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return magnetic(ref.current, { strength, reach, inner })
  }, [strength, reach, inner])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
