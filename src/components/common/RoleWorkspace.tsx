import React from 'react';
import { AlertCircle, ChevronDown, LucideIcon, RefreshCw } from 'lucide-react';

export type WorkspaceAccent = 'sky' | 'emerald' | 'purple' | 'slate';

export interface WorkspaceTab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface RoleWorkspaceProps {
  accent: WorkspaceAccent;
  title: string;
  subtitle: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  notice?: React.ReactNode;
  stats?: React.ReactNode;
  dataError?: string | null;
  loading?: boolean;
  onRetry?: () => void;
  tabs: WorkspaceTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
}

const ACCENT: Record<
  WorkspaceAccent,
  { active: string; iconOn: string; ring: string; chip: string; nav: string }
> = {
  sky: {
    active: 'bg-sky-100 text-sky-800 shadow-none',
    iconOn: 'text-sky-700',
    ring: 'border-slate-200',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    nav: 'bg-white border-slate-200'
  },
  emerald: {
    active: 'bg-sky-100 text-sky-800 shadow-none',
    iconOn: 'text-sky-700',
    ring: 'border-slate-200',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    nav: 'bg-white border-slate-200'
  },
  purple: {
    active: 'bg-sky-100 text-sky-800 shadow-none',
    iconOn: 'text-sky-700',
    ring: 'border-slate-200',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    nav: 'bg-white border-slate-200'
  },
  slate: {
    active: 'bg-sky-100 text-sky-800 shadow-none',
    iconOn: 'text-sky-700',
    ring: 'border-slate-200',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    nav: 'bg-white border-slate-200'
  }
};

export const RoleWorkspace: React.FC<RoleWorkspaceProps> = ({
  accent,
  title,
  subtitle,
  badges,
  actions,
  notice,
  stats,
  dataError,
  loading = false,
  onRetry,
  tabs,
  activeTab,
  onTabChange,
  children
}) => {
  const theme = ACCENT[accent];

  return (
    <div className="min-h-screen bg-slate-50 pb-12 sm:pb-16 pt-20 sm:pt-24 px-2.5 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] min-w-0 mx-auto space-y-4 sm:space-y-5">
        <header className={`min-w-0 bg-white/95 rounded-2xl sm:rounded-3xl p-4 sm:p-7 border ${theme.ring} shadow-sm`}>
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
            <div className="min-w-0 space-y-2.5" style={{ overflowWrap: 'anywhere' }}>
              {badges && <div className="flex min-w-0 flex-wrap items-center gap-2">{badges}</div>}
              <h1 className="break-words text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                {title}
              </h1>
              <div className="max-w-3xl text-sm text-slate-600 leading-relaxed">{subtitle}</div>
            </div>
            {actions && <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:shrink-0">{actions}</div>}
          </div>
          {stats && <div className="mt-5 min-w-0 pt-5 border-t border-slate-100">{stats}</div>}
        </header>

        {notice}

        {dataError && (
          <div role="alert" aria-live="polite" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">Không tải được dữ liệu từ Supabase</p>
                <p className="mt-0.5 text-xs text-rose-800">{dataError}</p>
              </div>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-sky-800 ring-1 ring-slate-200 transition hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Thử tải lại
              </button>
            )}
          </div>
        )}

        {loading && !dataError && (
          <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-2.5 text-xs font-medium text-sky-800">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Đang đồng bộ dữ liệu từ Supabase...
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 lg:gap-6 items-start">
          {tabs.length > 0 && (
            <div className="relative lg:hidden">
              <label className="sr-only" htmlFor="role-workspace-section">Chọn danh mục</label>
              <select
                id="role-workspace-section"
                value={activeTab}
                onChange={(event) => onTabChange(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-semibold text-slate-700 shadow-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}{typeof tab.badge === 'number' && tab.badge > 0 ? ` (${tab.badge})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          )}

          <nav className={`hidden lg:sticky lg:top-24 lg:flex lg:flex-col gap-1.5 ${theme.nav} rounded-2xl border shadow-xs p-2`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex shrink-0 items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer text-left border ${
                    isActive ? `${theme.active} border-sky-200` : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? theme.iconOn : 'text-slate-400'}`} />
                  <span className="flex-1">{tab.label}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <section className="min-w-0 space-y-5">{children}</section>
        </div>
      </div>
    </div>
  );
};
