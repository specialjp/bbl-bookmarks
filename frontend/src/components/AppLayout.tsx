import BookmarkIcon from '@mui/icons-material/Bookmark';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import type { JSX } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router';

import { UserMenu } from '@/auth/UserMenu';

const NAV = [
  { to: '/collections', label: 'Collections' },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/all', label: 'All' },
  { to: '/shared', label: 'Redeem share' },
];

export function AppLayout(): JSX.Element {
  const { pathname } = useLocation();
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #e6e8f0' }}>
        <Toolbar sx={{ gap: 1 }}>
          <BookmarkIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700, mr: 3 }}>
            Bookmarks
          </Typography>
          {NAV.map(({ to, label }) => (
            <Button
              key={to}
              component={RouterLink}
              to={to}
              color={pathname.startsWith(to) ? 'primary' : 'inherit'}
            >
              {label}
            </Button>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <UserMenu />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
