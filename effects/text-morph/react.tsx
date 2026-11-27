'use client'
import { type HTMLAttributes, useEffect, useRef } from 'react'
import { type TextMorphOptions, textMorph } from './core'

type Props = TextMorphOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof TextMorphOptions> & {
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
    children: string
  }

export function TextMorph({
  as = 'span',
  words,
  hold,
  duration,
  blur,
  accent,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const wordsKey = words?.join()
  // biome-ignore lint/correctness/useExhaustiveDependencies: the element remounts when children change
  useEffect(() => {
    if (!ref.current) return
    return textMorph(ref.current, { words, hold, duration, blur, accent })
  }, [wordsKey, hold, duration, blur, accent, children])
  const Tag = as as 'span'
  return (
    <Tag ref={ref} key={children} {...rest}>
      {children}
    </Tag>
  )
}
