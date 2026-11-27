'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type LiquidImageOptions, liquidImage } from './core'

type Props = LiquidImageOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof LiquidImageOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function LiquidImage({
  as = 'div',
  strength,
  chroma,
  radius,
  rain,
  resolution,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return liquidImage(ref.current, { strength, chroma, radius, rain, resolution })
  }, [strength, chroma, radius, rain, resolution])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
