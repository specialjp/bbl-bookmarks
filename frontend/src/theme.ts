import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#1a4fd6' },
    secondary: { main: '#7b1fa2' },
    background: { default: '#f6f7fb' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #e6e8f0', boxShadow: 'none' },
      },
    },
  },
});
