import { useState, useEffect, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, Box, TextField, MenuItem,
  Pagination, Skeleton, Chip, IconButton, Tooltip, Stack,
  InputAdornment,
} from '@mui/material';
import { Add, Quiz, Assignment, Delete, Search, Send } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SubmitForReviewDialog from '@/components/common/SubmitForReviewDialog';
import { useExams } from '@/hooks/useExams';
import { examApi } from '@/api/examApi';
import { occupationApi } from '@/api/catalogApi';
import { examPeriodApi } from '@/api/examPeriodApi';
import { getUnifiedStatus } from '@/utils/statusHelper';
import type { ExamType, ExamKind } from '@/types/enums';
import { examTypeLabels } from '@/utils/vietnameseLabels';
import { formatDuration } from '@/utils/formatters';

const examTypeOptions = [
  { value: '', label: 'Tất cả loại thi' },
  ...Object.entries(examTypeLabels).map(([v, l]) => ({ value: v, label: l })),
];

const examKindOptions = [
  { value: '', label: 'Tất cả hình thức' },
  { value: 'trial', label: 'Thi thử' },
  { value: 'official', label: 'Thi chính thức' },
];

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Nháp' },
  { value: 'pending_review', label: 'Chờ duyệt' },
  { value: 'rejected', label: 'Đã từ chối duyệt' },
  { value: 'upcoming', label: 'Sắp diễn ra (Đã duyệt)' },
  { value: 'opening', label: 'Đang mở (Đã duyệt)' },
  { value: 'closed', label: 'Đã đóng (Đã duyệt)' },
];

const examKindChipProps = (kind?: ExamKind) => {
  if (kind === 'official') return { label: 'Chính thức', color: 'primary' as const };
  return { label: 'Thi thử', color: 'default' as const };
};

