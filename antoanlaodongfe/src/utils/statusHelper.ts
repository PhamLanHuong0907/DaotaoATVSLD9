import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(tz);

export type StatusColor = 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary';
const VN_TZ = 'Asia/Ho_Chi_Minh';

export function getUnifiedStatus(item: any, type: 'period' | 'room' | 'template' | 'exam'): { label: string; color: StatusColor } {
  // 1. Hard overrides if cancelled
  if (item.status === 'cancelled') {
    return { label: 'Đã huỷ', color: 'error' };
  }

  const approvalStatus = item.approval_status || item.status; // Template uses status as approval

  // 2. Draft or Rejected
  if (approvalStatus === 'draft') return { label: 'Nháp', color: 'default' };
  if (approvalStatus === 'pending_review') return { label: 'Chờ duyệt', color: 'warning' };
  if (approvalStatus === 'rejected') return { label: 'Đã từ chối duyệt', color: 'error' };

  // 3. Approved -> time based logic
  if (approvalStatus === 'approved') {
    if (type === 'template') {
      return { label: 'Đã lên lịch', color: 'info' };
    }

    const startField = (type === 'period') ? item.start_date : item.scheduled_start;
    const endField = (type === 'period') ? item.end_date : item.scheduled_end;

    if (!startField || !endField) {
      return { label: 'Đã lên lịch', color: 'info' };
    }

    const now = dayjs().tz(VN_TZ);
    const start = dayjs(startField).tz(VN_TZ);
    const end = dayjs(endField).tz(VN_TZ);

    if (now.isBefore(start)) {
      return { label: 'Đã lên lịch', color: 'info' };
    }
    if (now.isAfter(end)) {
      return { label: 'Đã kết thúc', color: 'default' };
    }

    return { label: 'Đang diễn ra', color: 'success' };
  }

  return { label: 'Nháp', color: 'default' };
}
