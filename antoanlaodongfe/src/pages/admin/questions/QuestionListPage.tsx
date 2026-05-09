import { useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, Box, TextField, MenuItem, Pagination,
  Skeleton, IconButton, Tooltip, Stack, Chip, Checkbox, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, AlertTitle,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { Delete, Send, Visibility, FileUpload, FileDownload, ExpandMore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { questionApi, type QuestionResponse } from '@/api/questionApi';
import { approvalApi } from '@/api/approvalApi';
import { userApi } from '@/api/userApi';
import type { QuestionType, DifficultyLevel, ApprovalStatus } from '@/types/enums';
import {
  questionTypeLabels, difficultyLabels, approvalStatusLabels, trainingGroupLabels
} from '@/utils/vietnameseLabels';
import { occupationApi } from '@/api/catalogApi';


const qtOptions = [{ value: '', label: 'Tất cả loại' }, ...Object.entries(questionTypeLabels).map(([v, l]) => ({ value: v, label: l }))];
const diffOptions = [{ value: '', label: 'Tất cả mức độ' }, ...Object.entries(difficultyLabels).map(([v, l]) => ({ value: v, label: l }))];
const statusOptions = [{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(approvalStatusLabels).map(([v, l]) => ({ value: v, label: l }))];
const groupOptions = [{ value: '', label: 'Tất cả nhóm' }, ...Object.entries(trainingGroupLabels).map(([v, l]) => ({ value: v, label: l }))];
const levelOptions = [{ value: '', label: 'Tất cả bậc' }, ...[1, 2, 3, 4, 5, 6, 7].map(l => ({ value: String(l), label: `Bậc ${l}` }))];

const difficultyColors: Record<string, 'success' | 'warning' | 'error'> = { easy: 'success', medium: 'warning', hard: 'error' };

// --- Sub-component for an Occupation Group ---
function OccupationQuestionSection({
  occName,
  filters,
  onDelete,
  onNavigate,
  selected,
  toggleSelect,

}: {
  occName: string;
  filters: any;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  bulkApprove: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // 1. Fetch count
  const { data: countData } = useQuery({
    queryKey: ['questions-count', occName, filters],
    queryFn: () => questionApi.list({ ...filters, occupation: occName, page_size: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: approvedCountData } = useQuery({
    queryKey: ['questions-approved-count', occName, { ...filters, status: 'approved' }],
    queryFn: () => questionApi.list({ ...filters, occupation: occName, status: 'approved' as any, page_size: 1 }),
    staleTime: 5 * 60 * 1000,
    enabled: !filters.status, // Only fetch approved total if no status filter is active
  });

  // 2. Fetch full list (lazy loaded)
  const { data: fullData, isLoading } = useQuery({
    queryKey: ['questions-full', occName, filters],
    queryFn: () => questionApi.list({ ...filters, occupation: occName, page_size: 100 }),
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  });

  const count = countData?.total || 0;
  const items = fullData?.items || [];

  const skillGroups = useMemo(() => {
    const groups: Record<number, QuestionResponse[]> = {};
    items.forEach(q => {
      if (!groups[q.skill_level]) groups[q.skill_level] = [];
      groups[q.skill_level].push(q);
    });
    return groups;
  }, [items]);

  if (count === 0 && !filters.search) return null;



  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{ mb: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none', '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50', borderBottom: expanded ? '1px solid' : 'none', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.dark">{occName}</Typography>
        <Chip 
          label={filters.status 
            ? `${count} câu ${approvalStatusLabels[filters.status as keyof typeof approvalStatusLabels] || ''}` 
            : `${approvedCountData?.total || 0}/${count} đã duyệt`
          } 
          size="small" 
          sx={{ ml: 2, fontWeight: 600 }} 
          color="primary" 
          variant="outlined" 
        />
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2 }}>
        {isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={100} />
          </Stack>
        ) : items.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Không có câu hỏi nào.</Typography>
        ) : (
          Object.entries(skillGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([level, questions]) => (
            <Accordion key={level} defaultExpanded sx={{ mb: 1, boxShadow: 'none', border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 48, '&.Mui-expanded': { minHeight: 48 }, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" fontWeight={700}>Bậc {level}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>({questions.length} câu hỏi)</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={questions.every(q => selected.has(q.id))}
                            indeterminate={questions.some(q => selected.has(q.id)) && !questions.every(q => selected.has(q.id))}
                            onChange={() => {
                              const allSel = questions.every(q => selected.has(q.id));
                              questions.forEach(q => {
                                if (allSel && selected.has(q.id)) toggleSelect(q.id);
                                else if (!allSel && !selected.has(q.id)) toggleSelect(q.id);
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Nội dung câu hỏi</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Mức độ</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, width: 100 }}>Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {questions.map((q) => (
                        <TableRow key={q.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }} selected={selected.has(q.id)}>
                          <TableCell padding="checkbox">
                            <Checkbox size="small" checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {q.content}
                            </Typography>
                          </TableCell>
                          <TableCell><Chip label={questionTypeLabels[q.question_type]} size="small" variant="outlined" /></TableCell>
                          <TableCell><Chip label={difficultyLabels[q.difficulty]} size="small" color={difficultyColors[q.difficulty]} /></TableCell>
                          <TableCell align="center"><StatusChip status={q.status} /></TableCell>
                          <TableCell align="center">
                            <Tooltip title="Xem chi tiết"><IconButton size="small" color="primary" onClick={() => onNavigate(q.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Xoá"><IconButton size="small" color="error" onClick={() => onDelete(q.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function QuestionListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitRequestedTo, setSubmitRequestedTo] = useState('');

  const { data: managers } = useQuery({
    queryKey: ['users', 'managers'],
    queryFn: () => userApi.managers(),
  });

  const [qType, setQType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 20;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 1. Fetch reference data
  const { data: topicTags } = useQuery({
    queryKey: ['topic-tags'],
    queryFn: () => questionApi.getTopicTags(),
  });

  const { data: occupationsData, isLoading: loadingOccs } = useQuery({
    queryKey: ['occupations', 'all'],
    queryFn: () => occupationApi.list(false),
  });

  const topicOptions = [{ value: '', label: 'Tất cả chủ đề' }, ...(topicTags || []).map(t => ({ value: t, label: t }))];
  // 2. Logic: Pagination by Occupation
  const finalFilteredOccs = useMemo(() => {
    if (!occupationsData) return [];
    let list = occupationsData.map(o => o.name);
    // filter occupations list if occupation filter is active
    if (level) {
      // If a level is picked, we might want to only show occupations that support that level,
      // but let's keep it simple: filter by occupation name if specified
    }
    if (qType || difficulty || status || group || topic || level) {
      // In this mode, we show all occupations, but sub-sections might hide if count is 0
    }
    return list.sort();
  }, [occupationsData, level]);

  const totalPages = Math.ceil(finalFilteredOccs.length / pageSize);
  const pagedOccs = finalFilteredOccs.slice((page - 1) * pageSize, page * pageSize);

  const filters = useMemo(() => ({
    question_type: (qType || undefined) as QuestionType | undefined,
    difficulty: (difficulty || undefined) as DifficultyLevel | undefined,
    status: (status || undefined) as ApprovalStatus | undefined,
    training_group: group || undefined,
    topic_tag: topic || undefined,
    skill_level: level ? Number(level) : undefined,
  }), [qType, difficulty, status, group, topic, level]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions-count'] });
      qc.invalidateQueries({ queryKey: ['questions-full'] });
      enqueueSnackbar('Đã xoá câu hỏi', { variant: 'success' });
    },
  });

  const bulkSubmitMutation = useMutation({
    mutationFn: async ({ ids, requestedTo }: { ids: string[]; requestedTo: string }) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          approvalApi.submitForReview('question', id, { requested_to: requestedTo || null })
        )
      );
      return {
        ok: results.filter((r) => r.status === 'fulfilled').length,
        fail: results.filter((r) => r.status === 'rejected').length,
      };
    },
    onSuccess: ({ ok, fail }) => {
      qc.invalidateQueries({ queryKey: ['questions-count'] });
      qc.invalidateQueries({ queryKey: ['questions-full'] });
      enqueueSnackbar(
        fail > 0
          ? `Gửi yêu cầu duyệt: ${ok} câu thành công, ${fail} thất bại`
          : `Đã gửi yêu cầu duyệt ${ok} câu hỏi`,
        { variant: fail > 0 ? 'warning' : 'success' },
      );
      setSelected(new Set());
      setSubmitDialogOpen(false);
      setSubmitRequestedTo('');
    },
    onError: (err: Error) => enqueueSnackbar(`Lỗi: ${err.message}`, { variant: 'error' }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => questionApi.importXlsx(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['questions-count'] });
      setImportResult(res);
      enqueueSnackbar(`Đã nhập ${res.created} câu hỏi (${res.skipped} bị bỏ qua)`, { variant: 'success' });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await questionApi.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-nhap-cau-hoi.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };



  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Ngân hàng câu hỏi"
        subtitle="Quản lý và duyệt câu hỏi thi"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined" startIcon={<FileDownload />}
              onClick={handleDownloadTemplate}
            >
              Tải template
            </Button>
            <Button
              variant="outlined" startIcon={<FileUpload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              Nhập từ Excel
            </Button>
            {selected.size > 0 && (
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => setSubmitDialogOpen(true)}
                disabled={bulkSubmitMutation.isPending}
              >
                Gửi yêu cầu duyệt {selected.size} câu hỏi
              </Button>
            )}
          </Stack>
        }
      />
      <input
        type="file" accept=".xlsx,.xlsm" hidden ref={fileInputRef}
        onChange={handleFileChange}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <TextField select size="small" label="Loại" value={qType} onChange={handleFilterChange(setQType)} sx={{ minWidth: 140, flexGrow: 1 }}>
          {qtOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Mức độ" value={difficulty} onChange={handleFilterChange(setDifficulty)} sx={{ minWidth: 130, flexGrow: 1 }}>
          {diffOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Trạng thái" value={status} onChange={handleFilterChange(setStatus)} sx={{ minWidth: 140, flexGrow: 1 }}>
          {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Nhóm huấn luyện" value={group} onChange={handleFilterChange(setGroup)} sx={{ minWidth: 180, flexGrow: 1 }}>
          {groupOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Chủ đề" value={topic} onChange={handleFilterChange(setTopic)} sx={{ minWidth: 160, flexGrow: 1 }}>
          {topicOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Bậc" value={level} onChange={handleFilterChange(setLevel)} sx={{ minWidth: 120, flexGrow: 1 }}>
          {levelOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Box>

      {loadingOccs ? (
        <Paper variant="outlined">{Array.from({ length: 5 }).map((_, i) => <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>)}</Paper>
      ) : finalFilteredOccs.length === 0 ? (
        <EmptyState message="Không tìm thấy ngành nghề nào." />
      ) : (
        <>
          {pagedOccs.map(occName => (
            <OccupationQuestionSection
              key={occName}
              occName={occName}
              filters={filters}
              onDelete={setDeleteId}
              onNavigate={(id) => navigate(`/admin/questions/${id}`)}
              selected={selected}
              toggleSelect={toggleSelect}
              bulkApprove={() => { /* removed: approval moved to Hộp duyệt */ }}
            />
          ))}

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}

      <ConfirmDialog open={!!deleteId} title="Xoá câu hỏi" message="Xoá câu hỏi này?" confirmText="Xoá" confirmColor="error" onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />

      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Gửi yêu cầu duyệt {selected.size} câu hỏi</DialogTitle>
        <DialogContent>
          <TextField
            select fullWidth required sx={{ mt: 1 }}
            label="Cán bộ quản lý duyệt"
            value={submitRequestedTo}
            onChange={(e) => setSubmitRequestedTo(e.target.value)}
          >
            {(managers || []).map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.full_name} ({m.employee_id})</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={!submitRequestedTo || bulkSubmitMutation.isPending}
            onClick={() => bulkSubmitMutation.mutate({ ids: Array.from(selected), requestedTo: submitRequestedTo })}
          >
            Gửi yêu cầu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!importResult} onClose={() => setImportResult(null)} fullWidth maxWidth="sm">
        <DialogTitle>Kết quả nhập câu hỏi</DialogTitle>
        <DialogContent>
          {importResult && (
            <>
              <Alert severity={importResult.created > 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                <AlertTitle>
                  Thành công: {importResult.created} · Bị bỏ qua: {importResult.skipped}
                </AlertTitle>
              </Alert>
              {importResult.errors.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Chi tiết lỗi:</Typography>
                  <Box sx={{ maxHeight: 240, overflow: 'auto', bgcolor: 'grey.100', p: 1.5, borderRadius: 1 }}>
                    {importResult.errors.map((err, i) => (
                      <Typography key={i} variant="caption" component="div">{err}</Typography>
                    ))}
                  </Box>
                </>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Cột bắt buộc: <code>content</code>, <code>question_type</code>, <code>occupation</code>,{' '}
                <code>skill_level</code>, <code>training_group</code>. Với MCQ cần thêm{' '}
                <code>option_a..d</code> + <code>correct_label</code>.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportResult(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
