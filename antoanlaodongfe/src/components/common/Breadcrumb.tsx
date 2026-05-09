import { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Breadcrumbs, Typography, Link as MuiLink } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

// Import các API/Hook tương ứng cho từng module
import { courseApi } from '@/api/courseApi';
import { documentApi } from '@/api/documentApi';
import { questionApi } from '@/api/questionApi';
import { examRoomApi } from '@/api/examRoomApi';
import { examPeriodApi } from '@/api/examPeriodApi';
import { useExamTemplate } from '@/hooks/useExamTemplates';

// Map route prefixes to breadcrumb labels
const routeMap: { prefix: string; label: string }[] = [
    { prefix: '/dashboard', label: 'Tổng quan' },
    { prefix: '/admin/courses', label: 'Quản lý khóa học' },
    { prefix: '/admin/documents', label: 'Quản lý tài liệu' },
    { prefix: '/admin/questions', label: 'Ngân hàng câu hỏi' },
    { prefix: '/admin/periods', label: 'Quản lý kỳ thi' },
    { prefix: '/admin/exams', label: 'Quản lý đề thi' },
    { prefix: '/admin/templates', label: 'Quản lý mẫu đề thi' }, // Đã sửa tên label cho chuẩn xác
    { prefix: '/admin/rooms', label: 'Quản lý phòng thi' },     // Đã sửa tên label cho chuẩn xác
    { prefix: '/admin/facilities', label: 'Cơ sở vật chất' },   // Đã sửa tên label cho chuẩn xác
    { prefix: '/admin/users', label: 'Quản lý người dùng' },
    { prefix: '/admin/departments', label: 'Quản lý phòng ban' },
    { prefix: '/admin/catalogs', label: 'Danh mục' },
    { prefix: '/admin/settings', label: 'Cấu hình' },
    { prefix: '/admin/audit-logs', label: 'Nhật ký hệ thống' },
    { prefix: '/admin/webhooks', label: 'Cấu hình webhooks' },
    { prefix: '/admin/approvals', label: 'Hộp duyệt' },
    { prefix: '/admin/reports', label: 'Thống kê & Báo cáo' },
    { prefix: '/exams', label: 'Luyện thi' },
    { prefix: '/official_exams', label: 'Kỳ thi' },
    { prefix: '/study', label: 'Học tập & Ôn luyện' },
    { prefix: '/my-courses', label: 'Học tập & Ôn luyện' },
    { prefix: '/my-documents', label: 'Học tập & Ôn luyện' },
    { prefix: '/ai-tutor', label: 'Học tập & Ôn luyện' },
    { prefix: '/practice', label: 'Luyện thi' },
    { prefix: '/certificates', label: 'Cá nhân & CĐ' },
    { prefix: '/achievements', label: 'Cá nhân & CĐ' },
    { prefix: '/profile', label: 'Cá nhân & CĐ' },
    { prefix: '/forum', label: 'Diễn đàn' },
    { prefix: '/exams/schedule', label: 'Kỳ thi' },
    { prefix: '/exams/history', label: 'Kỳ thi' },
    { prefix: '/exams/results', label: 'Kỳ thi' },
];

// Sub-route labels (last segment → label)
const subLabels: Record<string, string> = {
    create: 'Tạo mới',
    edit: 'Chỉnh sửa',
    courses: 'Khóa học',
    documents: 'Tài liệu',
    questions: 'Câu hỏi',
    exams: 'Đề thi',
    templates: 'Mẫu đề thi',
    rooms: 'Phòng thi',
    facilities: 'Cơ sở vật chất',
    users: 'Người dùng',
    departments: 'Phòng ban',
    catalogs: 'Danh mục',
    settings: 'Cấu hình',
    'audit-logs': 'Nhật ký hệ thống',
    webhooks: 'Webhooks',
    approvals: 'Hộp duyệt',
    reports: 'Báo cáo',
    schedule: 'Lịch thi',
    history: 'Lịch sử',
    generate: 'Tạo đề thi',
    submissions: 'Bài chấm',
};

