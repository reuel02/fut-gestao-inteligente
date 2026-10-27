import { BarChart3, Radio, Shuffle, ShieldCheck } from 'lucide-react'

export const MEMBER_TABS = [
  { id: 'sorteio', label: 'Sorteio', icon: Shuffle },
  { id: 'aovivo', label: 'Ao Vivo', icon: Radio },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
]

export const ADMIN_TAB = {
  id: 'admin',
  label: 'Admin',
  icon: ShieldCheck,
}
