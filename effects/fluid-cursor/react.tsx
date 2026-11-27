'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type FluidCursorOptions, fluidCursor } from './core'

type Props = FluidCursorOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof FluidCursorOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function FluidCursor({
  as = 'div',
  colors,
  radius,
  force,
  swirl,
  fade,
  burst,
  overlay,
  detail,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const colorsKey = colors?.join()
  // biome-ignore lint/correctness/useExhaustiveDependencies: colors is compared by value
  useEffect(() => {
    if (!ref.current) return
    return fluidCursor(ref.current, {
      colors,
      radius,
      force,
      swirl,
      fade,
      burst,
      overlay,
      detail,
    })
  }, [colorsKey, radius, force, swirl, fade, burst, overlay, detail])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
