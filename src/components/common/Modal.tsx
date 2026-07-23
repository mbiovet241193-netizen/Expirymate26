import React from 'react';

export default function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" title="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
