'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type GradientMeshOptions, gradientMesh } from './core'

type Props = GradientMeshOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof GradientMeshOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function GradientMesh({ as = 'div', colors, speed, grain, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const colorsKey = colors?.join()
  // biome-ignore lint/correctness/useExhaustiveDependencies: colors is compared by value
  useEffect(() => {
    if (!ref.current) return
    return gradientMesh(ref.current, { colors, speed, grain })
  }, [colorsKey, speed, grain])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
