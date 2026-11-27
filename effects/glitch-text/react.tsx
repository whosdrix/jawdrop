'use client'
import { type HTMLAttributes, useEffect, useRef } from 'react'
import { type GlitchTextOptions, glitchText } from './core'

type Props = GlitchTextOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof GlitchTextOptions> & {
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
    children: string
  }

export function GlitchText({
  as = 'span',
  trigger,
  interval,
  duration,
  intensity,
  swap,
  colorA,
  colorB,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the element remounts when children change
  useEffect(() => {
    if (!ref.current) return
    return glitchText(ref.current, { trigger, interval, duration, intensity, swap, colorA, colorB })
  }, [trigger, interval, duration, intensity, swap, colorA, colorB, children])
  const Tag = as as 'span'
  return (
    <Tag ref={ref} key={children} {...rest}>
      {children}
    </Tag>
  )
}
