import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Alert, CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import { departmentApi } from '@/api/departmentApi';
import { approvalApi, type PendingType } from '@/api/approvalApi';

interface Props {
  open: boolean;
  type: PendingType;
  itemId: string;
  title?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function SubmitForReviewDialog({
  open, type, itemId, title = 'Gửi yêu cầu duyệt', onClose, onSubmitted,
}: Props) {
  const [requestedDeptId, setRequestedDeptId] = useState<string>('all');
  const [requestedTo, setRequestedTo] = useState<string>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: managers, isLoading: loadingManagers } = useQuery({
    queryKey: ['users', 'managers'],
    queryFn: () => userApi.managers(),
    enabled: open,
  });

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
    enabled: open,
  });

  const filteredManagers = useMemo(() => {
    if (!managers) return [];
    
    // Normalize requestedDeptId
    const targetDeptId = requestedDeptId === 'all' ? null : requestedDeptId;
    
    console.log('[DEBUG] Filtering managers for dept:', targetDeptId);
    console.log('[DEBUG] Total managers fetched:', managers.length);

    if (requestedDeptId === 'all') return managers;

    const filtered = managers.filter(m => {
      // Robust ID comparison
      const mDeptId = typeof m.department_id === 'string' ? m.department_id : (m.department_id as any)?.$oid || m.department_id;
      
      const isMatch = !mDeptId || mDeptId === requestedDeptId;
      
      console.log(`[DEBUG] Manager: ${m.full_name}, DeptID: ${mDeptId}, Target: ${requestedDeptId}, Match: ${isMatch}`);
      return isMatch;
    });
    
    console.log('[DEBUG] Filtered result count:', filtered.length);
    return filtered;
  }, [managers, requestedDeptId]);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await approvalApi.submitForReview(type, itemId, {
        requested_department_id: requestedDeptId === 'all' ? null : requestedDeptId,
        requested_to: requestedTo || null,
        note: note || null,
      });
      onSubmitted?.();
      onClose();
      setRequestedDeptId('all');
      setRequestedTo('');
      setNote('');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Chuyển trạng thái sang <b>Yêu cầu duyệt</b>. Cán bộ quản lý sẽ duyệt trong Hộp duyệt.
          </Alert>
          
          <TextField
            select fullWidth
            label="Phòng ban duyệt"
            value={requestedDeptId}
            onChange={(e) => {
              setRequestedDeptId(e.target.value);
              setRequestedTo(''); // reset specific reviewer
            }}
            disabled={loadingDepts}
            helperText={loadingDepts ? 'Đang tải danh sách phòng ban...' : 'Chọn phòng ban được quyền duyệt'}
          >
            <MenuItem value="all">Tất cả phòng ban</MenuItem>
            {(departments || []).map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select fullWidth
            label="Người duyệt cụ thể (Tuỳ chọn)"
            value={requestedTo}
            onChange={(e) => setRequestedTo(e.target.value)}
            disabled={loadingManagers}
            helperText={
              loadingManagers 
                ? 'Đang tải danh sách...' 
                : 'Nếu chọn người duyệt cụ thể, những người khác chỉ được xem và góp ý.'
            }
          >
            <MenuItem value="">-- Không chọn người duyệt cụ thể --</MenuItem>
            {filteredManagers.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.full_name} ({m.employee_id})
              </MenuItem>
            ))}
            {!loadingManagers && filteredManagers.length === 0 && (
              <MenuItem value="" disabled>Không có cán bộ quản lý nào trong phòng ban này</MenuItem>
            )}
          </TextField>

          <TextField
            fullWidth multiline minRows={2}
            label="Ghi chú (tuỳ chọn)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={submitting}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Gửi yêu cầu
        </Button>
      </DialogActions>
    </Dialog>
  );
}
