import { useEffect, useRef, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack,
  FormControlLabel, Switch, Divider, Avatar, Alert
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Save, Business, EmojiEvents, Settings as SettingsIcon, Image as ImageIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import { settingsApi, type SystemSettingsUpdate } from '@/api/settingsApi';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isGlobalManager = user?.role === 'manager' && !user?.department_id;
  const canEdit = isAdmin || isGlobalManager;

  const { data, isLoading } = useQuery({ queryKey: ['system-settings'], queryFn: () => settingsApi.get() });
  const [form, setForm] = useState<SystemSettingsUpdate>({});

  useEffect(() => {
    if (data) {
      setForm({
        company_name: data.company_name, company_address: data.company_address || '',
        company_phone: data.company_phone || '', logo_url: data.logo_url || '',
        certificate_validity_months: data.certificate_validity_months,
        certificate_signer_name: data.certificate_signer_name || '',
        certificate_signer_title: data.certificate_signer_title || '',
        default_passing_score: data.default_passing_score, allow_self_register: data.allow_self_register,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: SystemSettingsUpdate) => settingsApi.update(payload),
    onSuccess: () => { enqueueSnackbar('Đã lưu cấu hình', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['system-settings'] }); },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const uploadLogo = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: (updated) => {
      enqueueSnackbar('Đã cập nhật logo', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['system-settings'] });
      setForm((prev) => ({ ...prev, logo_url: updated.logo_url || '' }));
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) uploadLogo.mutate(file); e.target.value = '';
  };

  if (isLoading || !data) return <Typography>Đang tải...</Typography>;

  return (
    <>
      <PageHeader title="Cấu hình hệ thống" subtitle="Thông tin doanh nghiệp, chứng chỉ, chính sách thi" />

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>Bạn đang ở chế độ xem. Chỉ Manager cấp cao hoặc Admin mới có thể chỉnh sửa cấu hình hệ thống.</Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><Business color="primary" /><Typography variant="h6">Thông tin doanh nghiệp</Typography></Stack>
              <Stack spacing={2}>
                <TextField fullWidth label="Tên công ty" disabled={!canEdit} value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                <TextField fullWidth label="Địa chỉ" disabled={!canEdit} value={form.company_address || ''} onChange={(e) => setForm({ ...form, company_address: e.target.value })} />
                <TextField fullWidth label="Số điện thoại" disabled={!canEdit} value={form.company_phone || ''} onChange={(e) => setForm({ ...form, company_phone: e.target.value })} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Logo công ty</Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar src={form.logo_url || undefined} variant="rounded" sx={{ width: 80, height: 80, bgcolor: 'grey.100', color: 'grey.500' }}><ImageIcon /></Avatar>
                    <Stack spacing={1}>
                      {canEdit && (
                        <Button variant="outlined" component="label" disabled={uploadLogo.isPending}>
                          {uploadLogo.isPending ? 'Đang tải...' : 'Tải logo lên'}
                          <input type="file" hidden ref={logoInputRef} accept="image/*" onChange={handleLogoChange} />
                        </Button>
                      )}
                      <Typography variant="caption" color="text.secondary">PNG, JPG, WEBP, SVG.</Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><EmojiEvents color="primary" /><Typography variant="h6">Chứng chỉ</Typography></Stack>
              <Stack spacing={2}>
                <TextField fullWidth type="number" label="Hiệu lực (tháng)" disabled={!canEdit} value={form.certificate_validity_months || 12} onChange={(e) => setForm({ ...form, certificate_validity_months: Number(e.target.value) })} />
                <TextField fullWidth label="Người ký chứng chỉ" disabled={!canEdit} value={form.certificate_signer_name || ''} onChange={(e) => setForm({ ...form, certificate_signer_name: e.target.value })} />
                <TextField fullWidth label="Chức vụ người ký" disabled={!canEdit} value={form.certificate_signer_title || ''} onChange={(e) => setForm({ ...form, certificate_signer_title: e.target.value })} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><SettingsIcon color="primary" /><Typography variant="h6">Chính sách thi</Typography></Stack>
              <Stack spacing={2}>
                <TextField type="number" label="Điểm đạt mặc định" disabled={!canEdit} sx={{ maxWidth: 200 }} value={form.default_passing_score || 5} onChange={(e) => setForm({ ...form, default_passing_score: Number(e.target.value) })} />
                <FormControlLabel control={<Switch disabled={!canEdit} checked={!!form.allow_self_register} onChange={(e) => setForm({ ...form, allow_self_register: e.target.checked })} />} label="Cho phép người lao động tự đăng ký tài khoản" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {canEdit && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" size="large" startIcon={<Save />} disabled={save.isPending} onClick={() => save.mutate(form)}>
              Lưu tất cả cấu hình
            </Button>
          </Box>
        </>
      )}
    </>
  );
}