import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const StatusBadge = ({ status, size, showLabel = true }) => {
  const { t } = useLanguage();

  const getStatusInfo = () => {
    switch (status?.toUpperCase()) {
      case 'ONLINE':
        return { text: t('status.ready', 'Sẵn Sàng'), className: 'badge-online', dot: 'online' };
      case 'BUSY':
        return { text: t('status.busy', 'Đang Bận'), className: 'badge-busy', dot: 'busy' };
      case 'OFFLINE':
      default:
        return { text: t('status.offline', 'Ngoại Tuyến'), className: 'badge-offline', dot: 'offline' };
    }
  };

  const info = getStatusInfo();

  return (
    <span className={`badge ${info.className}${size ? ` badge-${size}` : ''}`}>
      <span className={`status-dot ${info.dot}`} />
      {showLabel && <span>{info.text}</span>}
    </span>
  );
};

export default StatusBadge;
