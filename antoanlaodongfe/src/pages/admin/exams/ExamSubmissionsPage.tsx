import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box, Skeleton, IconButton, Tooltip, Chip,
} from '@mui/material';
import { Visibility, Download } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import ClassificationChip from '@/components/common/ClassificationChip';
import EmptyState from '@/components/common/EmptyState';
import { usePeriodSubmissions } from '@/hooks/useSubmissions';
import { formatScore } from '@/utils/formatters';

export default function ExamSubmissionsPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();

  const { data: submissions = [], isLoading } = usePeriodSubmissions(periodId || '');

  return (
    <>
      <PageHeader 
        title="Danh sách bài nộp kỳ thi" 
        subtitle="Tổng hợp kết quả từ tất cả phòng thi"
        action={
          <Tooltip title="Xuất báo cáo kết quả">
            <IconButton color="primary">
              <Download />
            </IconButton>
          </Tooltip>
        }
      />

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="90%" /></Box>
          ))}
        </Paper>
      ) : !submissions.length ? (
        <EmptyState message="Chưa có bài nộp nào cho kỳ thi này" />
      ) : (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Tổng số bài nộp: <strong>{submissions.length}</strong>
            </Typography>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Phòng thi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mã NV</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Họ tên</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Phòng ban</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nghề & Bậc</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Điểm</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Kết quả</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Chi tiết</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((sub: any) => (
                  <TableRow key={sub.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Chip label={sub.room_name} size="small" variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell>{sub.employee_id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{sub.full_name}</Typography>
                    </TableCell>
                    <TableCell>{sub.department}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{sub.occupation}</Typography>
                      <Typography variant="caption" color="text.secondary">Bậc {sub.skill_level}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={700} color={sub.total_score >= 5 ? 'success.main' : 'error.main'}>
                        {formatScore(sub.total_score)}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {sub.total_correct}/{sub.total_questions}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <ClassificationChip classification={sub.classification} />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Xem bài làm">
                          <IconButton size="small" color="primary" onClick={() => navigate(`/exams/results/${sub.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  );
}