
import { Bell, Search, Plus } from 'lucide-react'

type HeaderProps = {
  title: string
  subtitle: string
  onCreateWorkflow?: () => void
}

export default function Header({
  title,
  subtitle,
  onCreateWorkflow,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        <div className="header-search">
          <Search size={17} />
          <input placeholder="Search anything..." />
          <kbd>Ctrl K</kbd>
        </div>

        <button className="header-icon-button" aria-label="Notifications">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <button
          className="create-button"
          onClick={onCreateWorkflow}
        >
          <Plus size={17} />
          <span>New Workflow</span>
        </button>
      </div>
    </header>
  )
}
