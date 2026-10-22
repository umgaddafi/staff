import React from 'react';

export default function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="stat-card">
      {Icon && <Icon size={22} />}
      <div>
        <strong>{value ?? 0}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