export default function Breadcrumb() {
    const { pathname } = useLocation();

    // 1. Phân tích URL để xác định module (entityType) và ID (entityId) đang truy cập
    const pathParts = pathname.split('/').filter(Boolean);
    const isAdmin = pathParts[0] === 'admin';
    const entityType = isAdmin ? pathParts[1] : null; // vd: 'courses', 'documents', 'rooms'...
    const entityId = (isAdmin && pathParts.length >= 3 && pathParts[2] !== 'create') ? pathParts[2] : null;

    // 2. Fetch data tùy theo module đang truy cập (Lợi dụng bộ nhớ Cache của các trang Detail)
    const { data: course } = useQuery({
        queryKey: ['course', entityId],
        queryFn: () => courseApi.get(entityId || ''),
        enabled: entityType === 'courses' && !!entityId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: document } = useQuery({
        queryKey: ['document', entityId],
        queryFn: () => documentApi.get(entityId || ''),
        enabled: entityType === 'documents' && !!entityId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: question } = useQuery({
        queryKey: ['question', entityId],
        queryFn: () => questionApi.get(entityId || ''),
        enabled: entityType === 'questions' && !!entityId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: room } = useQuery({
        queryKey: ['exam-room', entityId],
        queryFn: () => examRoomApi.get(entityId || ''),
        enabled: entityType === 'rooms' && !!entityId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: period } = useQuery({
        queryKey: ['exam-period', entityId],
        queryFn: () => examPeriodApi.get(entityId || ''),
        enabled: entityType === 'periods' && !!entityId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: template } = useExamTemplate(entityType === 'templates' ? (entityId || '') : '');

    // 3. Gom nhóm dữ liệu đã fetch để map ID thành Text
    const entityNames: Record<string, string | undefined> = useMemo(() => ({
        courses: course?.title,
        documents: document?.title,
        questions: question ? 'Chi tiết câu hỏi' : undefined, // Câu hỏi thường không có title, chỉ có content nên ta hardcode chuỗi này
        rooms: room?.name,
        templates: template?.name,
        periods: period?.name,
    }), [course, document, question, room, template, period]);

    // 4. Sinh Breadcrumb Mảng
    const crumbs = useMemo(() => {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length === 0) return [];

        let parentLabel = '';
        let parentPath = '';

        for (const route of routeMap) {
            if (pathname.startsWith(route.prefix)) {
                parentLabel = route.label;
                parentPath = route.prefix;
                break;
            }
        }

        if (!parentLabel) return [];

        const result: { label: string; path: string; last?: boolean }[] = [
            { label: 'Trang chủ', path: '/dashboard' },
        ];

        if (pathname === parentPath || pathname + '/' === parentPath) {
            result.push({ label: parentLabel, path: parentPath, last: true });
            return result;
        } else {
            result.push({ label: parentLabel, path: parentPath });
        }

        const subPath = pathname.slice(parentPath.length).replace(/^\//, '');
        if (!subPath) return result;

        const segments = subPath.split('/');
        let currentPath = parentPath;

        segments.forEach((seg, index) => {
            currentPath += `/${seg}`;
            const isLast = index === segments.length - 1;

            if (subLabels[seg]) {
                // Nếu path là /edit, /create... thì lấy nhãn tương ứng
                result.push({ label: subLabels[seg], path: currentPath, last: isLast });
            } else if (seg === entityId && entityType && entityNames[entityType]) {
                // Nếu path trùng ID và đã fetch được tên từ API thì map tên
                result.push({ label: entityNames[entityType]!, path: currentPath, last: isLast });
            } else {
                // Rơi vào fallback mặc định (hiện nguyên chuỗi ID nếu data chưa kịp load hoặc không tìm thấy)
                result.push({ label: seg, path: currentPath, last: isLast });
            }
        });

        return result;
    }, [pathname, entityId, entityType, entityNames]);

    if (crumbs.length <= 1) return null;

    return (
        <Breadcrumbs
            aria-label="breadcrumb"
            sx={{ mb: 1.5 }}
            separator=">"
        >
            {crumbs.map((crumb, i) => {
                if (crumb.last) {
                    return (
                        <Typography key={i} variant="body2" color="text.primary" fontWeight={600}>
                            {crumb.label}
                        </Typography>
                    );
                }
                return (
                    <MuiLink
                        key={i}
                        component={Link}
                        to={crumb.path}
                        underline="hover"
                        color="text.secondary"
                        variant="body2"
                    >
                        {crumb.label}
                    </MuiLink>
                );
            })}
        </Breadcrumbs>
    );
}