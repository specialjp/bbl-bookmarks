import RedeemIcon from '@mui/icons-material/Redeem';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent, type JSX } from 'react';
import { useNavigate } from 'react-router';

import { useAcceptShare } from './api';

export function RedeemSharePage(): JSX.Element {
  const [token, setToken] = useState('');
  const accept = useAcceptShare();
  const navigate = useNavigate();

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (!token.trim()) return;
    accept.mutate(
      { token: token.trim() },
      {
        onSuccess: (share) =>
          void navigate(`/collections/${share.collectionId}`),
      },
    );
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <RedeemIcon color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Redeem a share token
              </Typography>
            </Stack>
            <Typography color="text.secondary">
              Someone shared a collection with you? Paste the token below.
              You&apos;ll get read-only access to that collection and its
              bookmarks.
            </Typography>
            <form onSubmit={submit}>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Share token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={accept.isPending || !token.trim()}
                >
                  Redeem
                </Button>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
