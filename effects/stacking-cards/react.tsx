'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type StackingCardsOptions, stackingCards } from './core'

type Props = StackingCardsOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof StackingCardsOptions> & {
    as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'main' | 'span' | 'li'
    children?: ReactNode
  }

export function StackingCards({ as = 'div', top, offset, shrink, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return stackingCards(ref.current, { top, offset, shrink })
  }, [top, offset, shrink])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
