import { useState } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Send } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import { useExamTemplates } from '@/hooks/useExamTemplates';
import { useExamGenerate } from '@/hooks/useExamGenerate';
import { useExamPeriods } from '@/hooks/useExamPeriods';
import { useAuth } from '@/contexts/AuthContext';
import type { ExamMode, ExamKind } from '@/types/enums';

export default function ExamGeneratePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const { data: templateData } = useExamTemplates({ status: 'approved', page: 1, page_size: 100 });
  const { data: periodData } = useExamPeriods({ page: 1, page_size: 100 });
  const generateMutation = useExamGenerate();

  const [form, setForm] = useState({
    template_id: searchParams.get('templateId') || '',
    name: '',
    exam_mode: 'online' as ExamMode,
    exam_kind: 'official' as ExamKind,
    exam_period_id: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // 1. Kiểm tra điều kiện đầu vào chặt chẽ hơn
    if (!form.template_id || !form.name) {
      enqueueSnackbar('Vui lòng điền Tên đề thi và Mẫu đề thi', { variant: 'warning' });
      return;
    }

    if (form.exam_kind === 'official' && !form.exam_period_id) {
      enqueueSnackbar('Thi chính thức bắt buộc phải gắn với một Kỳ thi', { variant: 'warning' });
      return;
    }

    // 2. Chuyển đổi dữ liệu cho đúng định dạng Backend cần
    // Nếu là trial, bắt buộc truyền null cho exam_period_id để tránh lỗi khoá ngoại
    const payloadPeriodId = form.exam_kind === 'official' && form.exam_period_id ? form.exam_period_id : null;

    try {
      await generateMutation.mutateAsync({
        template_id: form.template_id,
        name: form.name,
        exam_mode: form.exam_mode,
        exam_kind: form.exam_kind,
        exam_period_id: payloadPeriodId,
        scheduled_date: null,
        created_by: user?.id || '',
      });

      enqueueSnackbar(
        'Tạo đề thi thành công ở trạng thái Nháp. Hãy gửi yêu cầu duyệt để chuyển sang Chính thức.',
        { variant: 'success' },
      );
      navigate('/admin/exams');
    } catch (err: any) {
      // Bóc tách lỗi từ Backend
      const detail = err?.response?.data?.detail || err?.message || 'Lỗi hệ thống';
      enqueueSnackbar(`Lỗi tạo đề thi: ${detail}`, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHeader title="Tạo đề thi từ mẫu" subtitle="AI sẽ tự động chọn câu hỏi phù hợp" />

      <Card sx={{ maxWidth: 700 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                select fullWidth label="Chọn mẫu đề thi" required
                value={form.template_id}
                onChange={(e) => updateField('template_id', e.target.value)}
                helperText="Chỉ hiện các mẫu đã được phê duyệt"
              >
                {templateData?.items.map((tpl) => (
                  <MenuItem key={tpl.id} value={tpl.id}>
                    {tpl.name} — {tpl.occupation} (Bậc {tpl.skill_level})
                  </MenuItem>
                )) || <MenuItem disabled>Đang tải...</MenuItem>}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth label="Tên đề thi" required
                placeholder="vd: Đề thi ATVSLĐ Q1-2026 - Đợt 1"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormLabel component="legend">Hình thức thi</FormLabel>
              <RadioGroup row value={form.exam_mode} onChange={(e) => updateField('exam_mode', e.target.value)}>
                <FormControlLabel value="online" control={<Radio />} label="Trực tuyến" />
                <FormControlLabel value="onsite" control={<Radio />} label="Trực tiếp" />
              </RadioGroup>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormLabel component="legend">Loại kỳ thi</FormLabel>
              <RadioGroup row value={form.exam_kind} onChange={(e) => {
                const val = e.target.value;
                updateField('exam_kind', val);
                // Nếu người dùng đổi sang Thi thử, tự động xoá exam_period_id ở Form
                if (val === 'trial') {
                  updateField('exam_period_id', '');
                }
              }}>
                <FormControlLabel value="trial" control={<Radio />} label="Thi thử" />
                <FormControlLabel value="official" control={<Radio />} label="Thi chính thức" />
              </RadioGroup>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                select fullWidth label="Chọn kỳ thi" required={form.exam_kind === 'official'}
                value={form.exam_period_id}
                onChange={(e) => updateField('exam_period_id', e.target.value)}
                helperText="Dữ liệu lấy từ Quản lý kỳ thi"
                disabled={form.exam_kind === 'trial'}
              >
                <MenuItem value=""><em>-- Không chọn --</em></MenuItem>
                {periodData?.items.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()})
                  </MenuItem>
                )) || <MenuItem disabled>Đang tải...</MenuItem>}
              </TextField>
            </Grid>
          </Grid>

          {generateMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(generateMutation.error as any)?.response?.data?.detail
                || (generateMutation.error instanceof Error ? generateMutation.error.message : 'Có lỗi xảy ra')}
            </Alert>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            Đề thi mới sẽ ở trạng thái <b>Nháp</b>. Sau khi tạo, nhấn <b>Gửi yêu cầu duyệt</b> ở trang
            "Quản lý đề thi" và đợi Cán bộ quản lý duyệt trong Hộp duyệt.
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/admin/exams')}>Hủy</Button>
            <Button
              variant="contained"
              startIcon={generateMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <Send />}
              onClick={handleSubmit}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'AI đang xử lý...' : 'Tạo đề thi'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </>
  );
}