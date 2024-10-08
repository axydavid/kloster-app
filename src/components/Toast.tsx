import React, { useEffect, useState } from 'react';

export type ToastType = 'loading' | 'success' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    if (type !== 'loading') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation before calling onClose
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [onClose, type]);

  const getToastColor = () => {
    switch (type) {
      case 'loading':
        return 'bg-gray-100 border-gray-400 text-gray-700';
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
    }
  };

  return (
    <div
      className={`fixed bottom-8 right-8 z-50 ${getToastColor()} px-4 py-3 rounded shadow-lg transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      role="alert"
    >
      <div className="flex items-center">
        {type === 'loading' && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-3"></div>
        )}
        <span className="block sm:inline">{message}</span>
      </div>
    </div>
  );
};

export default Toast;
