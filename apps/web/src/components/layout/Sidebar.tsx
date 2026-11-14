
import {
  Activity,
  ChevronDown,
  CircleHelp,
  Command,
  Inbox,
  LayoutDashboard,
  Radio,
  Settings,
  Workflow,
  Zap,
} from 'lucide-react'

type SidebarProps = {
  activePage: string
  onNavigate: (page: string) => void
}

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Workflows', icon: Workflow },
  { name: 'Executions', icon: Activity },
  { name: 'Monitoring', icon: Radio },
  { name: 'Dead Letter Queue', icon: Inbox },
]

export default function Sidebar({
  activePage,
  onNavigate,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Zap size={21} fill="currentColor" />
        </div>
        <div className="brand-name">
          FlowForge
          <span>ORCHESTRATION PLATFORM</span>
        </div>
      </div>

      <button className="workspace-switcher">
        <div className="workspace-avatar">F</div>
        <div className="workspace-info">
          <strong>My Workspace</strong>
          <span>Free Plan</span>
        </div>
        <ChevronDown size={16} />
      </button>

      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="sidebar-navigation">
        {navigation.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={`nav-item ${activePage === name ? 'active' : ''}`}
            onClick={() => onNavigate(name)}
          >
            <Icon size={18} />
            <span>{name}</span>
            {name === 'Dead Letter Queue' && (
              <span className="nav-count">3</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-section-label">PREFERENCES</div>

        <button
          className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`}
          onClick={() => onNavigate('Settings')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <button className="nav-item" onClick={() => window.open('https://github.com/HrishavSaha/FlowForge', '_blank')}>
          <CircleHelp size={18} />
          <span>Help & Documentation</span>
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">K</div>
          <div className="sidebar-user-info">
            <strong>Kesavan</strong>
            <span>Frontend Developer</span>
          </div>
          <Command size={16} className="user-command" />
        </div>
      </div>
    </aside>
  )
}
