import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Paper, Stack, Typography, Chip, LinearProgress, Avatar, Divider, Skeleton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    Mail, Phone, Building2, Briefcase, CalendarDays,
    ClipboardCheck, BookOpen, Award, TrendingUp, AlertTriangle, CheckCircle,
    CheckCircle2, MinusCircle, XCircle, Clock, CircleDashed,
    ShieldCheck, ShieldAlert, ShieldX,
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import StatCard from '@/components/dashboard/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/authApi';
import { departmentApi } from '@/api/departmentApi';
import { courseApi } from '@/api/courseApi';
import { lessonProgressApi } from '@/api/lessonProgressApi';
import { submissionApi } from '@/api/submissionApi';
import { certificateApi } from '@/api/certificateApi';
import { examApi } from '@/api/examApi';
import { formatScore } from '@/utils/formatters';

const PASSING_SCORE = 5;

// Palette từ exam-pulse-view (HSL → hex)
const PALETTE = {
    primary: 'hsl(215 85% 45%)',
    primarySoft: 'hsl(215 85% 45% / 0.10)',
    accent: 'hsl(160 60% 42%)',
    accentSoft: 'hsl(160 60% 42% / 0.10)',
    destructive: 'hsl(0 72% 55%)',
    destructiveSoft: 'hsl(0 72% 55% / 0.10)',
    warning: 'hsl(38 92% 50%)',
    warningSoft: 'hsl(38 92% 50% / 0.12)',
    border: 'hsl(215 20% 90%)',
    borderSoft: 'hsl(215 20% 90% / 0.6)',
    muted: 'hsl(215 15% 92%)',
    mutedSoft: 'hsl(215 15% 92% / 0.5)',
    mutedFg: 'hsl(215 10% 50%)',
    cardFg: 'hsl(215 35% 15%)',
};

type WorkerCourseStatus = 'completed' | 'in_progress' | 'not_started';

const courseStatusConfig: Record<WorkerCourseStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
    completed: { label: 'Hoàn thành', icon: CheckCircle, color: PALETTE.accent },
    in_progress: { label: 'Đang học', icon: Clock, color: PALETTE.warning },
    not_started: { label: 'Chưa bắt đầu', icon: CircleDashed, color: PALETTE.mutedFg },
};

type WorkerCertStatus = 'active' | 'expiring_soon' | 'expired';

const certStatusConfig: Record<WorkerCertStatus, { label: string; icon: typeof ShieldCheck; bg: string; fg: string; border: string }> = {
    active: { label: 'Hiệu lực', icon: ShieldCheck, bg: PALETTE.accentSoft, fg: PALETTE.accent, border: 'hsl(160 60% 42% / 0.20)' },
    expiring_soon: { label: 'Sắp hết hạn', icon: ShieldAlert, bg: PALETTE.warningSoft, fg: PALETTE.warning, border: 'hsl(38 92% 50% / 0.20)' },
    expired: { label: 'Hết hạn', icon: ShieldX, bg: PALETTE.destructiveSoft, fg: PALETTE.destructive, border: 'hsl(0 72% 55% / 0.20)' },
};

const cardSx = {
    borderRadius: 3, // 12px ~ rounded-xl
    borderColor: PALETTE.borderSoft,
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', // shadow-sm
};

function getCertStatus(validUntil: string | null, revoked: boolean): WorkerCertStatus {
    if (revoked) return 'expired';
    if (!validUntil) return 'active';
    const days = dayjs(validUntil).diff(dayjs(), 'day');
    if (days < 0) return 'expired';
    if (days <= 60) return 'expiring_soon';
    return 'active';
}

