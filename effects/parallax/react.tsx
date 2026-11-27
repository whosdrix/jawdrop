'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type ParallaxOptions, parallax } from './core'

type Props = ParallaxOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof ParallaxOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function Parallax({ as = 'div', distance, pointer, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return parallax(ref.current, { distance, pointer })
  }, [distance, pointer])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
