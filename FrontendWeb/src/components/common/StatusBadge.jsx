import React from 'react';

export const StatusBadge = ({ status }) => {
  const getStatusInfo = () => {
    switch (status?.toUpperCase()) {
      case 'ONLINE':
        return { text: 'Sẵn Sàng', className: 'badge-online', dot: 'online' };
      case 'BUSY':
        return { text: 'Đang Bận', className: 'badge-busy', dot: 'busy' };
      case 'OFFLINE':
      default:
        return { text: 'Ngoại Tuyến', className: 'badge-offline', dot: 'offline' };
    }
  };

  const info = getStatusInfo();

  return (
    <span className={`badge ${info.className}`}>
      <span className={`status-dot ${info.dot}`} />
      <span>{info.text}</span>
    </span>
  );
};

export default StatusBadge;
