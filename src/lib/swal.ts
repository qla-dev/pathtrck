import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type ConfirmActionOptions = {
  title: string;
  text?: string;
  html?: string;
  confirmText: string;
  cancelText?: string;
  icon?: 'question' | 'warning';
};

export const confirmAction = async ({ title, text, html, confirmText, cancelText = 'Cancel', icon = 'question' }: ConfirmActionOptions) => {
  const result = await Swal.fire({
    title,
    text,
    html,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: '#00aee8',
  });

  return result.isConfirmed;
};

export const showSuccess = (title: string, text?: string) => Swal.fire({
  title,
  text,
  icon: 'success',
  timer: 1800,
  timerProgressBar: true,
  showConfirmButton: false,
});

export const showError = (title: string, text?: string) => Swal.fire({
  title,
  text,
  icon: 'error',
  confirmButtonColor: '#00aee8',
});
