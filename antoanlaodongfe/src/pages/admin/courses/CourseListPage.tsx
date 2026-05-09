import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, Box, TextField, MenuItem, Pagination,
  Skeleton, IconButton, Tooltip, Stack, Chip, InputAdornment, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { Visibility, Delete, CalendarToday, Article, ExpandMore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { courseApi, type CourseListResponse } from '@/api/courseApi';
import { occupationApi } from '@/api/catalogApi';
import { documentApi, type DocumentResponse } from '@/api/documentApi';
import type { Occupation } from '@/api/catalogApi';
import type { ApprovalStatus, TrainingGroup } from '@/types/enums';
import { approvalStatusLabels, trainingGroupLabels } from '@/utils/vietnameseLabels';

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(approvalStatusLabels).map(([v, l]) => ({ value: v, label: l })),
];

const groupOptions = [
  { value: '', label: 'Tất cả nhóm' },
  ...Object.entries(trainingGroupLabels).map(([v, l]) => ({ value: v, label: l })),
];

const years = ['', '2024', '2025', '2026'];
const months = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// --- Sub-component for an Occupation Group ---
// --- Sub-component for an Occupation Group ---
function OccupationCourseSection({
  occName,
  filters,
  clientFilters,
  docMap,
  onDelete,
  onNavigate
}: {
  occName: string;
  filters: any;
  clientFilters: any;
  docMap: Record<string, DocumentResponse>;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const hasClientFilters = Boolean(
    clientFilters.search ||
    clientFilters.year ||
    clientFilters.month ||
    clientFilters.source_document_id
  );

  const [expanded, setExpanded] = useState(true);

  const shouldFetchFull = expanded || hasClientFilters;

  const { data: countData } = useQuery({
    queryKey: ['courses-count', occName, filters],
    queryFn: () => courseApi.list({ ...filters, occupation: occName, page_size: 1 }),
    staleTime: 5 * 60 * 1000,
    enabled: !shouldFetchFull,
  });

  const { data: fullData, isLoading } = useQuery({
    queryKey: ['courses-full', occName, filters],
    queryFn: () => courseApi.list({ ...filters, occupation: occName, page_size: 100 }),
    enabled: shouldFetchFull,
    staleTime: 5 * 60 * 1000,
  });

  const items = fullData?.items || [];

  // CLIENT-SIDE FILTERING: Ép buộc lọc lại kết quả từ BE để đảm bảo tính chính xác
  const filteredItems = useMemo(() => {
    let res = items;
    if (clientFilters.search) {
      const q = clientFilters.search.toLowerCase();
      res = res.filter(c => c.title.toLowerCase().includes(q));
    }
    if (clientFilters.source_document_id) {
      res = res.filter(c => c.source_document_ids?.includes(clientFilters.source_document_id));
    }
    if (clientFilters.year) {
      res = res.filter(c => new Date(c.created_at).getFullYear().toString() === clientFilters.year);
    }
    if (clientFilters.month) {
      res = res.filter(c => (new Date(c.created_at).getMonth() + 1).toString() === clientFilters.month);
    }
    return res;
  }, [items, clientFilters]);

  // ==========================================
  // FIX LỖI HOOK TẠI ĐÂY: Dời useMemo lên trên các lệnh return sớm
  // ==========================================
  const skillGroups = useMemo(() => {
    const groups: Record<number, CourseListResponse[]> = {};
    filteredItems.forEach(c => {
      if (!groups[c.skill_level]) groups[c.skill_level] = [];
      groups[c.skill_level].push(c);
    });
    return groups;
  }, [filteredItems]);

  // Sau khi gọi TẤT CẢ các hook xong, ta mới được dùng return (early return)
  if (!shouldFetchFull) {
    if (countData?.total === 0) return null;
  } else {
    if (!isLoading && filteredItems.length === 0) return null;
  }

  const displayCount = shouldFetchFull ? (fullData ? filteredItems.length : '...') : (countData?.total || 0);

  return (
    <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50', borderBottom: expanded ? '1px solid' : 'none', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.dark">{occName}</Typography>
        <Chip label={displayCount === '...' ? 'Đang tải...' : `${displayCount} khóa học`} size="small" sx={{ ml: 2, fontWeight: 600 }} color="primary" variant="outlined" />
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2 }}>
        {isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}><Skeleton variant="rectangular" height={40} /><Skeleton variant="rectangular" height={100} /></Stack>
        ) : filteredItems.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Không có khóa học nào.</Typography>
        ) : (
          Object.entries(skillGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([level, courses]) => (
            <Accordion key={level} defaultExpanded sx={{ mb: 1, boxShadow: 'none', border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 48, '&.Mui-expanded': { minHeight: 48 }, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" fontWeight={700}>Bậc {level}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>({courses.length} khóa học)</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Tên khóa học</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Nhóm</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Ngày tạo</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Số bài</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, width: 100 }}>Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ mb: 1 }}>{course.title}</Typography>
                            {course.source_document_ids && course.source_document_ids.length > 0 && (
                              <Stack spacing={0.5}>
                                {course.source_document_ids.map((docId, idx) => {
                                  const d = docMap[docId];
                                  const docNameFallback = course.source_document_names?.[idx];

                                  return (
                                    <Box key={docId} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}>
                                      <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
                                        {d ? d.title : docNameFallback || "Tài liệu không xác định"}
                                      </Typography>
                                      {d && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                          {d.file_name} · <StatusChip status={d.status as ApprovalStatus} size="small" />
                                        </Typography>
                                      )}
                                    </Box>
                                  );
                                })}
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={trainingGroupLabels[course.training_group as TrainingGroup] || course.training_group} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell><Typography variant="body2">{new Date(course.created_at).toLocaleDateString('vi-VN')}</Typography></TableCell>
                          <TableCell align="center">{course.lesson_count}</TableCell>
                          <TableCell align="center"><StatusChip status={course.status as ApprovalStatus} /></TableCell>
                          <TableCell align="center">
                            <Tooltip title="Xem chi tiết"><IconButton size="small" color="primary" onClick={() => onNavigate(course.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Xoá"><IconButton size="small" color="error" onClick={() => onDelete(course.id)}><Delete fontSize="small" /></IconButton></Tooltip>
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

export default function CourseListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  // Hooks
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [occFilter, setOccFilter] = useState('');
  const [sourceDocId, setSourceDocId] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: occupationsData, isLoading: loadingOccs } = useQuery({
    queryKey: ['occupations', 'all'],
    queryFn: () => occupationApi.list(false)
  });

  const { data: documentsData } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: () => documentApi.list({ page_size: 100 })
  });

  const docMap = useMemo(() => {
    const m: Record<string, DocumentResponse> = {};
    if (documentsData?.items && Array.isArray(documentsData.items)) {
      documentsData.items.forEach((d: any) => { m[d.id] = d; });
    }
    return m;
  }, [documentsData]);

  const docOptions = useMemo(() => {
    const options = [{ value: '', label: 'Tất cả tài liệu nguồn' }];
    if (documentsData?.items && Array.isArray(documentsData.items)) {
      documentsData.items.forEach((d: any) => {
        options.push({
          value: String(d.id),
          label: d.title || d.file_name || 'Tài liệu chưa có tên'
        });
      });
    }
    return options;
  }, [documentsData]);

  const occupationOptions = useMemo(() => [
    { value: '', label: 'Tất cả ngành nghề' },
    ...(occupationsData?.map((o: Occupation) => ({ value: o.name, label: o.name })) ?? [])
  ], [occupationsData]);

  // Bộ lọc gửi xuống Backend
  const filters = useMemo(() => ({
    training_group: group || undefined,
    status: status || undefined,
    source_document_id: sourceDocId || undefined
  }), [group, status, sourceDocId]);

  // Bộ lọc xử lý trên Frontend (do BE không hỗ trợ hoặc trả sai)
  const clientFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    year: year || undefined,
    month: month || undefined,
    source_document_id: sourceDocId || undefined
  }), [debouncedSearch, year, month, sourceDocId]);

  const finalFilteredOccs = useMemo(() => {
    if (!occupationsData) return [];
    let list = occupationsData.map(o => o.name);
    if (occFilter) list = list.filter(n => n === occFilter);
    return list.sort();
  }, [occupationsData, occFilter]);

  const totalPages = Math.ceil(finalFilteredOccs.length / pageSize);
  const pagedOccs = finalFilteredOccs.slice((page - 1) * pageSize, page * pageSize);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses-count'] });
      qc.invalidateQueries({ queryKey: ['courses-full'] });
      enqueueSnackbar('Đã xoá khóa học', { variant: 'success' });
    },
  });

  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Quản lý khóa học" subtitle="Danh sách các khóa học đào tạo an toàn lao động" action={<Button variant="contained" onClick={() => navigate('/admin/courses/create')}>Thêm khóa học mới</Button>} />
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          <TextField placeholder="Tìm kiếm khóa học..." size="small" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} sx={{ flex: '1 1 300px' }} />

          <TextField select size="small" label="Ngành nghề" value={occFilter} onChange={handleFilterChange(setOccFilter)} sx={{ flex: '1 1 180px' }}>
            {occupationOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Nhóm huấn luyện" value={group} onChange={handleFilterChange(setGroup)} sx={{ flex: '1 1 160px' }}>
            {groupOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Tài liệu nguồn" value={sourceDocId} onChange={handleFilterChange(setSourceDocId)} sx={{ flex: '1 1 200px' }} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><Article fontSize="small" color="action" /></InputAdornment>) } }}>
            {docOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </Stack>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField select size="small" label="Năm" value={year} onChange={handleFilterChange(setYear)} sx={{ flex: '1 1 120px' }} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><CalendarToday sx={{ fontSize: 16 }} color="action" /></InputAdornment>) } }}>
            {years.map((y) => <MenuItem key={y} value={y}>{y || 'Tất cả'}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Tháng" value={month} onChange={handleFilterChange(setMonth)} sx={{ flex: '1 1 120px' }}>
            {months.map((m) => <MenuItem key={m} value={m}>{m ? `Tháng ${m}` : 'Tất cả'}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Trạng thái" value={status} onChange={handleFilterChange(setStatus)} sx={{ flex: '1 1 160px' }}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </Box>
      </Stack>

      {loadingOccs ? (
        <Paper variant="outlined">{Array.from({ length: 5 }).map((_, i) => <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>)}</Paper>
      ) : finalFilteredOccs.length === 0 ? (
        <EmptyState message="Không tìm thấy ngành nghề nào phù hợp." />
      ) : (
        <>
          {pagedOccs.map(occName => (
            <OccupationCourseSection
              key={occName}
              occName={occName}
              filters={filters}
              clientFilters={clientFilters}
              docMap={docMap}
              onDelete={setDeleteId}
              onNavigate={(id) => navigate(`/admin/courses/${id}`)}
            />
          ))}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 4 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Xoá khóa học"
        message="Xoá khóa học này? Hành động này không thể hoàn tác."
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}