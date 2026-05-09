import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Send, Delete, Download, Visibility,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import DocumentAssignmentCard from '@/components/common/DocumentAssignmentCard';
import StatusChip from '@/components/common/StatusChip';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SubmitForReviewDialog from '@/components/common/SubmitForReviewDialog';
import { documentApi, type DocumentResponse } from '@/api/documentApi';
import { formatDateTime } from '@/utils/formatters';
import { trainingGroupLabels } from '@/utils/vietnameseLabels';
import RichTextEditor from '@/components/common/RichTextEditor';

const docTypeLabels: Record<string, string> = {
  company_internal: 'Nội bộ công ty',
  safety_procedure: 'Quy trình an toàn',
  legal_document: 'Văn bản pháp luật',
  question_bank: 'Ngân hàng câu hỏi',
};

export default function DocumentDetailPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const { data: doc, isLoading, error } = useQuery<DocumentResponse>({
    queryKey: ['document', docId],
    queryFn: () => documentApi.get(docId || ''),
    enabled: !!docId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentApi.delete(docId || ''),
    onSuccess: () => {
      enqueueSnackbar('Đã xoá tài liệu', { variant: 'success' });
      navigate('/admin/documents');
    },
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleSaveEdit = async () => {
    try {
      await documentApi.update(docId || '', { title: editTitle, description: editDesc });
      qc.invalidateQueries({ queryKey: ['document', docId] });
      enqueueSnackbar('Đã cập nhật tài liệu', { variant: 'success' });
      setEditing(false);
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  };



  if (isLoading) return <LoadingOverlay />;
  if (error || !doc) {
    return (
      <Alert severity="error" action={<Button onClick={() => navigate('/admin/documents')}>Quay lại</Button>}>
        Không thể tải thông tin tài liệu.
      </Alert>
    );
  }

  const canSubmitForReview = doc.status === 'draft' || doc.status === 'rejected';
  const isPdf = doc.file_name?.toLowerCase().endsWith('.pdf');

  return (
    <>
      <PageHeader title={doc.title} />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>

        {isPdf && (
          <Button
            variant={showPreview ? 'contained' : 'outlined'}
            startIcon={<Visibility />}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Ẩn xem trước' : 'Xem trước PDF'}
          </Button>
        )}
        <Button variant="outlined" startIcon={<Download />} href={documentApi.downloadUrl(doc.id)} target="_blank">
          Tải file gốc
        </Button>
        {canSubmitForReview && (
          <Button variant="contained" startIcon={<Send />} onClick={() => setShowSubmitDialog(true)}>
            Gửi yêu cầu duyệt
          </Button>
        )}
        <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setShowDeleteDialog(true)}>
          Xoá
        </Button>
      </Box>

      {/* Assignment to departments */}
      <DocumentAssignmentCard
        documentId={doc.id}
        initialDepartmentIds={doc.assigned_department_ids || []}
      />

      {/* PDF Preview */}
      {showPreview && isPdf && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <Box
              component="iframe"
              src={`${documentApi.previewUrl(doc.id)}#toolbar=1&navpanes=1`}
              sx={{
                width: '100%',
                height: { xs: 500, md: 750 },
                border: 'none',
                display: 'block',
              }}
              title={`Xem trước: ${doc.title}`}
            />
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
              <Box sx={{ mt: 0.5 }}><StatusChip status={doc.status} size="medium" /></Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Loại tài liệu</Typography>
              <Typography fontWeight={500}>{docTypeLabels[doc.document_type] || doc.document_type}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">File</Typography>
              <Typography fontWeight={500}>{doc.file_name}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
              <Typography fontWeight={500}>{formatDateTime(doc.created_at)}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2.5}>
            {doc.page_count != null && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">Số trang</Typography>
                <Typography variant="h6" fontWeight={700}>{doc.page_count}</Typography>
              </Grid>
            )}
            {doc.total_chars != null && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">Tổng ký tự</Typography>
                <Typography variant="h6" fontWeight={700}>{doc.total_chars.toLocaleString()}</Typography>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">Người tải lên</Typography>
              <Typography fontWeight={500}>{doc.uploaded_by}</Typography>
            </Grid>
          </Grid>

          {doc.description && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">Mô tả</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{doc.description}</Typography>
            </>
          )}

          {doc.occupations?.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">Nghề áp dụng</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {doc.occupations.map((o) => <Chip key={o} label={o} size="small" variant="outlined" />)}
              </Stack>
            </>
          )}

          {doc.skill_levels?.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">Bậc thợ</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {doc.skill_levels.map((s) => <Chip key={s} label={`Bậc ${s}`} size="small" variant="outlined" />)}
              </Stack>
            </Box>
          )}

          {doc.training_groups?.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">Nhóm huấn luyện</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {doc.training_groups.map((g) => (
                  <Chip key={g} label={trainingGroupLabels[g as keyof typeof trainingGroupLabels] || g} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editing} onClose={() => setEditing(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chỉnh sửa tài liệu</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Tên tài liệu" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} sx={{ mb: 2, mt: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Mô tả
          </Typography>
          <RichTextEditor
            value={editDesc}
            onChange={setEditDesc}
            placeholder="Nhập mô tả tài liệu..."
            minHeight={150}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditing(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <SubmitForReviewDialog
        open={showSubmitDialog}
        type="document"
        itemId={docId || ''}
        title="Gửi yêu cầu duyệt tài liệu"
        onClose={() => setShowSubmitDialog(false)}
        onSubmitted={() => {
          enqueueSnackbar('Đã gửi yêu cầu duyệt', { variant: 'success' });
          qc.invalidateQueries({ queryKey: ['document', docId] });
          qc.invalidateQueries({ queryKey: ['documents'] });
        }}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Xoá tài liệu"
        message="Bạn có chắc chắn muốn xoá tài liệu này? File gốc cũng sẽ bị xoá."
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={() => { deleteMutation.mutate(); setShowDeleteDialog(false); }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}