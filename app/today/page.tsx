import type { Metadata } from 'next'
import { TodayMode } from '@/components/trips/today-mode'
export const metadata: Metadata = { title: 'Today', description: 'Focused on-trip mode for your active Bharatverse journey.' }
export default function TodayPage() { return <main className="min-h-screen px-4 pb-24 pt-24 md:px-8"><TodayMode /></main> }
