'use client'
import { type HTMLAttributes, useEffect, useRef } from 'react'
import { type ParticleTextOptions, particleText } from './core'

type Props = ParticleTextOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof ParticleTextOptions> & {
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
    children: string
  }

export function ParticleText({
  as = 'span',
  color,
  accent,
  density,
  radius,
  force,
  idle,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the element remounts when children change
  useEffect(() => {
    if (!ref.current) return
    return particleText(ref.current, { color, accent, density, radius, force, idle })
  }, [color, accent, density, radius, force, idle, children])
  const Tag = as as 'span'
  return (
    <Tag ref={ref} key={children} {...rest}>
      {children}
    </Tag>
  )
}
