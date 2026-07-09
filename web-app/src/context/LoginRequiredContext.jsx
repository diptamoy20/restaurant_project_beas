import { createContext, useCallback, useContext, useState } from 'react';
import { LoginRequiredModal } from '../components/LoginRequiredModal.jsx';

const LoginRequiredContext = createContext(null);

export function LoginRequiredProvider({ children }) {
  const [open, setOpen] = useState(false);

  const promptLoginRequired = useCallback(() => {
    setOpen(true);
  }, []);

  const closeLoginRequired = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <LoginRequiredContext.Provider
      value={{ promptLoginRequired, closeLoginRequired }}
    >
      {children}
      <LoginRequiredModal open={open} onClose={closeLoginRequired} />
    </LoginRequiredContext.Provider>
  );
}

export function useLoginRequired() {
  const context = useContext(LoginRequiredContext);

  if (!context) {
    throw new Error(
      'useLoginRequired must be used within LoginRequiredProvider',
    );
  }

  return context;
}
