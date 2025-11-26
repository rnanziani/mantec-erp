import React, { useEffect, useState } from 'react';
import './Toast.css';

interface ToastProps {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div className={`toast toast-${type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={handleClose}>×</button>
    </div>
  );
};

export default Toast;
