import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Chip, Stack, Typography, Button, Tabs, Tab, IconButton,
  Tooltip, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  List, ListItem, ListItemText, Divider, Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle, Cancel, OpenInNew, Description, School, Assignment, QuestionAnswer, MeetingRoom,
  Edit as EditExamIcon, Event, Chat as ChatIcon, Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { approvalApi, type PendingType, type PendingItem } from '@/api/approvalApi';

const TYPE_LABEL: Record<PendingType, string> = {
  document: 'Tài liệu',
  course: 'Khoá học',
  exam_template: 'Mẫu đề thi',
  question: 'Câu hỏi',
  exam_period: 'Kỳ thi',
  exam_room: 'Phòng thi',
  exam: 'Đề thi',
};

const TYPE_ICON: Record<PendingType, React.ReactNode> = {
  document: <Description fontSize="small" />,
  course: <School fontSize="small" />,
  exam_template: <Assignment fontSize="small" />,
  question: <QuestionAnswer fontSize="small" />,
  exam_period: <Event fontSize="small" />,
  exam_room: <MeetingRoom fontSize="small" />,
  exam: <EditExamIcon fontSize="small" />,
};

const TYPE_LINK: Record<PendingType, (id: string) => string> = {
  document: (id) => `/admin/documents/${id}`,
  course: (id) => `/admin/courses/${id}`,
  exam_template: (id) => `/admin/templates/${id}`,
  question: (id) => `/admin/questions/${id}`,
  exam_period: (id) => `/admin/periods/${id}`,
  exam_room: (id) => `/admin/rooms/${id}`,
  exam: (id) => `/admin/exams/${id}`,
};

const TABS: Array<{ value: PendingType | ''; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'document', label: 'Tài liệu' },
  { value: 'course', label: 'Khoá học' },
  { value: 'exam_template', label: 'Mẫu đề thi' },
  { value: 'question', label: 'Câu hỏi' },
  { value: 'exam_period', label: 'Kỳ thi' },
  { value: 'exam_room', label: 'Phòng thi' },
  { value: 'exam', label: 'Đề thi' },
];

