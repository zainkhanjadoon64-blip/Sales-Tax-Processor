import type { ReactNode } from 'react'

export interface AnimatedListProps<T> {
  items: T[]
  onItemSelect?: (item: T, index: number) => void
  renderItem?: (item: T, index: number) => ReactNode
  showGradients?: boolean
  enableArrowNavigation?: boolean
  className?: string
  itemClassName?: string
  displayScrollbar?: boolean
  initialSelectedIndex?: number
}

declare const AnimatedList: <T>(props: AnimatedListProps<T>) => JSX.Element
export default AnimatedList
