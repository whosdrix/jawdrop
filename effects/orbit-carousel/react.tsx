'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type OrbitCarouselOptions, orbitCarousel } from './core'

type Props = OrbitCarouselOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof OrbitCarouselOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function OrbitCarousel({
  as = 'div',
  turns,
  distance,
  radius,
  perspective,
  tilt,
  drag,
  top,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return orbitCarousel(ref.current, { turns, distance, radius, perspective, tilt, drag, top })
  }, [turns, distance, radius, perspective, tilt, drag, top])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