export default function ApprovalInboxPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [tab, setTab] = useState<PendingType | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['approval-inbox', tab],
    queryFn: () => approvalApi.inbox(tab || undefined),
  });

  const [reviewing, setReviewing] = useState<{ item: PendingItem; action: 'approve' | 'reject' } | null>(null);
  const [notes, setNotes] = useState('');
  
  // Comments state
  const [commentItem, setCommentItem] = useState<PendingItem | null>(null);
  const [commentText, setCommentText] = useState('');

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ['approval-comments', commentItem?.type, commentItem?.id],
    queryFn: () => approvalApi.getComments(commentItem!.type, commentItem!.id),
    enabled: !!commentItem,
  });

  const commentMutation = useMutation({
    mutationFn: ({ type, id, content }: { type: PendingType, id: string, content: string }) => 
      approvalApi.addComment(type, id, content),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['approval-comments', commentItem?.type, commentItem?.id] });
    },
    onError: (e: any) => enqueueSnackbar(e?.message || 'Có lỗi khi gửi ý kiến', { variant: 'error' }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ type, id, action, reviewNotes }: { type: PendingType; id: string; action: 'approve' | 'reject'; reviewNotes?: string }) =>
      action === 'approve'
        ? approvalApi.approve(type, id, reviewNotes)
        : approvalApi.reject(type, id, reviewNotes),
    onSuccess: (_data, vars) => {
      enqueueSnackbar(
        vars.action === 'approve' ? 'Đã phê duyệt' : 'Đã từ chối',
        { variant: 'success' },
      );
      qc.invalidateQueries({ queryKey: ['approval-inbox'] });
      setReviewing(null);
      setNotes('');
    },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.detail || e.message, { variant: 'error' }),
  });

  const handleSubmit = () => {
    if (!reviewing) return;
    reviewMutation.mutate({
      type: reviewing.item.type,
      id: reviewing.item.id,
      action: reviewing.action,
      reviewNotes: notes || undefined,
    });
  };

  const handleSendComment = () => {
    if (!commentItem || !commentText.trim()) return;
    commentMutation.mutate({
      type: commentItem.type,
      id: commentItem.id,
      content: commentText.trim(),
    });
  };

  const canApproveItem = (item: PendingItem) => {
    if (user?.role === 'admin') return true;
    if (user?.role !== 'manager') return false;
    if (item.requested_to) {
      return item.requested_to === user?.id;
    }
    return true; // if no specific reviewer, any manager in the allowed dept can approve
  };

  return (
    <>
      <PageHeader
        title="Hộp duyệt"
        subtitle="Toàn bộ tài liệu, câu hỏi, mẫu đề, kỳ thi, đề thi và phòng thi chờ phê duyệt"
      />
      
      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(['document', 'course', 'exam_template', 'question', 'exam_period', 'exam_room', 'exam'] as PendingType[]).map((t) => (
          <Grid key={t} size={{ xs: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  {TYPE_ICON[t]}
                  <Typography variant="caption" color="text.secondary">{TYPE_LABEL[t]}</Typography>
                </Stack>
                <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                  {data?.by_type?.[t] ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {TABS.map((t) => (
          <Tab key={t.value || 'all'} value={t.value} label={t.label} />
        ))}
      </Tabs>

      {isLoading ? (
        <Paper sx={{ p: 3 }}><Typography>Đang tải...</Typography></Paper>
      ) : !data?.items.length ? (
        <EmptyState
          message="Hộp duyệt trống — không có gì cần xử lý"
        />
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {data.items.map((item, i) => (
              <Box key={`${item.type}-${item.id}`}>
                {i > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Mở chi tiết">
                        <IconButton size="small" onClick={() => navigate(TYPE_LINK[item.type](item.id))}>
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ý kiến / Bình luận">
                        <IconButton size="small" color="primary" onClick={() => setCommentItem(item)}>
                          <ChatIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canApproveItem(item) && (
                        <>
                          <Tooltip title="Phê duyệt">
                            <IconButton
                              size="small" color="success"
                              onClick={() => { setReviewing({ item, action: 'approve' }); setNotes(''); }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Từ chối">
                            <IconButton
                              size="small" color="error"
                              onClick={() => { setReviewing({ item, action: 'reject' }); setNotes(''); }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small" icon={TYPE_ICON[item.type] as React.ReactElement}
                          label={TYPE_LABEL[item.type]} variant="outlined"
                        />
                        <Typography variant="body1" fontWeight={500}>
                          {item.title}
                        </Typography>
                        {item.requested_to && item.requested_to !== user?.id && (
                          <Chip size="small" label="Chỉ xem" color="default" variant="filled" />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                        {item.occupation && (
                          <Typography variant="caption" color="text.secondary">
                            {item.occupation}{item.skill_level !== null ? ` · Bậc ${item.skill_level}` : ''}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Tạo lúc: {dayjs(item.created_at).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewing} onClose={() => setReviewing(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {reviewing?.action === 'approve' ? 'Phê duyệt' : 'Từ chối'}: {reviewing?.item.title}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline minRows={3}
            label={reviewing?.action === 'approve' ? 'Ghi chú phê duyệt (tuỳ chọn)' : 'Lý do từ chối'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewing(null)}>Hủy</Button>
          <Button
            variant="contained"
            color={reviewing?.action === 'approve' ? 'success' : 'error'}
            onClick={handleSubmit}
            disabled={reviewMutation.isPending || (reviewing?.action === 'reject' && !notes.trim())}
            startIcon={reviewing?.action === 'approve' ? <CheckCircle /> : <Cancel />}
          >
            {reviewing?.action === 'approve' ? 'Phê duyệt' : 'Từ chối'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={!!commentItem} onClose={() => setCommentItem(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          Ý kiến trao đổi: {commentItem?.title}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, minHeight: 300, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {loadingComments ? (
              <Typography align="center" color="text.secondary">Đang tải...</Typography>
            ) : comments?.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ mt: 2 }}>Chưa có ý kiến nào.</Typography>
            ) : (
              <Stack spacing={2}>
                {comments?.map((c) => (
                  <Box key={c.id} sx={{ display: 'flex', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: c.user_id === user?.id ? 'primary.main' : 'grey.400' }}>
                      {c.user_name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2">{c.user_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(c.created_at).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                      </Stack>
                      <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: c.user_id === user?.id ? 'primary.50' : 'grey.50' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.content}</Typography>
                      </Paper>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
          <Box sx={{ p: 2, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth size="small"
                placeholder="Nhập ý kiến của bạn..."
                multiline maxRows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={commentMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
              />
              <IconButton 
                color="primary" 
                onClick={handleSendComment} 
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
