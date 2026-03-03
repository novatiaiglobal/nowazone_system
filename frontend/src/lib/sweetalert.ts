import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
  customClass: {
    popup: 'rounded-lg shadow-xl',
    title: 'text-sm font-semibold',
    timerProgressBar: 'bg-cyan-400',
  },
});

export const showSuccess = (message: string) => {
  return Toast.fire({
    icon: 'success',
    title: message,
    background: '#ffffff',
    color: '#1f2937',
    iconColor: '#22d3ee',
  });
};

export const showError = (message: string) => {
  return Toast.fire({
    icon: 'error',
    title: message,
    background: '#ffffff',
    color: '#1f2937',
    iconColor: '#ef4444',
  });
};

export const showInfo = (message: string) => {
  return Toast.fire({
    icon: 'info',
    title: message,
    background: '#ffffff',
    color: '#1f2937',
    iconColor: '#3b82f6',
  });
};

export const showWarning = (message: string) => {
  return Toast.fire({
    icon: 'warning',
    title: message,
    background: '#ffffff',
    color: '#1f2937',
    iconColor: '#f59e0b',
  });
};

export const showConfirm = (title: string, text: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#22d3ee',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, proceed',
    cancelButtonText: 'Cancel',
    background: '#ffffff',
    color: '#1f2937',
    customClass: {
      popup: 'rounded-xl shadow-2xl',
      confirmButton: 'rounded-lg px-6 py-2.5 font-semibold',
      cancelButton: 'rounded-lg px-6 py-2.5 font-semibold',
    },
  });
};

export const showLoading = (message: string = 'Processing...') => {
  return Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    background: '#ffffff',
    color: '#1f2937',
    customClass: {
      popup: 'rounded-xl shadow-2xl',
    },
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

export const closeLoading = () => {
  Swal.close();
};
