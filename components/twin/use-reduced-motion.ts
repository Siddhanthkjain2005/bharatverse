'use client'

import { useEffect, useState } from 'react'

/** Live `prefers-reduced-motion` — every camera effect scales off this. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Coarse pointer / small viewport, used to lower geometry density. */
export function useLowPower(): boolean {
  const [low, setLow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse), (max-width: 820px)')
    const onChange = () => setLow(mq.matches || (navigator.hardwareConcurrency ?? 8) <= 4)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return low
}
