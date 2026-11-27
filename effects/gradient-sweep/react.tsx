'use client'
import { type HTMLAttributes, useEffect, useRef } from 'react'
import { type GradientSweepOptions, gradientSweep } from './core'

type Props = GradientSweepOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof GradientSweepOptions> & {
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
    children: string
  }

export function GradientSweep({ as = 'span', colors, duration, angle, children, ...rest }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const colorsKey = colors?.join()
  // biome-ignore lint/correctness/useExhaustiveDependencies: colors is compared by value
  useEffect(() => {
    if (!ref.current) return
    return gradientSweep(ref.current, { colors, duration, angle })
  }, [colorsKey, duration, angle, children])
  const Tag = as as 'span'
  return (
    <Tag ref={ref} key={children} {...rest}>
      {children}
    </Tag>
  )
}
