import {
  FileText,
  ShieldCheck,
  UploadCloud,
  AlertCircle,
  Banknote,
  UserPlus,
  Users,
  BadgeCheck,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  'file-text': FileText,
  'shield-check': ShieldCheck,
  'cloud-upload': UploadCloud,
  'alert-circle': AlertCircle,
  banknote: Banknote,
  'user-plus': UserPlus,
  users: Users,
  'badge-check': BadgeCheck,
  'shield-alert': ShieldAlert,
}

export function getIcon(name: string): LucideIcon {
  return icons[name] ?? FileText
}

export const colorStyles: Record<string, { bg: string; text: string; badge: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-600' },
  sky: { bg: 'bg-sky-100', text: 'text-sky-600', badge: 'bg-sky-500' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', badge: 'bg-indigo-500' },
  red: { bg: 'bg-red-100', text: 'text-red-500', badge: 'bg-red-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', badge: 'bg-amber-500' },
  green: { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-600' },
}
