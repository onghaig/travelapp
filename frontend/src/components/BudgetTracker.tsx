import { AlertCircle } from 'lucide-react';
import { BudgetBreakdown } from '../lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface BudgetTrackerProps {
  budget: BudgetBreakdown;
}

const CATEGORY_COLORS: Record<string, string> = {
  flights: '#3B82F6',
  lodging: '#10B981',
  events: '#8B5CF6',
  misc: '#F59E0B',
};

export default function BudgetTracker({ budget }: BudgetTrackerProps) {
  const chartData = Object.entries(budget.breakdown).map(([category, data]) => ({
    name: category,
    value: data.total,
    color: CATEGORY_COLORS[category] || '#94A3B8',
  }));

  const remaining = Math.max(0, budget.budget_total - budget.total_estimated);

  return (
    <div className="bg-navy-card rounded-xl border border-slate-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-text">Budget Tracker</h3>
        <span className={`text-sm font-medium ${
          budget.over_budget ? 'text-red-400' : budget.percentage_used >= 80 ? 'text-amber' : 'text-green-400'
        }`}>
          {budget.over_budget ? 'Over budget' : `${budget.percentage_used.toFixed(0)}% used`}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-24 h-24 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.length > 0 ? chartData : [{ name: 'empty', value: 1, color: '#1E293B' }]}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={44}
                dataKey="value"
                strokeWidth={0}
              >
                {(chartData.length > 0 ? chartData : [{ color: '#334155' }]).map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-muted">Total budget</span>
            <span className="text-slate-text font-medium">${budget.budget_total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-muted">Estimated</span>
            <span className={`font-medium ${budget.over_budget ? 'text-red-400' : 'text-slate-text'}`}>
              ${budget.total_estimated.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-muted">Remaining</span>
            <span className={`font-medium ${budget.over_budget ? 'text-red-400' : 'text-green-400'}`}>
              {budget.over_budget ? '-' : ''}${Math.abs(budget.remaining).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-navy-light rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            budget.over_budget ? 'bg-red-500' : budget.percentage_used >= 80 ? 'bg-amber' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(100, budget.percentage_used)}%` }}
        />
      </div>

      {/* Category breakdown */}
      <div className="space-y-1">
        {Object.entries(budget.breakdown).map(([category, data]) => (
          <div key={category} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[category] || '#94A3B8' }}
              />
              <span className="text-slate-muted capitalize">{category}</span>
            </div>
            <span className="text-slate-text font-medium">${data.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {budget.warnings.length > 0 && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          {budget.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-400">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
