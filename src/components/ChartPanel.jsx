/**
 * ChartPanel.jsx — Recharts-based chart rendering component
 * 
 * Renders bar, line, or pie charts in the right panel
 * based on chart configuration from the AI.
 */

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// ── Color palette for charts ──────────────────
const CHART_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#f97316',
];

/**
 * Chart tooltip with dark theme styling
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(75, 85, 99, 0.5)',
      borderRadius: '8px',
      padding: '8px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <p style={{ color: '#d1d5db', fontSize: '12px', fontWeight: 600, margin: '0 0 4px 0' }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || '#10b981', fontSize: '11px', margin: 0 }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

/**
 * Custom pie chart label
 */
const renderPieLabel = ({ name, percent }) => {
  if (percent < 0.05) return null; // Hide tiny slices
  return `${name} (${(percent * 100).toFixed(0)}%)`;
};

/**
 * ChartPanel component — renders the appropriate chart type
 * 
 * @param {object} props
 * @param {object} props.chartConfig - { chartType, xAxis, yAxis, title, data }
 * @param {function} props.onClose - Callback to close/clear the chart
 */
export default function ChartPanel({ chartConfig, onClose }) {
  if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
    return null;
  }

  const { chartType, title, data, xAxis, yAxis } = chartConfig;

  return (
    <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4 space-y-3 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-200">{title}</h4>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart · {data.length} data points
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
          title="Close chart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.3)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                angle={-35}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                name={yAxis || 'Value'}
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.3)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                angle={-35}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                name={yAxis || 'Value'}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#06b6d4' }}
              />
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={40}
                paddingAngle={2}
                label={renderPieLabel}
                labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Data summary below chart */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/30">
        <span className="text-[10px] text-gray-500">
          {xAxis && `X: ${xAxis}`}
        </span>
        <span className="text-[10px] text-gray-500">
          {yAxis && `Y: ${yAxis}`}
        </span>
        <span className="text-[10px] text-emerald-400/60 ml-auto">
          {data.length} categories
        </span>
      </div>
    </div>
  );
}
