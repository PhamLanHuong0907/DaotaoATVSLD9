import { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
    Box, Button, Card, CardContent, MenuItem, Stack, TextField,
    Typography, IconButton, Chip, Divider, Paper, Tooltip, LinearProgress,
    Accordion, AccordionSummary, AccordionDetails, Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    Add, Delete, ArrowUpward, ArrowDownward,
    Upload, Clear, ExpandMore,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import RichTextEditor from '@/components/common/RichTextEditor';
import { courseApi } from '@/api/courseApi';
import { occupationApi } from '@/api/catalogApi';
import { documentApi } from '@/api/documentApi';
import type { TrainingGroup } from '@/types/enums';
import { trainingGroupLabels } from '@/utils/vietnameseLabels';

interface LessonDraft {
    order: number;
    title: string;
    duration_minutes: number;
    theory: string;
    scenario: string;
    safety_notes: string;
    // Local media files (uploaded after course creation)
    imageFile: File | null;
    videoFile: File | null;
}

export default function CourseFormPage() {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const qc = useQueryClient();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [objectives, setObjectives] = useState<string[]>(['']);
    const [occupation, setOccupation] = useState('');
    const [skillLevel, setSkillLevel] = useState(1);
    const [trainingGroup, setTrainingGroup] = useState<TrainingGroup>('basic');
    const [sourceDocIds, setSourceDocIds] = useState<string[]>([]);
    const [lessons, setLessons] = useState<LessonDraft[]>([]);

    // File input refs
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);
    const [pendingLessonIdx, setPendingLessonIdx] = useState<number | null>(null);

    const { data: occupations } = useQuery({
        queryKey: ['occupations', 'all'],
        queryFn: () => occupationApi.list(false),
    });

    const { data: documentsData } = useQuery({
        queryKey: ['documents', 'all'],
        queryFn: () => documentApi.list({ page_size: 200 }),
    });

    const docOptions = documentsData?.items?.map((d: any) => ({ id: d.id, title: d.title })) ?? [];

    const createMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => courseApi.create(data),
        onSuccess: async (created) => {
            enqueueSnackbar('Đã tạo khóa học', { variant: 'success' });
            qc.invalidateQueries({ queryKey: ['courses'] });

            // Upload media files for lessons
            const courseId = created.id;
            let uploadCount = 0;
            for (const lesson of lessons) {
                if (lesson.imageFile) {
                    try {
                        await courseApi.uploadLessonImage(courseId, lesson.order, lesson.imageFile);
                        uploadCount++;
                    } catch { /* skip */ }
                }
                if (lesson.videoFile) {
                    try {
                        await courseApi.uploadLessonVideo(courseId, lesson.order, lesson.videoFile);
                        uploadCount++;
                    } catch { /* skip */ }
                }
            }

            if (uploadCount > 0) {
                enqueueSnackbar(`Đã tải lên ${uploadCount} file media`, { variant: 'success' });
            }

            navigate(`/admin/courses/${courseId}`);
        },
        onError: (err: Error) => enqueueSnackbar(`Lỗi: ${err.message}`, { variant: 'error' }),
    });

    const handleSubmit = () => {
        if (!title.trim() || !occupation || lessons.length === 0) {
            enqueueSnackbar('Vui lòng điền tên khóa học, ngành nghề và ít nhất 1 bài học', { variant: 'warning' });
            return;
        }
        if (!lessons.some((l) => l.title.trim())) {
            enqueueSnackbar('Ít nhất 1 bài học phải có tiêu đề', { variant: 'warning' });
            return;
        }
        createMutation.mutate({
            title,
            description,
            objectives: objectives.filter((o) => o.trim()),
            occupation,
            skill_level: skillLevel,
            training_group: trainingGroup,
            source_document_ids: sourceDocIds,
            lessons: lessons.map((l) => ({
                order: l.order,
                title: l.title,
                theory: l.theory || '',
                scenario: l.scenario || '',
                safety_notes: l.safety_notes || '',
                duration_minutes: l.duration_minutes,
            })),
        });
    };

    // Objectives helpers
    const addObjective = () => setObjectives((prev) => [...prev, '']);
    const removeObjective = (idx: number) => setObjectives((prev) => prev.filter((_, i) => i !== idx));
    const updateObjective = (idx: number, val: string) => setObjectives((prev) => prev.map((o, i) => (i === idx ? val : o)));

    // Lesson helpers
    const addLesson = () => {
        const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;
        setLessons((prev) => [...prev, {
            order: nextOrder, title: '', duration_minutes: 30,
            theory: '', scenario: '', safety_notes: '',
            imageFile: null, videoFile: null,
        }]);
    };
    const removeLesson = (idx: number) => setLessons((prev) => prev.filter((_, i) => i !== idx));
    const updateLesson = (idx: number, field: keyof LessonDraft, value: unknown) =>
        setLessons((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    const moveLesson = (idx: number, dir: -1 | 1) => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= lessons.length) return;
        setLessons((prev) => {
            const arr = [...prev];
            [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
            return arr.map((l, i) => ({ ...l, order: i + 1 }));
        });
    };

    // Media file helpers
    const triggerUploadImage = (idx: number) => {
        setPendingLessonIdx(idx);
        imageInputRef.current?.click();
    };
    const triggerUploadVideo = (idx: number) => {
        setPendingLessonIdx(idx);
        videoInputRef.current?.click();
    };

    const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f || pendingLessonIdx == null) return;
        updateLesson(pendingLessonIdx, 'imageFile', f);
    };
    const onVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f || pendingLessonIdx == null) return;
        updateLesson(pendingLessonIdx, 'videoFile', f);
    };
    const removeImageFile = (idx: number) => updateLesson(idx, 'imageFile', null);
    const removeVideoFile = (idx: number) => updateLesson(idx, 'videoFile', null);

    // Local preview URL
    const previewUrl = (file: File | null) => (file ? URL.createObjectURL(file) : null);

    return (
        <>
            <input type="file" accept="image/*" hidden ref={imageInputRef} onChange={onImageFileChange} />
            <input type="file" accept="video/*" hidden ref={videoInputRef} onChange={onVideoFileChange} />

            <PageHeader title="Tạo khóa học mới" subtitle="Nhập thông tin khóa học thủ công (không dùng AI)" />

            <Card>
                <CardContent>
                    <Stack spacing={3} sx={{ maxWidth: 900 }}>
                        {/* Basic info */}
                        <Typography variant="subtitle1" fontWeight={600}>Thông tin chung</Typography>

                        <TextField
                            fullWidth label="Tên khóa học" value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="VD: An toàn lao động cho thợ hàn - Bậc 3"
                        />

                        <TextField
                            fullWidth label="Mô tả" multiline minRows={2}
                            value={description} onChange={(e) => setDescription(e.target.value)}
                        />

                        {/* Objectives */}
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="caption" fontWeight={600}>Mục tiêu khóa học</Typography>
                                <Button size="small" startIcon={<Add />} onClick={addObjective}>Thêm</Button>
                            </Stack>
                            {objectives.map((obj, idx) => (
                                <Stack direction="row" spacing={1} sx={{ mb: 1 }} key={idx}>
                                    <TextField
                                        fullWidth size="small" placeholder={`Mục tiêu ${idx + 1}`}
                                        value={obj} onChange={(e) => updateObjective(idx, e.target.value)}
                                    />
                                    <IconButton size="small" color="error" onClick={() => removeObjective(idx)} disabled={objectives.length === 1}>
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                        </Box>

                        {/* Occupation, Skill, Group */}
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    select fullWidth label="Ngành nghề" value={occupation}
                                    onChange={(e) => setOccupation(e.target.value)}
                                >
                                    {occupations?.map((o: any) => (
                                        <MenuItem key={o.id} value={o.name}>{o.name}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 6, sm: 2 }}>
                                <TextField
                                    type="number" fullWidth label="Bậc thợ" value={skillLevel}
                                    onChange={(e) => setSkillLevel(Number(e.target.value))}
                                    slotProps={{ htmlInput: { min: 1, max: 7 } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <TextField
                                    select fullWidth label="Nhóm huấn luyện" value={trainingGroup}
                                    onChange={(e) => setTrainingGroup(e.target.value as TrainingGroup)}
                                >
                                    {Object.entries(trainingGroupLabels).map(([v, l]) => (
                                        <MenuItem key={v} value={v}>{l}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3 }}>
                                <Autocomplete
                                    multiple
                                    options={docOptions}
                                    getOptionLabel={(d) => d.title}
                                    value={docOptions.filter((d) => sourceDocIds.includes(d.id))}
                                    onChange={(_, newValue) => setSourceDocIds(newValue.map((d) => d.id))}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Tài liệu nguồn" helperText="Tài liệu tham khảo (tuỳ chọn)" />
                                    )}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>

                        {/* Lessons */}
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    Bài học ({lessons.length})
                                </Typography>
                                <Button size="small" variant="outlined" startIcon={<Add />} onClick={addLesson}>
                                    Thêm bài học
                                </Button>
                            </Stack>

                            {lessons.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Chưa có bài học nào. Nhấn "Thêm bài học" để bắt đầu.
                                </Typography>
                            )}

                            {lessons.map((lesson, idx) => {
                                const imgPreview = lesson.imageFile ? previewUrl(lesson.imageFile) : null;
                                const vidPreview = lesson.videoFile ? previewUrl(lesson.videoFile) : null;
                                return (
                                    <Accordion key={idx} defaultExpanded sx={{ mb: 1 }}>
                                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                                                <Chip label={`Bài ${lesson.order}`} size="small" color="primary" sx={{ fontWeight: 700, minWidth: 28 }} />
                                                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                                                    {lesson.title || '— Chưa đặt tên —'}
                                                </Typography>
                                                <Stack direction="row" spacing={0.5}>
                                                    {lesson.imageFile && (
                                                        <Chip label="Có ảnh" size="small" color="secondary" variant="outlined" sx={{ height: 22 }} />
                                                    )}
                                                    {lesson.videoFile && (
                                                        <Chip label="Có video" size="small" color="info" variant="outlined" sx={{ height: 22 }} />
                                                    )}
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveLesson(idx, -1); }} disabled={idx === 0}>
                                                        <ArrowUpward fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveLesson(idx, 1); }} disabled={idx === lessons.length - 1}>
                                                        <ArrowDownward fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); removeLesson(idx); }}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Stack spacing={2}>
                                                {/* Title & Duration */}
                                                <Stack direction="row" spacing={2}>
                                                    <TextField
                                                        fullWidth label="Tên bài học"
                                                        value={lesson.title}
                                                        onChange={(e) => updateLesson(idx, 'title', e.target.value)}
                                                    />
                                                    <TextField
                                                        type="number" label="Phút" sx={{ width: 80 }}
                                                        value={lesson.duration_minutes}
                                                        onChange={(e) => updateLesson(idx, 'duration_minutes', Number(e.target.value))}
                                                        slotProps={{ htmlInput: { min: 5 } }}
                                                    />
                                                </Stack>

                                                {/* Media upload */}
                                                <Box>
                                                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                                                        Hình ảnh & Video (sẽ tải lên sau khi tạo khóa học)
                                                    </Typography>
                                                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                                        {/* Image */}
                                                        <Box sx={{ minWidth: 160 }}>
                                                            {imgPreview ? (
                                                                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                                                    <Box
                                                                        component="img" src={imgPreview} alt="Preview"
                                                                        sx={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                                                                    />
                                                                    <Tooltip title="Xoá ảnh">
                                                                        <IconButton
                                                                            size="small" color="error"
                                                                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.9)' }}
                                                                            onClick={() => removeImageFile(idx)}
                                                                        >
                                                                            <Clear fontSize="small" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            ) : (
                                                                <Button
                                                                    size="small" variant="outlined" startIcon={<Upload />}
                                                                    onClick={() => triggerUploadImage(idx)}
                                                                    sx={{ minHeight: 60 }}
                                                                >
                                                                    Chọn ảnh
                                                                </Button>
                                                            )}
                                                        </Box>
                                                        {/* Video */}
                                                        <Box sx={{ minWidth: 160 }}>
                                                            {vidPreview ? (
                                                                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                                                    <Box
                                                                        component="video" src={vidPreview}
                                                                        sx={{ width: 240, height: 140, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                                                                        controls
                                                                    />
                                                                    <Tooltip title="Xoá video">
                                                                        <IconButton
                                                                            size="small" color="error"
                                                                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.9)' }}
                                                                            onClick={() => removeVideoFile(idx)}
                                                                        >
                                                                            <Clear fontSize="small" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            ) : (
                                                                <Button
                                                                    size="small" variant="outlined" startIcon={<Upload />}
                                                                    onClick={() => triggerUploadVideo(idx)}
                                                                    sx={{ minHeight: 60 }}
                                                                >
                                                                    Chọn video
                                                                </Button>
                                                            )}
                                                        </Box>
                                                    </Stack>
                                                </Box>

                                                <Divider />

                                                {/* Rich text content */}
                                                <Box>
                                                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                                                        Lý thuyết
                                                    </Typography>
                                                    <RichTextEditor
                                                        value={lesson.theory}
                                                        onChange={(html) => updateLesson(idx, 'theory', html)}
                                                        placeholder="Nhập nội dung lý thuyết..."
                                                        minHeight={180}
                                                    />
                                                </Box>

                                                <Box>
                                                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                                                        Tình huống thực tế (tuỳ chọn)
                                                    </Typography>
                                                    <RichTextEditor
                                                        value={lesson.scenario}
                                                        onChange={(html) => updateLesson(idx, 'scenario', html)}
                                                        placeholder="Mô tả tình huống thực tế..."
                                                        minHeight={120}
                                                    />
                                                </Box>

                                                <Box>
                                                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                                                        Lưu ý an toàn (tuỳ chọn)
                                                    </Typography>
                                                    <RichTextEditor
                                                        value={lesson.safety_notes}
                                                        onChange={(html) => updateLesson(idx, 'safety_notes', html)}
                                                        placeholder="Các lưu ý an toàn..."
                                                        minHeight={120}
                                                    />
                                                </Box>
                                            </Stack>
                                        </AccordionDetails>
                                    </Accordion>
                                );
                            })}
                        </Box>

                        {createMutation.isPending && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Đang tạo khóa học...
                                </Typography>
                                <LinearProgress />
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                            <Button variant="outlined" onClick={() => navigate('/admin/courses')}>Hủy</Button>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!title.trim() || !occupation || lessons.length === 0 || createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Đang tạo...' : 'Tạo khóa học'}
                            </Button>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </>
    );
}