'use client'
import { type HTMLAttributes, useEffect, useRef } from 'react'
import { type ScrambleTextOptions, scrambleText } from './core'

type Props = ScrambleTextOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof ScrambleTextOptions> & {
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
    children: string
  }

export function ScrambleText({
  as = 'span',
  text,
  duration,
  chars,
  trigger,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the element remounts when children change
  useEffect(() => {
    if (!ref.current) return
    return scrambleText(ref.current, { text, duration, chars, trigger })
  }, [text, duration, chars, trigger, children])
  const Tag = as as 'span'
  return (
    <Tag ref={ref} key={children} {...rest}>
      {children}
    </Tag>
  )
}
