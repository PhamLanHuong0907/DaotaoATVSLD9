import { useState } from 'react';
import {
  Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, MenuItem, Typography, Pagination,
  IconButton, Tooltip, Chip, Skeleton,
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Send } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SubmitForReviewDialog from '@/components/common/SubmitForReviewDialog';
import { getUnifiedStatus } from '@/utils/statusHelper';
import { useExamPeriods, useDeleteExamPeriod } from '@/hooks/useExamPeriods';
import type { ExamType, ExamPeriodStatus } from '@/types/enums';
import { examTypeLabels, examPeriodStatusLabels } from '@/utils/vietnameseLabels';

const typeOptions = [{ value: '', label: 'Tất cả' }, ...Object.entries(examTypeLabels).map(([v, l]) => ({ value: v, label: l }))];
const statusOptions = [{ value: '', label: 'Tất cả' }, ...Object.entries(examPeriodStatusLabels).map(([v, l]) => ({ value: v, label: l }))];

export default function PeriodListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [examType, setExamType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitId, setSubmitId] = useState<string | null>(null);
  const pageSize = 10;

  const { data, isLoading, refetch } = useExamPeriods({
    exam_type: (examType || undefined) as ExamType | undefined,
    status: (status || undefined) as ExamPeriodStatus | undefined,
    page, page_size: pageSize,
  });

  const deleteMutation = useDeleteExamPeriod();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      enqueueSnackbar('Đã xoá kỳ thi', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
    setDeleteId(null);
  };

  return (
    <>
      <PageHeader
        title="Quản lý kỳ thi"
        subtitle="Tạo và quản lý các đợt thi tập trung. Phê duyệt thực hiện trong Hộp duyệt."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/periods/create')}>
            Tạo kỳ thi
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField select size="small" label="Loại thi" value={examType}
          onChange={(e) => { setExamType(e.target.value); setPage(1); }}
          sx={{ minWidth: 200 }}>
          {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Trạng thái" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          sx={{ minWidth: 180 }}>
          {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>
          ))}
        </Paper>
      ) : !data?.items.length ? (
        <EmptyState
          message="Chưa có kỳ thi nào"
          action={<Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => navigate('/admin/periods/create')}>Tạo kỳ thi đầu tiên</Button>}
        />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Tên kỳ thi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Từ ngày</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Đến ngày</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Phòng ban</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((p: any) => {
                  const unifiedStatus = getUnifiedStatus(p, 'period');
                  const approvalStatus = p.approval_status || 'draft';
                  const canModify = approvalStatus === 'draft' || approvalStatus === 'rejected';
                  const isOverdue = dayjs().isAfter(dayjs(p.end_date));
                  const canDelete = canModify || (approvalStatus === 'draft' && isOverdue);

                        return (
                          <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <TableCell><Typography variant="body2" fontWeight={500}>{p.name}</Typography></TableCell>
                            <TableCell>{examTypeLabels[p.exam_type as ExamType]}</TableCell>
                            <TableCell>{dayjs(p.start_date).format('DD/MM/YYYY HH:mm')}</TableCell>
                            <TableCell>{dayjs(p.end_date).format('DD/MM/YYYY HH:mm')}</TableCell>
                            <TableCell align="center">{p.department_ids.length || 'Tất cả'}</TableCell>
                            <TableCell align="center">
                              <Chip size="small" label={unifiedStatus.label} color={unifiedStatus.color} />
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Xem chi tiết kỳ thi">
                                <IconButton size="small" onClick={() => navigate(`/admin/periods/${p.id}`)}>
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={canModify ? "Sửa" : "Không thể sửa khi đã gửi duyệt hoặc được chấp thuận"}>
                                <span>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => navigate(`/admin/periods/${p.id}/edit`)}
                                    disabled={!canModify}
                                    sx={{ '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'auto' } }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              
                              <Tooltip title={canModify ? "Gửi yêu cầu duyệt" : "Đã gửi yêu cầu hoặc đã được duyệt"}>
                                <span>
                                  <IconButton 
                                    size="small" 
                                    color="primary" 
                                    onClick={() => setSubmitId(p.id)}
                                    disabled={!canModify}
                                    sx={{ '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'auto' } }}
                                  >
                                    <Send fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              
                              <Tooltip title={canDelete ? (isOverdue ? "Xoá (Đã quá hạn)" : "Xoá") : "Không thể xoá khi đã gửi duyệt hoặc được chấp thuận"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setDeleteId(p.id)}
                                    disabled={!canDelete}
                                    sx={{ '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'auto' } }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Xoá kỳ thi"
        message="Bạn có chắc chắn muốn xoá kỳ thi này? Không thể xoá nếu còn phòng thi bên trong."
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <SubmitForReviewDialog
        open={!!submitId}
        type="exam_period"
        itemId={submitId || ''}
        title="Gửi yêu cầu duyệt kỳ thi"
        onClose={() => setSubmitId(null)}
        onSubmitted={() => {
          enqueueSnackbar('Đã gửi yêu cầu duyệt', { variant: 'success' });
          refetch();
        }}
      />
    </>
  );
}
