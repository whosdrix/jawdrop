'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type RippleClickOptions, rippleClick } from './core'

type Props = RippleClickOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof RippleClickOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function RippleClick({
  as = 'div',
  strength,
  speed,
  width,
  chroma,
  hover,
  image,
  resolution,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return rippleClick(ref.current, { strength, speed, width, chroma, hover, image, resolution })
  }, [strength, speed, width, chroma, hover, image, resolution])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
