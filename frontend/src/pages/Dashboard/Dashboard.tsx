import { useNavigate } from 'react-router-dom';
import { Users, FileText, DollarSign, CheckSquare, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import type { RecentActivity } from '@/features/dashboard/services/dashboardService';

function getActivityIcon(type: string) {
  switch (type) {
    case 'client': return Users;
    case 'sales_tax': return FileText;
    case 'withholding': return DollarSign;
    case 'task': return CheckSquare;
    case 'document': return FileText;
    case 'notification': return TrendingUp;
    default: return TrendingUp;
  }
}

const activityColors: Record<string, string> = {
  client: 'text-indigo-600 bg-indigo-100',
  sales_tax: 'text-green-600 bg-green-100',
  withholding: 'text-blue-600 bg-blue-100',
  task: 'text-amber-600 bg-amber-100',
  document: 'text-purple-600 bg-purple-100',
  notification: 'text-rose-600 bg-rose-100',
};

export function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();

  const stats = data ? [
    { name: 'Total Clients', value: String(data.stats.total_clients), icon: Users, color: 'text-primary-600 bg-primary-100' },
    { name: 'Sales Tax Returns', value: String(data.stats.total_sales_tax), icon: FileText, color: 'text-green-600 bg-green-100' },
    { name: 'Withholding Challans', value: String(data.stats.total_withholding), icon: DollarSign, color: 'text-blue-600 bg-blue-100' },
    { name: 'Pending Tasks', value: String(data.stats.pending_tasks), icon: CheckSquare, color: 'text-amber-600 bg-amber-100' },
    { name: 'Overdue Returns', value: String(data.stats.overdue_sales_tax), icon: AlertCircle, color: 'text-red-600 bg-red-100' },
    { name: 'Filed This Month', value: String(data.stats.filings_this_month), icon: FileText, color: 'text-teal-600 bg-teal-100' },
    { name: 'Documents', value: String(data.stats.total_documents), icon: FileText, color: 'text-purple-600 bg-purple-100' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your tax compliance management</p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-3 text-slate-500">Loading dashboard data...</span>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="card p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-lg font-medium text-slate-700">Unable to load dashboard</p>
          <p className="text-sm text-slate-500 mt-1">Check that the backend server is running and try again.</p>
        </div>
      )}

      {/* Stats Grid */}
      {data && !isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.name} className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.name}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Secondary Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.slice(4).map((stat) => (
              <div key={stat.name} className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.name}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/clients')}
                  className="btn-secondary flex flex-col items-center p-6 hover:bg-slate-50 transition-colors"
                >
                  <Users className="h-8 w-8 text-primary-600 mb-2" />
                  <span className="font-medium text-slate-700">Add Client</span>
                </button>
                <button
                  onClick={() => navigate('/sales-tax')}
                  className="btn-secondary flex flex-col items-center p-6 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="h-8 w-8 text-green-600 mb-2" />
                  <span className="font-medium text-slate-700">File Sales Tax</span>
                </button>
                <button
                  onClick={() => navigate('/withholding')}
                  className="btn-secondary flex flex-col items-center p-6 hover:bg-slate-50 transition-colors"
                >
                  <DollarSign className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="font-medium text-slate-700">Record Withholding</span>
                </button>
                <button
                  onClick={() => navigate('/tasks')}
                  className="btn-secondary flex flex-col items-center p-6 hover:bg-slate-50 transition-colors"
                >
                  <CheckSquare className="h-8 w-8 text-amber-600 mb-2" />
                  <span className="font-medium text-slate-700">Create Task</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              {data!.recent_activity.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg">No recent activity</p>
                  <p className="text-sm mt-1">Start by adding your first client</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data!.recent_activity.map((activity: RecentActivity) => {
                    const Icon = getActivityIcon(activity.type);
                    const color = activityColors[activity.type] || 'text-slate-600 bg-slate-100';
                    const timeAgo = formatTimeAgo(activity.created_at);
                    return (
                      <div
                        key={activity.id}
                        className={`flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors ${activity.link ? 'cursor-pointer' : ''}`}
                        onClick={() => activity.link && navigate(activity.link)}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{activity.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                          {activity.client_name && (
                            <p className="text-xs text-slate-400 mt-0.5">Client: {activity.client_name}</p>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 shrink-0">{timeAgo}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const date = new Date(isoString).getTime();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString();
}