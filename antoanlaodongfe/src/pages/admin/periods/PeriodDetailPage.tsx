import { useState } from 'react';
import {
  Box, Button, Card, CardContent, Stack, Typography,
  Chip, Divider, Paper, Tooltip
} from '@mui/material';
import {
  Edit,CalendarToday,
  Business, Work, Grade, Description, Send, Delete
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import { departmentApi } from '@/api/departmentApi';
import { useExamPeriod, useDeleteExamPeriod } from '@/hooks/useExamPeriods';
import { getUnifiedStatus } from '@/utils/statusHelper';
import { examTypeLabels } from '@/utils/vietnameseLabels';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SubmitForReviewDialog from '@/components/common/SubmitForReviewDialog';

export default function PeriodDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: period, isLoading, refetch } = useExamPeriod(periodId || '');
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const deleteMutation = useDeleteExamPeriod();

  if (isLoading) return <Box p={4}>Đang tải...</Box>;
  if (!period) return <Box p={4}>Không tìm thấy kỳ thi</Box>;

  const unifiedStatus = getUnifiedStatus(period, 'period');
  const approvalStatus = period.approval_status || 'draft';
  const canModify = approvalStatus === 'draft' || approvalStatus === 'rejected';

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(period.id);
      enqueueSnackbar('Đã xoá kỳ thi', { variant: 'success' });
      navigate('/admin/periods');
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
    setDeleteOpen(false);
  };

  const periodDepts = departments.filter(d => (period.department_ids || []).includes(d.id));

  return (
    <Box sx={{ p: 0 }}>
      <PageHeader
        title="Chi tiết kỳ thi"
        subtitle={period.name}
        action={
          <Stack direction="row" spacing={1}>

            <Tooltip title={canModify ? "" : "Chỉ được sửa khi ở trạng thái Nháp hoặc Bị từ chối"}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => navigate(`/admin/periods/${period.id}/edit`)}
                  disabled={!canModify}
                  sx={{ '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'auto' } }}
                >
                  Sửa
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={canModify ? "" : "Chỉ được gửi duyệt khi ở trạng thái Nháp hoặc Bị từ chối"}>
              <span>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Send />}
                  onClick={() => setSubmitOpen(true)}
                  disabled={!canModify}
                  sx={{ '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'auto' } }}
                >
                  Gửi duyệt
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={canModify ? "" : "Chỉ được xóa khi ở trạng thái Nháp hoặc Bị từ chối"}>
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setDeleteOpen(true)}
                  disabled={!canModify}
                  sx={{ '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'auto' } }}
                >
                  Xóa
                </Button>
              </span>
            </Tooltip>
          </Stack>
        }
      />

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mt: 3 }}>
        {/* Cột trái: Thông tin chính */}
        <Box sx={{ flex: 2 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description fontSize="small" color="primary" /> Thông tin cơ bản
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Tên kỳ thi</Typography>
                    <Typography variant="body1" fontWeight={500}>{period.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Loại thi</Typography>
                    <Typography variant="body1">{examTypeLabels[period.exam_type] || period.exam_type}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Trạng thái vận hành</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip size="small" label={unifiedStatus.label} color={unifiedStatus.color} />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Mô tả</Typography>
                  <Typography variant="body2">{period.description || '(Không có mô tả)'}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday fontSize="small" color="primary" /> Thời gian diễn ra
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Ngày bắt đầu</Typography>
                    <Typography variant="h6" color="primary.main">
                      {dayjs(period.start_date).format('HH:mm - DD/MM/YYYY')}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Ngày kết thúc</Typography>
                    <Typography variant="h6" color="error.main">
                      {dayjs(period.end_date).format('HH:mm - DD/MM/YYYY')}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Cột phải: Phạm vi */}
        <Box sx={{ flex: 1 }}>
          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business fontSize="small" color="primary" /> Phạm vi phòng ban
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {period.department_ids?.length === 0 ? (
                    <Chip label="Tất cả phòng ban" variant="outlined" color="primary" />
                  ) : (
                    periodDepts.map(d => (
                      <Chip key={d.id} label={`${d.code} - ${d.name}`} size="small" />
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Work fontSize="small" color="primary" /> Đối tượng nghề
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {period.target_occupations?.length === 0 ? (
                    <Chip label="Tất cả nghề" variant="outlined" />
                  ) : (
                    period.target_occupations?.map(occ => (
                      <Chip key={occ} label={occ} size="small" variant="outlined" />
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Grade fontSize="small" color="primary" /> Bậc tay nghề
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {period.target_skill_levels?.length === 0 ? (
                    <Chip label="Tất cả bậc" variant="outlined" />
                  ) : (
                    period.target_skill_levels?.map(lvl => (
                      <Chip key={lvl} label={`Bậc ${lvl}`} size="small" color="info" />
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        title="Xoá kỳ thi"
        message="Bạn có chắc chắn muốn xoá kỳ thi này? Không thể xoá nếu đã có phòng thi bên trong."
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <SubmitForReviewDialog
        open={submitOpen}
        type="exam_period"
        itemId={period.id}
        title="Gửi yêu cầu duyệt kỳ thi"
        onClose={() => setSubmitOpen(false)}
        onSubmitted={() => {
          enqueueSnackbar('Đã gửi yêu cầu duyệt', { variant: 'success' });
          refetch();
        }}
      />
    </Box>
  );
}
