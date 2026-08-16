import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type ConfirmActionOptions = {
  title: string;
  text: string;
  confirmText: string;
  icon?: 'question' | 'warning';
};

export const confirmAction = async ({ title, text, confirmText, icon = 'question' }: ConfirmActionOptions) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
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