export default function AdminExamListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // 1. Filter States
  const [examType, setExamType] = useState('');
  const [examKind, setExamKind] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [occupation, setOccupation] = useState('');

  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitId, setSubmitId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState('');
  const pageSize = 10;

  // 1.5 Fetch Catalog Data
  const { data: occupationsData } = useQuery({
    queryKey: ['occupations'],
    queryFn: () => occupationApi.list(false),
  });

  const { data: periodsData } = useQuery({
    queryKey: ['exam-periods'],
    queryFn: () => examPeriodApi.list({ page_size: 100 }),
  });

  // 2. Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // 3. Fetch Data
  const { data, isLoading } = useExams({
    exam_type: (examType || undefined) as ExamType | undefined,
    exam_kind: (examKind || undefined) as ExamKind | undefined,
    exam_period_id: (periodId || undefined),
    page,
    page_size: pageSize,
  });

  // 4. Client-side Filtering
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((exam) => {
      // Use unified status logic for filtering
      const unified = getUnifiedStatus(exam, 'exam');

      // Map unified labels back to status values for matching
      let currentStatusValue = '';
      if (unified.label === 'Nháp') currentStatusValue = 'draft';
      else if (unified.label === 'Chờ duyệt') currentStatusValue = 'pending_review';
      else if (unified.label === 'Đã từ chối duyệt') currentStatusValue = 'rejected';
      else if (unified.label === 'Đã lên lịch' || unified.label === 'Sắp diễn ra') currentStatusValue = 'upcoming';
      else if (unified.label === 'Đang diễn ra' || unified.label === 'Đang mở') currentStatusValue = 'opening';
      else if (unified.label === 'Đã kết thúc' || unified.label === 'Đã đóng') currentStatusValue = 'closed';

      const matchSearch = debouncedSearch ? exam.name.toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
      const matchOccupation = occupation ? exam.occupation === occupation : true;
      const matchStatus = status ? currentStatusValue === status : true;

      return matchSearch && matchOccupation && matchStatus;
    });
  }, [data?.items, debouncedSearch, occupation, status]);

  // 5. Dropdown Options from Data
  const occupationOptions = useMemo(() => {
    const list = occupationsData?.map(o => ({ value: o.name, label: o.name })) || [];
    return [{ value: '', label: 'Tất cả nghề' }, ...list];
  }, [occupationsData]);

  const periodOptions = useMemo(() => {
    const list = periodsData?.items.map(p => ({ value: p.id, label: p.name })) || [];
    return [{ value: '', label: 'Tất cả kỳ thi' }, ...list];
  }, [periodsData]);

  const deleteMutation = useMutation({
    mutationFn: examApi.delete,
    onSuccess: () => {
      enqueueSnackbar('Đã xóa kỳ thi', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setDeleteId(null);
    },
    onError: () => {
      enqueueSnackbar('Lỗi khi xóa', { variant: 'error' });
      setDeleteId(null);
    },
  });

  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Quản lý đề thi"
        subtitle="Danh sách các đề thi đã tạo"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/exams/generate')}>
            Tạo đề thi mới
          </Button>
        }
      />

      <Stack direction="row"
        spacing={2}
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}>
        <TextField
          placeholder="Tìm kiếm đề thi..."
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 400 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
            }
          }}
        />

        <TextField
          select size="small" label="Loại kỳ thi" value={examKind}
          onChange={handleFilterChange(setExamKind)}
          sx={{ minWidth: 150 }}
        >
          {examKindOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select size="small" label="Loại thi" value={examType}
          onChange={handleFilterChange(setExamType)}
          sx={{ minWidth: 180 }}
        >
          {examTypeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select size="small" label="Trạng thái" value={status}
          onChange={handleFilterChange(setStatus)}
          sx={{ minWidth: 160 }}
        >
          {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select size="small" label="Ngành nghề" value={occupation}
          onChange={handleFilterChange(setOccupation)}
          sx={{ minWidth: 180 }}
        >
          {occupationOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select size="small" label="Kỳ thi" value={periodId}
          onChange={handleFilterChange(setPeriodId)}
          sx={{ minWidth: 180 }}
        >
          {periodOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>
          ))}
        </Paper>
      ) : !filteredItems.length ? (
        <EmptyState
          message="Không tìm thấy đề thi phù hợp với bộ lọc."
          action={<Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/exams/generate')} sx={{ mt: 2 }}>Tạo đề thi đầu tiên</Button>}
        />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Tên đề thi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Loại & Hình thức</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nghề & Bậc</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Số câu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((exam) => {
                  const unifiedStatus = getUnifiedStatus(exam, 'exam');
                  const examStatus = (exam as any).approval_status || (exam as any).status || 'draft';
                  const canModify = examStatus === 'draft' || examStatus === 'rejected';
                  const isOverdue = exam.scheduled_end ? dayjs().isAfter(dayjs(exam.scheduled_end)) : false;
                  const canDelete = canModify || (examStatus === 'draft' && isOverdue);

                          return (
                            <TableRow key={exam.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>{exam.name}</Typography>
                                {exam.exam_period_name && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Kỳ thi: {exam.exam_period_name}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Chip label={examTypeLabels[exam.exam_type]} size="small" variant="outlined" />
                                  <Chip {...examKindChipProps(exam.exam_kind)} size="small" />
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{exam.occupation}</Typography>
                                <Typography variant="caption" color="text.secondary">Bậc {exam.skill_level}</Typography>
                              </TableCell>
                              <TableCell align="center">{exam.total_questions}</TableCell>
                              <TableCell>{formatDuration(exam.duration_minutes)}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={unifiedStatus.label}
                                  size="small"
                                  color={unifiedStatus.color}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                  <Tooltip title="Xem câu hỏi">
                                    <IconButton size="small" color="primary" onClick={() => navigate(`/admin/exams/${exam.id}`)}>
                                      <Quiz fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
        
                                  <Tooltip title={canModify ? "Gửi yêu cầu duyệt" : "Đã gửi yêu cầu hoặc đã được duyệt"}>
                                    <span>
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => setSubmitId(exam.id)}
                                        disabled={!canModify}
                                        sx={{ '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'auto' } }}
                                      >
                                        <Send fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
        
                                  <Tooltip title={canDelete ? (isOverdue ? "Xóa (Đã quá hạn)" : "Xóa") : "Không thể xóa khi đã gửi duyệt hoặc đã được duyệt"}>
                                    <span>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => setDeleteId(exam.id)}
                                        disabled={!canDelete}
                                        sx={{ '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'auto' } }}
                                      >
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {data && data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Xóa đề thi"
        message="Bạn có chắc chắn muốn xóa đề thi này? Thao tác không thể hoàn tác."
        confirmText="Xóa"
        confirmColor="error"
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />

      <SubmitForReviewDialog
        open={!!submitId}
        type="exam"
        itemId={submitId || ''}
        title="Gửi yêu cầu duyệt đề thi"
        onClose={() => setSubmitId(null)}
        onSubmitted={() => {
          enqueueSnackbar('Đã gửi yêu cầu duyệt', { variant: 'success' });
          queryClient.invalidateQueries({ queryKey: ['exams'] });
        }}
      />
    </>
  );
}