function ProfileCard({
    fullName, employeeId, department, position, email, phone, joinDate,
}: {
    fullName: string;
    employeeId: string;
    department?: string;
    position?: string;
    email?: string;
    phone?: string;
    joinDate?: string;
}) {
    const initials = fullName.split(' ').map((w) => w[0]).join('').slice(-2).toUpperCase();
    return (
        <Paper variant="outlined" sx={{
            p: 3, height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2,
            ...cardSx,
        }}>
            <Avatar sx={{
                width: 80, height: 80,
                bgcolor: PALETTE.primarySoft, color: PALETTE.primary,
                fontSize: 28, fontWeight: 700,
            }}>
                {initials || 'U'}
            </Avatar>
            <Box>
                <Typography variant="h6" fontWeight={700} sx={{ color: PALETTE.cardFg }}>{fullName}</Typography>
                <Typography variant="body2" sx={{ color: PALETTE.mutedFg }}>{employeeId}</Typography>
            </Box>
            <Stack spacing={1.5} sx={{ width: '100%', textAlign: 'left' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: PALETTE.mutedFg }}>
                    <Building2 size={16} style={{ flexShrink: 0 }} />
                    <Typography variant="body2" noWrap sx={{ color: 'inherit' }}>{department || '—'}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: PALETTE.mutedFg }}>
                    <Briefcase size={16} style={{ flexShrink: 0 }} />
                    <Typography variant="body2" noWrap sx={{ color: 'inherit' }}>{position || '—'}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: PALETTE.mutedFg }}>
                    <Mail size={16} style={{ flexShrink: 0 }} />
                    <Typography variant="body2" noWrap sx={{ color: 'inherit' }}>{email || '—'}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: PALETTE.mutedFg }}>
                    <Phone size={16} style={{ flexShrink: 0 }} />
                    <Typography variant="body2" noWrap sx={{ color: 'inherit' }}>{phone || '—'}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: PALETTE.mutedFg }}>
                    <CalendarDays size={16} style={{ flexShrink: 0 }} />
                    <Typography variant="body2" noWrap sx={{ color: 'inherit' }}>
                        {joinDate ? `Đăng nhập gần nhất: ${dayjs(joinDate).format('DD/MM/YYYY')}` : 'Đăng nhập gần nhất: —'}
                    </Typography>
                </Stack>
            </Stack>
        </Paper>
    );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: PALETTE.cardFg }}>{title}</Typography>
            {subtitle && (
                <Typography variant="body2" sx={{ color: PALETTE.mutedFg }}>{subtitle}</Typography>
            )}
        </Box>
    );
}

