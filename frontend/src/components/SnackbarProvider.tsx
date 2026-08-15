import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

// Hard rule (CLAUDE.md #9): EVERY mutation surfaces a snackbar — success and
// error. Mutation hooks call notify() in onSuccess/onError so pages cannot
// forget. ~40 lines of MUI instead of a notistack dependency.

type Severity = 'success' | 'error' | 'info';

interface SnackbarContextValue {
  notify: (message: string, severity?: Severity) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within AppSnackbarProvider');
  return ctx;
}

export function AppSnackbarProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [state, setState] = useState<{
    open: boolean;
    message: string;
    severity: Severity;
  }>({ open: false, message: '', severity: 'info' });

  const notify = useCallback(
    (message: string, severity: Severity = 'success') =>
      setState({ open: true, message, severity }),
    [],
  );
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={() => setState((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={state.severity}
          variant="filled"
          onClose={() => setState((s) => ({ ...s, open: false }))}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
