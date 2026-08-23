export interface SiteLogistics {
  airport: { name: string; code: string; approximateDistanceKm: number }
  rail: { name: string; approximateDistanceKm: number }
  ticketing: { label: string; url: string; note: string }
}

const ASI_TICKETS = 'https://asi.payumoney.com/'

export const SITE_LOGISTICS: Record<string, SiteLogistics> = {
  'taj-mahal': {
    airport: { name: 'Agra Airport', code: 'AGR', approximateDistanceKm: 13 },
    rail: { name: 'Agra Cantt railway station', approximateDistanceKm: 6 },
    ticketing: { label: 'ASI official ticket portal', url: ASI_TICKETS, note: 'Check the official checkout for the current visitor category and price.' },
  },
  hampi: {
    airport: { name: 'Jindal Vijaynagar Airport', code: 'VDY', approximateDistanceKm: 40 },
    rail: { name: 'Hosapete Junction', approximateDistanceKm: 13 },
    ticketing: { label: 'ASI official ticket portal', url: ASI_TICKETS, note: 'Different monuments in the Hampi group can have different access arrangements.' },
  },
  'konark-sun-temple': {
    airport: { name: 'Biju Patnaik International Airport', code: 'BBI', approximateDistanceKm: 65 },
    rail: { name: 'Puri railway station', approximateDistanceKm: 36 },
    ticketing: { label: 'ASI official ticket portal', url: ASI_TICKETS, note: 'Use the official checkout for today’s applicable category and price.' },
  },
  'ajanta-caves': {
    airport: { name: 'Chhatrapati Sambhajinagar Airport', code: 'IXU', approximateDistanceKm: 100 },
    rail: { name: 'Jalgaon Junction', approximateDistanceKm: 60 },
    ticketing: { label: 'ASI official ticket portal', url: ASI_TICKETS, note: 'Confirm entry, shuttle and cave-access arrangements at the official source.' },
  },
  khajuraho: {
    airport: { name: 'Khajuraho Airport', code: 'HJR', approximateDistanceKm: 5 },
    rail: { name: 'Khajuraho railway station', approximateDistanceKm: 8 },
    ticketing: { label: 'ASI official ticket portal', url: ASI_TICKETS, note: 'Use the official checkout for the current monument group and visitor category.' },
  },
  'qutb-minar': {
    airport: { name: 'Indira Gandhi International Airport', code: 'DEL', approximateDistanceKm: 13 },
    rail: { name: 'New Delhi railway station', approximateDistanceKm: 17 },
    ticketing: { label: 'ASI official ticket portal', url: ASI_TICKETS, note: 'Use the official checkout for the current visitor category and price.' },
  },
  'brihadisvara-thanjavur': {
    airport: { name: 'Tiruchirappalli International Airport', code: 'TRZ', approximateDistanceKm: 60 },
    rail: { name: 'Thanjavur Junction', approximateDistanceKm: 2 },
    ticketing: { label: 'ASI monument information', url: 'https://asi.nic.in/', note: 'This is a living temple; verify worship, access and any special-event arrangements before visiting.' },
  },
  mahabalipuram: {
    airport: { name: 'Chennai International Airport', code: 'MAA', approximateDistanceKm: 55 },
    rail: { name: 'Chengalpattu Junction', approximateDistanceKm: 30 },
    ticketing: { label: 'ASI official ticket portal', url: ASI_TICKETS, note: 'The monument group has multiple areas; check the official checkout for current access.' },
  },
}

export function mapSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export const FLIGHTS_URL = 'https://www.google.com/travel/flights?hl=en&curr=INR'
export const RAIL_URL = 'https://www.irctc.co.in/nget/train-search'