export default function WorkerOverview() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: me } = useQuery({
        queryKey: ['auth-me'],
        queryFn: () => authApi.me(),
    });
    const { data: department } = useQuery({
        queryKey: ['department', user?.department_id],
        queryFn: () => departmentApi.get(user!.department_id!),
        enabled: !!user?.department_id,
    });
    const { data: myCourses = [], isLoading: loadingCourses } = useQuery({
        queryKey: ['my-courses', false],
        queryFn: () => courseApi.myCourses(false),
    });
    const { data: summaries = [] } = useQuery({
        queryKey: ['my-course-summaries'],
        queryFn: () => lessonProgressApi.mySummaries(),
    });
    const { data: subPage, isLoading: loadingSubs } = useQuery({
        queryKey: ['user-submissions', user?.id, 1, 100, 'official'],
        queryFn: () => submissionApi.listByUser(user!.id, { page: 1, page_size: 100, exam_kind: 'official' }),
        enabled: !!user?.id,
    });
    const { data: examPage } = useQuery({
        queryKey: ['exams-list-for-worker'],
        queryFn: () => examApi.list({ page: 1, page_size: 200 }),
    });
    const { data: certificates = [], isLoading: loadingCerts } = useQuery({
        queryKey: ['my-certificates'],
        queryFn: () => certificateApi.myCertificates(),
    });

    const submissions = subPage?.items || [];
    const completedSubs = submissions.filter((s) => s.submitted_at);
    const passedSubs = completedSubs.filter((s) => (s.total_score || 0) >= PASSING_SCORE && s.classification !== 'fail');
    const avgScore = completedSubs.length
        ? completedSubs.reduce((sum, s) => sum + (s.total_score || 0), 0) / completedSubs.length
        : 0;

    const examNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        (examPage?.items || []).forEach((e) => { map[e.id] = e.name; });
        return map;
    }, [examPage]);

    const summaryMap = useMemo(
        () => Object.fromEntries(summaries.map((s) => [s.course_id, s])),
        [summaries],
    );

    const enrichedCourses = useMemo(
        () => myCourses.map((c) => {
            const sum = summaryMap[c.id];
            const progress = sum?.percent ?? 0;
            let status: WorkerCourseStatus = 'not_started';
            if (sum?.is_course_complete || progress >= 100) status = 'completed';
            else if (progress > 0) status = 'in_progress';
            return { course: c, sum, progress, status };
        }),
        [myCourses, summaryMap],
    );
    const completedCourses = enrichedCourses.filter((c) => c.status === 'completed').length;
    const inProgressCourses = enrichedCourses.filter((c) => c.status === 'in_progress').length;
    const notStartedCourses = enrichedCourses.filter((c) => c.status === 'not_started').length;
    const overallProgress = enrichedCourses.length
        ? Math.round(enrichedCourses.reduce((s, c) => s + c.progress, 0) / enrichedCourses.length)
        : 0;

    const enrichedCerts = useMemo(
        () => certificates.map((c) => ({ cert: c, status: getCertStatus(c.valid_until, c.revoked) })),
        [certificates],
    );
    const activeCerts = enrichedCerts.filter((c) => c.status === 'active').length;
    const expiringOrExpiredCerts = enrichedCerts.filter((c) => c.status === 'expiring_soon' || c.status === 'expired').length;

    const chartData = useMemo(
        () => [...completedSubs]
            .sort((a, b) => +new Date(a.submitted_at || a.created_at) - +new Date(b.submitted_at || b.created_at))
            .map((s, i) => ({
                name: examNameMap[s.exam_id] || `Bài thi ${i + 1}`,
                score: Number(s.total_score?.toFixed(2) || 0),
            })),
        [completedSubs, examNameMap],
    );

    return (
        <Stack spacing={4}>
            {/* Profile + Stats */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <ProfileCard
                        fullName={user?.full_name || 'Người lao động'}
                        employeeId={user?.employee_id || '—'}
                        department={department?.name}
                        position={
                            user?.occupation
                                ? `${user.occupation}${user.skill_level ? ` · Bậc ${user.skill_level}` : ''}`
                                : undefined
                        }
                        email={me?.email || undefined}
                        phone={me?.phone || undefined}
                        joinDate={me?.last_login_at || undefined}
                    />
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                        <Grid container spacing={2} sx={{ width: '100%' }}>
                            <Grid size={{ xs: 6, sm: 4 }}>
                                <StatCard
                                    icon={ClipboardCheck}
                                    title="Kỳ thi đã tham gia"
                                    value={submissions.length}
                                    subtitle={`Đạt: ${passedSubs.length}/${completedSubs.length}`}
                                    variant="default"
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4 }}>
                                <StatCard
                                    icon={TrendingUp}
                                    title="Điểm trung bình"
                                    value={completedSubs.length ? formatScore(avgScore) : '—'}
                                    subtitle="Trên tất cả kỳ thi"
                                    variant="accent"
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4 }}>
                                <StatCard
                                    icon={BookOpen}
                                    title="Khóa học hoàn thành"
                                    value={`${completedCourses}/${myCourses.length}`}
                                    subtitle="Khóa học"
                                    variant="default"
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4 }}>
                                <StatCard
                                    icon={CheckCircle2}
                                    title="Đang học"
                                    value={inProgressCourses}
                                    subtitle="Khóa học đang tiến hành"
                                    variant="warning"
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4 }}>
                                <StatCard
                                    icon={Award}
                                    title="Chứng chỉ hiệu lực"
                                    value={activeCerts}
                                    subtitle={`${expiringOrExpiredCerts} hết hạn/sắp hết`}
                                    variant="accent"
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4 }}>
                                <StatCard
                                    icon={AlertTriangle}
                                    title="Chứng chỉ cần gia hạn"
                                    value={expiringOrExpiredCerts}
                                    subtitle="Cần cập nhật"
                                    variant="destructive"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </Grid>
            </Grid>

            <Divider sx={{ borderColor: PALETTE.border }} />

            {/* Exam history */}
            <Stack spacing={2.5}>
                <SectionTitle title="Lịch sử kỳ thi" subtitle="Kết quả các kỳ thi đã tham gia" />
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, lg: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2.5, height: '100%', ...cardSx }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: PALETTE.cardFg }}>
                                Xu hướng điểm thi
                            </Typography>
                            {loadingSubs ? (
                                <Skeleton variant="rectangular" height={220} />
                            ) : chartData.length === 0 ? (
                                <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Chưa có dữ liệu điểm thi
                                    </Typography>
                                </Box>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 11, fill: PALETTE.mutedFg }}
                                            tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 12)}…` : v)}
                                        />
                                        <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: PALETTE.mutedFg }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 8, fontSize: 12, border: `1px solid ${PALETTE.border}` }}
                                            formatter={(v) => [`${formatScore(Number(v ?? 0))} điểm`, '']}
                                        />
                                        <Line type="monotone" dataKey="score" stroke={PALETTE.primary} strokeWidth={2} dot={{ r: 4, fill: PALETTE.primary }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2.5, height: '100%', ...cardSx }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: PALETTE.cardFg }}>
                                Danh sách kỳ thi
                            </Typography>
                            {loadingSubs ? (
                                <Stack spacing={1}>
                                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={56} />)}
                                </Stack>
                            ) : submissions.length === 0 ? (
                                <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Bạn chưa có bài thi nào
                                    </Typography>
                                </Box>
                            ) : (
                                <Stack spacing={1.25} sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
                                    {submissions.map((s) => {
                                        const passed = (s.total_score || 0) >= PASSING_SCORE && s.classification !== 'fail';
                                        const isCompleted = !!s.submitted_at;
                                        const Icon = isCompleted ? (passed ? CheckCircle2 : XCircle) : MinusCircle;
                                        const iconColor = isCompleted ? (passed ? PALETTE.accent : PALETTE.destructive) : PALETTE.mutedFg;
                                        const examName = examNameMap[s.exam_id] || `Bài thi ${s.exam_id.slice(-6)}`;
                                        return (
                                            <Box
                                                key={s.id}
                                                onClick={() => navigate(`/exams/results/${s.id}`)}
                                                sx={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    p: 1.5, borderRadius: 2, bgcolor: PALETTE.mutedSoft,
                                                    cursor: 'pointer', transition: 'background-color .15s',
                                                    '&:hover': { bgcolor: PALETTE.muted },
                                                }}
                                            >
                                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                                    <Icon size={16} color={iconColor} style={{ flexShrink: 0 }} />
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography variant="body2" fontWeight={500} noWrap sx={{ color: PALETTE.cardFg }}>
                                                            {examName}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: PALETTE.mutedFg }}>
                                                            {dayjs(s.submitted_at || s.created_at).format('DD/MM/YYYY')}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    {isCompleted && (
                                                        <Typography
                                                            variant="body2" fontWeight={700}
                                                            sx={{ color: passed ? PALETTE.accent : PALETTE.destructive }}
                                                        >
                                                            {formatScore(s.total_score || 0)}
                                                        </Typography>
                                                    )}
                                                    <Chip
                                                        size="small"
                                                        label={!isCompleted ? 'Chưa nộp' : passed ? 'Đạt' : 'Không đạt'}
                                                        sx={{
                                                            height: 22, fontSize: 11, fontWeight: 600, borderRadius: 1.5,
                                                            bgcolor: !isCompleted ? PALETTE.muted : passed ? PALETTE.accentSoft : PALETTE.destructiveSoft,
                                                            color: !isCompleted ? PALETTE.mutedFg : passed ? PALETTE.accent : PALETTE.destructive,
                                                        }}
                                                    />
                                                </Stack>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </Stack>

            <Divider sx={{ borderColor: PALETTE.border }} />

            {/* Course progress */}
            <Stack spacing={2.5}>
                <SectionTitle title="Tiến độ khóa học" subtitle="Theo dõi các khóa học đã đăng ký" />

                <Grid container spacing={2}>
                    {[
                        { value: `${overallProgress}%`, label: 'Tiến độ chung', color: PALETTE.cardFg },
                        { value: completedCourses, label: 'Hoàn thành', color: PALETTE.accent },
                        { value: inProgressCourses, label: 'Đang học', color: PALETTE.warning },
                        { value: notStartedCourses, label: 'Chưa bắt đầu', color: PALETTE.mutedFg },
                    ].map((tile) => (
                        <Grid key={tile.label} size={{ xs: 6, sm: 3 }}>
                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', ...cardSx }}>
                                <Typography variant="h5" fontWeight={700} sx={{ color: tile.color }}>
                                    {tile.value}
                                </Typography>
                                <Typography variant="caption" sx={{ color: PALETTE.mutedFg }}>
                                    {tile.label}
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                <Paper variant="outlined" sx={{ p: 2.5, ...cardSx }}>
                    {loadingCourses ? (
                        <Stack spacing={2}>
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={60} />)}
                        </Stack>
                    ) : enrichedCourses.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                            Hiện chưa có khóa học nào được giao cho bạn
                        </Typography>
                    ) : (
                        <Stack spacing={2.5}>
                            {enrichedCourses.map(({ course, status, progress }) => {
                                const cfg = courseStatusConfig[status];
                                const Icon = cfg.icon;
                                return (
                                    <Box
                                        key={course.id}
                                        onClick={() => navigate(`/study/courses/${course.id}`)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                                <BookOpen size={16} color={PALETTE.primary} style={{ flexShrink: 0 }} />
                                                <Typography variant="body2" fontWeight={500} noWrap sx={{ color: PALETTE.cardFg }}>
                                                    {course.title}
                                                </Typography>
                                            </Stack>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    icon={<Icon size={12} color={cfg.color} />}
                                                    label={cfg.label}
                                                    sx={{
                                                        height: 22, fontSize: 11, fontWeight: 500, borderRadius: 1.5,
                                                        borderColor: PALETTE.border, color: PALETTE.cardFg,
                                                        '& .MuiChip-icon': { ml: 0.5 },
                                                    }}
                                                />
                                            </Stack>
                                        </Stack>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <LinearProgress
                                                variant="determinate"
                                                value={progress}
                                                sx={{
                                                    flex: 1, height: 8, borderRadius: 4,
                                                    bgcolor: PALETTE.muted,
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: status === 'completed' ? PALETTE.accent
                                                            : status === 'in_progress' ? PALETTE.warning
                                                                : PALETTE.mutedFg,
                                                    },
                                                }}
                                            />
                                            <Typography variant="caption" fontWeight={500} sx={{ color: PALETTE.mutedFg, width: 36, textAlign: 'right' }}>
                                                {progress}%
                                            </Typography>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                </Paper>
            </Stack>

            <Divider sx={{ borderColor: PALETTE.border }} />

            {/* Certificates */}
            <Stack spacing={2.5}>
                <SectionTitle title="Chứng chỉ" subtitle="Danh sách chứng chỉ đã được cấp" />

                {loadingCerts ? (
                    <Grid container spacing={2}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
                                <Skeleton variant="rounded" height={150} />
                            </Grid>
                        ))}
                    </Grid>
                ) : enrichedCerts.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', ...cardSx }}>
                        <Typography variant="body2" sx={{ color: PALETTE.mutedFg }}>
                            Bạn chưa có chứng chỉ nào
                        </Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={2}>
                        {enrichedCerts.map(({ cert, status }) => {
                            const cfg = certStatusConfig[status];
                            const Icon = cfg.icon;
                            return (
                                <Grid key={cert.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                                    <Paper variant="outlined" sx={{ p: 2.5, height: '100%', ...cardSx }}>
                                        <Stack spacing={1.5}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                <Box sx={{
                                                    bgcolor: PALETTE.primarySoft, color: PALETTE.primary,
                                                    borderRadius: 2, p: 1, display: 'inline-flex',
                                                }}>
                                                    <Award size={20} />
                                                </Box>
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    icon={<Icon size={12} color={cfg.fg} />}
                                                    label={cfg.label}
                                                    sx={{
                                                        height: 22, fontSize: 11, fontWeight: 500, borderRadius: 1.5,
                                                        bgcolor: cfg.bg, color: cfg.fg, borderColor: cfg.border,
                                                        '& .MuiChip-icon': { ml: 0.5, color: cfg.fg },
                                                    }}
                                                />
                                            </Stack>
                                            <Typography variant="subtitle2" fontWeight={600} sx={{ color: PALETTE.cardFg }}>
                                                {cert.exam_name}
                                            </Typography>
                                            <Stack spacing={0.25}>
                                                <Typography variant="caption" sx={{ color: PALETTE.mutedFg }}>
                                                    Ngày cấp: {dayjs(cert.issued_at).format('DD/MM/YYYY')}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: PALETTE.mutedFg }}>
                                                    Hết hạn: {cert.valid_until ? dayjs(cert.valid_until).format('DD/MM/YYYY') : 'Không thời hạn'}
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Stack>
        </Stack>
    );
}
