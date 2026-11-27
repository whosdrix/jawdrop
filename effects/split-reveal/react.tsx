'use client'
import { type HTMLAttributes, useEffect, useRef } from 'react'
import { type SplitRevealOptions, splitReveal } from './core'

type Props = SplitRevealOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof SplitRevealOptions> & {
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
    children: string
  }

export function SplitReveal({
  as = 'span',
  by,
  stagger,
  duration,
  repeat,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the element remounts when children change
  useEffect(() => {
    if (!ref.current) return
    return splitReveal(ref.current, { by, stagger, duration, repeat })
  }, [by, stagger, duration, repeat, children])
  const Tag = as as 'span'
  return (
    <Tag ref={ref} key={children} {...rest}>
      {children}
    </Tag>
  )
}
