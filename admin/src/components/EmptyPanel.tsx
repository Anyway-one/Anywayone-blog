import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyPanelProps {
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyPanel({ title, description, action }: EmptyPanelProps) {
  return (
    <div className="empty-panel">
      <span className="empty-panel__icon" aria-hidden="true">
        <Inbox size={22} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="empty-panel__action">{action}</div>}
    </div>
  )
}
