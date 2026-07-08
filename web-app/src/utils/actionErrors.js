export function getActionErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (typeof error === 'string') {
    return error;
  }

  if (Array.isArray(error)) {
    return error.filter(Boolean).join(', ');
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}
