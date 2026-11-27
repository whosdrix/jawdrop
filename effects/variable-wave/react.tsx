'use client'
import { type HTMLAttributes, useEffect, useRef } from 'react'
import { type VariableWaveOptions, variableWave } from './core'

type Props = VariableWaveOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof VariableWaveOptions> & {
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
    children: string
  }

export function VariableWave({
  as = 'span',
  minWeight,
  maxWeight,
  minWidth,
  maxWidth,
  radius,
  idle,
  speed,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the element remounts when children change
  useEffect(() => {
    if (!ref.current) return
    return variableWave(ref.current, {
      minWeight,
      maxWeight,
      minWidth,
      maxWidth,
      radius,
      idle,
      speed,
    })
  }, [minWeight, maxWeight, minWidth, maxWidth, radius, idle, speed, children])
  const Tag = as as 'span'
  return (
    <Tag ref={ref} key={children} {...rest}>
      {children}
    </Tag>
  )
}
