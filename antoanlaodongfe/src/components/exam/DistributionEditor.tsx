import {
  Box,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import type { QuestionDistribution } from '@/types/examTemplate';
import { questionTypeLabels, difficultyLabels } from '@/utils/vietnameseLabels';
import { questionApi } from '@/api/questionApi';

interface DistributionEditorProps {
  distributions: QuestionDistribution[];
  totalQuestions: number;
  onChange: (distributions: QuestionDistribution[]) => void;
  occupation?: string;
  skillLevel?: number;
  trainingGroup?: string;
}

const questionTypeOptions = [
  { value: '', label: '(Tất cả)' },
  ...Object.entries(questionTypeLabels).map(([v, l]) => ({ value: v, label: l })),
];

const difficultyOptions = [
  { value: '', label: '(Tất cả)' },
  ...Object.entries(difficultyLabels).map(([v, l]) => ({ value: v, label: l })),
];

export default function DistributionEditor({
  distributions,
  totalQuestions,
  onChange,
  occupation,
  skillLevel,
  trainingGroup
}: DistributionEditorProps) {
  const totalCount = distributions.reduce((sum, d) => sum + d.count, 0);
  const isMatch = totalCount === totalQuestions;

  // Fetch topic tags filtered by occupation and skill level
  const { data: topicOptions = [], isLoading: topicsLoading } = useQuery<string[]>({
    queryKey: ['question-topic-tags', occupation, skillLevel, trainingGroup],
    queryFn: () => questionApi.getTopicTags({
      occupation: occupation || undefined,
      skill_level: skillLevel,
      training_group: trainingGroup || undefined
    }),
    staleTime: 5 * 60 * 1000,
  });

  const handleAdd = () => {
    onChange([...distributions, { topic_tag: '', question_type: undefined, difficulty: undefined, count: 1 }]);
  };

  const handleRemove = (index: number) => {
    onChange(distributions.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof QuestionDistribution, value: any) => {
    const updated = distributions.map((d, i) => {
      if (i !== index) return d;
      if (field === 'count') return { ...d, count: Number(value) || 0 };
      if (field === 'question_type' || field === 'difficulty') {
        return { ...d, [field]: (value as string) || undefined };
      }
      return { ...d, [field]: value };
    });
    onChange(updated);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Phân bổ câu hỏi
        </Typography>
        <Button size="small" startIcon={<Add />} onClick={handleAdd}>
          Thêm dòng
        </Button>
      </Box>

      {topicOptions.length > 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tìm thấy <strong>{topicOptions.length}</strong> chủ đề phù hợp với Nghề và Bậc thợ đã chọn.
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            * Lưu ý: Chỉ những câu hỏi đã ở trạng thái <strong>"Đã duyệt"</strong> mới được tính vào số câu sẵn có.
          </Typography>
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Không tìm thấy chủ đề nào trùng khớp với <strong>Nghề/Bậc</strong> đang chọn. Hãy kiểm tra lại ngân hàng câu hỏi hoặc chọn Nghề khác.
        </Alert>
      )}

      {!isMatch && distributions.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tổng số câu phân bổ: <strong>{totalCount}</strong> / Yêu cầu: <strong>{totalQuestions}</strong>
          {totalCount !== totalQuestions && ` (chênh ${Math.abs(totalCount - totalQuestions)} câu)`}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ minWidth: 220 }}>Chủ đề</TableCell>
              <TableCell>Loại câu hỏi</TableCell>
              <TableCell>Mức độ</TableCell>
              <TableCell sx={{ width: 100 }}>Số câu</TableCell>
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {distributions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  Chưa có phân bổ. Nhấn "Thêm dòng" để bắt đầu.
                </TableCell>
              </TableRow>
            ) : (
              distributions.map((dist, i) => (
                <DistributionRow
                  key={i}
                  index={i}
                  dist={dist}
                  topicOptions={topicOptions}
                  topicsLoading={topicsLoading}
                  onChange={handleChange}
                  onRemove={handleRemove}
                  parentFilters={{ occupation, skillLevel, trainingGroup }}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

interface DistributionRowProps {
  index: number;
  dist: QuestionDistribution;
  topicOptions: string[];
  topicsLoading: boolean;
  onChange: (index: number, field: keyof QuestionDistribution, value: any) => void;
  onRemove: (index: number) => void;
  parentFilters: {
    occupation?: string;
    skillLevel?: number;
    trainingGroup?: string;
  };
}

function DistributionRow({
  index,
  dist,
  topicOptions,
  topicsLoading,
  onChange,
  onRemove,
  parentFilters
}: DistributionRowProps) {
  // Query available count based on all filters
  const { data: countData, isLoading: countLoading } = useQuery({
    queryKey: ['question-count', dist.topic_tag, dist.question_type, dist.difficulty, parentFilters],
    queryFn: () => questionApi.list({
      topic_tag: dist.topic_tag || undefined,
      question_type: dist.question_type as any,
      difficulty: dist.difficulty as any,
      occupation: parentFilters.occupation,
      skill_level: parentFilters.skillLevel,
      training_group: parentFilters.trainingGroup,
      status: 'approved' as any, // Only count approved questions
      page_size: 1,
    }),
    staleTime: 30000,
  });

  const availableCount = countData?.total ?? 0;
  const isOverLimit = dist.count > availableCount;

  return (
    <TableRow>
      <TableCell sx={{ minWidth: 220, overflow: 'visible' }}>
        {topicsLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
          </Box>
        ) : (
          <Autocomplete
            size="small"
            freeSolo
            options={topicOptions}
            value={dist.topic_tag || ''}
            onChange={(_, newValue) => onChange(index, 'topic_tag', newValue || '')}
            onInputChange={(_, newValue) => onChange(index, 'topic_tag', newValue)}
            renderInput={(params) => <TextField {...params} variant="standard" placeholder="Chủ đề..." />}
          />
        )}
      </TableCell>
      <TableCell>
        <TextField
          select size="small" fullWidth variant="standard"
          value={dist.question_type || ''}
          onChange={(e) => onChange(index, 'question_type', e.target.value)}
        >
          {questionTypeOptions.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell>
        <TextField
          select size="small" fullWidth variant="standard"
          value={dist.difficulty || ''}
          onChange={(e) => onChange(index, 'difficulty', e.target.value)}
        >
          {difficultyOptions.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell>
        <TextField
          type="number" size="small" fullWidth variant="standard"
          value={dist.count}
          onChange={(e) => onChange(index, 'count', e.target.value)}
          error={isOverLimit}
          helperText={
            countLoading ? '...' : `Sẵn có: ${availableCount}`
          }
          slotProps={{
            htmlInput: { min: 0, max: availableCount },
            formHelperText: { sx: { ml: 0, color: isOverLimit ? 'error.main' : 'text.secondary' } }
          }}
        />
      </TableCell>
      <TableCell>
        <IconButton size="small" color="error" onClick={() => onRemove(index)}>
          <Delete fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
