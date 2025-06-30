'use client';

import { toast } from 'react-toastify';

const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

export const showToast = (type, message, onClick = null) => {
  if (typeof window !== 'undefined') {
    toast[type](message, {
      ...toastConfig,
      toastId: `${type}-${message}`,
      onClick,
    });
  }
};

export const successToast = (message, onClick = null) => showToast('success', message, onClick);
export const errorToast = (message, onClick = null) => showToast('error', message, onClick);
export const warningToast = (message, onClick = null) => showToast('warning', message, onClick);
export const infoToast = (message, onClick = null) => showToast('info', message, onClick);
