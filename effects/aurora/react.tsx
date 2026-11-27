'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type AuroraOptions, aurora } from './core'

type Props = AuroraOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof AuroraOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function Aurora({ as = 'div', colors, speed, intensity, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const colorsKey = colors?.join()
  // biome-ignore lint/correctness/useExhaustiveDependencies: colors is compared by value
  useEffect(() => {
    if (!ref.current) return
    return aurora(ref.current, { colors, speed, intensity })
  }, [colorsKey, speed, intensity])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
