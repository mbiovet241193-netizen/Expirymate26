import React from 'react';

export default function StatCard({
  label,
  value,
  color,
  icon
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div className="stat-card" style={{ borderInlineStartColor: color, ['--stat-color' as string]: color }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <div className="stat-value" style={{ color }}>
          {value}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
