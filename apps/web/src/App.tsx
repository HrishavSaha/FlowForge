
import { useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  MoreHorizontal,
  Workflow,
  Zap,
} from 'lucide-react'
import WorkflowCanvas from './components/canvas/WorkflowCanvas'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import './App.css'

const workflows = [
  {
    name: 'Customer Onboarding',
    description: 'Automated customer registration and welcome flow',
    status: 'Active',
    runs: '1,284',
    success: '98.6%',
    updated: '2 minutes ago',
    initials: 'CO',
  },
  {
    name: 'Payment Processing',
    description: 'Payment verification and transaction handling',
    status: 'Active',
    runs: '856',
    success: '99.2%',
    updated: '18 minutes ago',
    initials: 'PP',
  },
  {
    name: 'Email Notifications',
    description: 'Event-driven email notification workflow',
    status: 'Draft',
    runs: '0',
    success: '—',
    updated: '1 hour ago',
    initials: 'EN',
  },
  {
    name: 'Order Fulfillment',
    description: 'Order validation and fulfillment automation',
    status: 'Paused',
    runs: '342',
    success: '96.4%',
    updated: '3 hours ago',
    initials: 'OF',
  },
]

function Dashboard() {
  return (
    <div className="dashboard-content">
      <section className="welcome-section">
        <div>
          <div className="eyebrow">WORKSPACE OVERVIEW</div>
          <h2>Welcome back, Kesavan <span>✦</span></h2>
          <p>Here's what's happening with your workflows today.</p>
        </div>

        <div className="date-indicator">
          <Clock3 size={15} />
          <span>Live workspace</span>
          <span className="live-dot" />
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Total Workflows</span>
            <div className="stat-icon purple"><Workflow size={19} /></div>
          </div>
          <strong>24</strong>
          <div className="stat-foot positive">
            <ArrowUpRight size={15} />
            <span>12% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Total Executions</span>
            <div className="stat-icon blue"><Activity size={19} /></div>
          </div>
          <strong>12,486</strong>
          <div className="stat-foot positive">
            <ArrowUpRight size={15} />
            <span>18.4% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Success Rate</span>
            <div className="stat-icon green"><Zap size={19} /></div>
          </div>
          <strong>98.2%</strong>
          <div className="stat-foot positive">
            <ArrowUpRight size={15} />
            <span>2.1% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Failed Executions</span>
            <div className="stat-icon orange"><Activity size={19} /></div>
          </div>
          <strong>18</strong>
          <div className="stat-foot negative">
            <ArrowDownRight size={15} />
            <span>4.3% from last month</span>
          </div>
        </div>
      </section>

      <section className="dashboard-main-grid">
        <div className="panel execution-panel">
          <div className="panel-heading">
            <div>
              <h3>Execution Activity</h3>
              <p>Workflow runs over the last 7 days</p>
            </div>
            <button className="period-button">Last 7 days</button>
          </div>

          <div className="chart-placeholder">
            <div className="chart-y-labels">
              <span>1,000</span>
              <span>750</span>
              <span>500</span>
              <span>250</span>
              <span>0</span>
            </div>
            <div className="chart-area">
              <div className="chart-grid-lines">
                <span /><span /><span /><span /><span />
              </div>
              <svg viewBox="0 0 600 190" preserveAspectRatio="none" className="activity-chart">
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity=".28" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 145 C35 130 55 135 85 110 S145 125 170 90 S225 105 255 70 S310 90 340 55 S400 80 425 45 S480 65 510 35 S565 55 600 18 L600 190 L0 190 Z"
                  fill="url(#chartFill)"
                />
                <path
                  d="M0 145 C35 130 55 135 85 110 S145 125 170 90 S225 105 255 70 S310 90 340 55 S400 80 425 45 S480 65 510 35 S565 55 600 18"
                  fill="none"
                  stroke="#9b7afa"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <div className="chart-x-labels">
                <span>Mon</span><span>Tue</span><span>Wed</span>
                <span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>

          <div className="chart-legend">
            <span><i className="legend-dot purple-dot" /> Successful executions</span>
            <span><i className="legend-dot gray-dot" /> Failed executions</span>
          </div>
        </div>

        <div className="panel health-panel">
          <div className="panel-heading">
            <div>
              <h3>System Health</h3>
              <p>Current platform status</p>
            </div>
            <MoreHorizontal size={20} />
          </div>

          <div className="health-status">
            <div className="health-check"><Zap size={22} /></div>
            <div>
              <strong>All systems operational</strong>
              <span>Everything is running smoothly</span>
            </div>
          </div>

          <div className="health-metric">
            <div><span>API Response Time</span><strong>124 ms</strong></div>
            <div className="health-track"><span style={{ width: '72%' }} /></div>
          </div>

          <div className="health-metric">
            <div><span>Worker Utilization</span><strong>68%</strong></div>
            <div className="health-track"><span style={{ width: '68%' }} /></div>
          </div>

          <div className="health-metric">
            <div><span>Queue Processing</span><strong>92%</strong></div>
            <div className="health-track"><span style={{ width: '92%' }} /></div>
          </div>

          <div className="health-footer">
            <span className="live-dot" /> Updated just now
          </div>
        </div>
      </section>

      <section className="panel workflows-panel">
        <div className="panel-heading">
          <div>
            <h3>Recent Workflows</h3>
            <p>Monitor and manage your latest automations</p>
          </div>
          <button className="view-all-button">View all workflows</button>
        </div>

        <div className="workflow-table-wrap">
          <table className="workflow-table">
            <thead>
              <tr>
                <th>WORKFLOW</th>
                <th>STATUS</th>
                <th>EXECUTIONS</th>
                <th>SUCCESS RATE</th>
                <th>LAST UPDATED</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow) => (
                <tr key={workflow.name}>
                  <td>
                    <div className="workflow-name-cell">
                      <div className="workflow-avatar">{workflow.initials}</div>
                      <div>
                        <strong>{workflow.name}</strong>
                        <span>{workflow.description}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${workflow.status.toLowerCase()}`}>
                      <i />{workflow.status}
                    </span>
                  </td>
                  <td>{workflow.runs}</td>
                  <td>{workflow.success}</td>
                  <td className="updated-cell">{workflow.updated}</td>
                  <td><button className="table-menu" aria-label={`Options for ${workflow.name}`}><MoreHorizontal size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function EmptyPage({ page }: { page: string }) {
  return (
    <div className="empty-page">
      <div className="empty-page-icon"><Workflow size={30} /></div>
      <h2>{page}</h2>
      <p>This workspace section is being prepared.</p>
      <span>We'll connect this section as the FlowForge features are developed.</span>
    </div>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState('Dashboard')

  const handleCreateWorkflow = () => {
    setActivePage('Workflows')
  }

  const pageSubtitles: Record<string, string> = {
    Dashboard: 'Your automation command center',
    Workflows: 'Design, manage and orchestrate your workflows',
    Executions: 'Track workflow runs and execution history',
    Monitoring: 'Observe system performance and health',
    'Dead Letter Queue': 'Review failed events and retry processing',
    Settings: 'Manage your workspace preferences',
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <main className="main-area">
        <Header
          title={activePage}
          subtitle={pageSubtitles[activePage] ?? 'FlowForge workspace'}
          onCreateWorkflow={handleCreateWorkflow}
        />

        {activePage === 'Dashboard' ? (
  <Dashboard />
) : activePage === 'Workflows' ? (
  <WorkflowCanvas />
) : (
  <EmptyPage page={activePage} />
)}
      </main>
    </div>
  )
}
