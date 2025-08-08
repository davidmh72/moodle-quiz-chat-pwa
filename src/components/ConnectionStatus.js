import React from 'react';

const ConnectionStatus = ({ isOnline, syncStatus = 'idle' }) => {
  if (isOnline && syncStatus === 'idle') {
    return null; // Don't show anything when online and everything is fine
  }

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        className: 'status-offline',
        text: 'Offline',
        icon: '📡'
      };
    }
    
    if (syncStatus === 'syncing') {
      return {
        className: 'status-syncing',
        text: 'Syncing...',
        icon: '🔄'
      };
    }
    
    return {
      className: 'status-online',
      text: 'Online',
      icon: '✅'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="connection-status">
      <div className={`status-indicator ${statusInfo.className}`}>
        <span>{statusInfo.icon}</span>
        <span>{statusInfo.text}</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;