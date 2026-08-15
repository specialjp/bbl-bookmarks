import { useAuth0 } from '@auth0/auth0-react';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState, type JSX, type MouseEvent } from 'react';

export function UserMenu(): JSX.Element | null {
  const { user, logout } = useAuth0();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!user) return null;

  const open = (e: MouseEvent<HTMLElement>): void => setAnchor(e.currentTarget);
  const close = (): void => setAnchor(null);

  return (
    <>
      <IconButton onClick={open} size="small" aria-label="account menu">
        <Avatar
          src={user.picture}
          alt={user.email ?? 'user'}
          sx={{ width: 34, height: 34 }}
        />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem disabled>
          <ListItemText primary={user.name ?? user.email} secondary={user.email} />
        </MenuItem>
        <MenuItem
          onClick={() =>
            void logout({
              // must match the registered logout URL http://localhost:3000
              logoutParams: { returnTo: window.location.origin },
            })
          }
        >
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}
