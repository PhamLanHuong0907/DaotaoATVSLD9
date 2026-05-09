"""Aggregated inbox of items waiting for review/approval.

Pulls together TrainingDocument, Course, ExamTemplate, Question, ExamPeriod,
ExamRoom, and Exam that are in PENDING_REVIEW status. Single inbox the team
acts on — inline approval buttons elsewhere have been removed by design.
"""
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.api.deps import get_current_user, require_manager, require_staff
from app.models.enums import ApprovalStatus
from app.models.user import User
from app.models.review_comment import ReviewComment

router = APIRouter(prefix="/approvals", tags=["Approvals"])


PendingType = Literal[
    "document", "course", "exam_template", "question",
    "exam_period", "exam_room", "exam",
]


class PendingItem(BaseModel):
    id: str
    type: PendingType
    title: str
    created_by: str
    created_at: datetime
    occupation: Optional[str] = None
    skill_level: Optional[int] = None
    requested_to: Optional[str] = None
    requested_department_id: Optional[str] = None


class ApprovalSummary(BaseModel):
    total: int
    by_type: dict[str, int]
    items: list[PendingItem]


def _can_view_item(user: User, req_dept: Optional[str]) -> bool:
    if user.role == "admin":
        return True
    if not req_dept or req_dept == "all":
        return True
    return str(user.department_id) == req_dept


async def _get_item_if_can_view(type: PendingType, item_id: str, user: User):
    """Fetch item and ensure user can at least view/comment on it."""
    from app.models.document import TrainingDocument
    from app.models.course import Course
    from app.models.exam_template import ExamTemplate
    from app.models.question import Question
    from app.models.exam_period import ExamPeriod
    from app.models.exam_room import ExamRoom
    from app.models.exam import Exam

    item = None
    if type == "document":
        item = await TrainingDocument.get(PydanticObjectId(item_id))
    elif type == "course":
        item = await Course.get(PydanticObjectId(item_id))
    elif type == "exam_template":
        item = await ExamTemplate.get(PydanticObjectId(item_id))
    elif type == "question":
        item = await Question.get(PydanticObjectId(item_id))
    elif type == "exam_period":
        item = await ExamPeriod.get(PydanticObjectId(item_id))
    elif type == "exam_room":
        item = await ExamRoom.get(PydanticObjectId(item_id))
    elif type == "exam":
        item = await Exam.get(PydanticObjectId(item_id))
    else:
        raise HTTPException(400, "Unknown type")

    if not item:
        raise HTTPException(404, f"{type} not found")
    
    if not _can_view_item(user, getattr(item, "requested_department_id", None)):
        raise HTTPException(403, "Bạn không có quyền xem mục này")
        
    return item


@router.get("/inbox", response_model=ApprovalSummary)
async def inbox(
    type: Optional[PendingType] = None,
    user: User = Depends(get_current_user),
):
    """Return all items currently in PENDING_REVIEW status, optionally filtered by type."""
    from app.models.document import TrainingDocument
    from app.models.course import Course
    from app.models.exam_template import ExamTemplate
    from app.models.question import Question

    items: list[PendingItem] = []
    by_type: dict[str, int] = {}

    if type in (None, "document"):
        docs = await TrainingDocument.find(
            TrainingDocument.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        docs = [d for d in docs if _can_view_item(user, getattr(d, 'requested_department_id', None))]
        by_type["document"] = len(docs)
        for d in docs:
            items.append(PendingItem(
                id=str(d.id),
                type="document",
                title=d.title,
                created_by=d.uploaded_by,
                created_at=d.created_at,
                occupation=d.occupations[0] if d.occupations else None,
                skill_level=d.skill_levels[0] if d.skill_levels else None,
                requested_to=d.requested_to,
                requested_department_id=d.requested_department_id,
            ))

    if type in (None, "course"):
        courses = await Course.find(
            Course.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        courses = [c for c in courses if _can_view_item(user, getattr(c, 'requested_department_id', None))]
        by_type["course"] = len(courses)
        for c in courses:
            items.append(PendingItem(
                id=str(c.id),
                type="course",
                title=c.title,
                created_by=c.created_by,
                created_at=c.created_at,
                occupation=c.occupation,
                skill_level=c.skill_level,
                requested_to=c.requested_to,
                requested_department_id=c.requested_department_id,
            ))

    if type in (None, "exam_template"):
        templates = await ExamTemplate.find(
            ExamTemplate.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        templates = [t for t in templates if _can_view_item(user, getattr(t, 'requested_department_id', None))]
        by_type["exam_template"] = len(templates)
        for t in templates:
            items.append(PendingItem(
                id=str(t.id),
                type="exam_template",
                title=t.name,
                created_by=t.created_by,
                created_at=t.created_at,
                occupation=t.occupation,
                skill_level=t.skill_level,
                requested_to=t.requested_to,
                requested_department_id=t.requested_department_id,
            ))

    if type in (None, "question"):
        questions = await Question.find(
            Question.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        questions = [q for q in questions if _can_view_item(user, getattr(q, 'requested_department_id', None))]
        by_type["question"] = len(questions)
        for q in questions:
            items.append(PendingItem(
                id=str(q.id),
                type="question",
                title=q.content[:100],
                created_by=q.created_by,
                created_at=q.created_at,
                occupation=q.occupation,
                skill_level=q.skill_level,
                requested_to=q.requested_to,
                requested_department_id=q.requested_department_id,
            ))

    if type in (None, "exam_period"):
        from app.models.exam_period import ExamPeriod
        from datetime import timezone, timedelta
        vn_tz = timezone(timedelta(hours=7))
        periods = await ExamPeriod.find(
            ExamPeriod.approval_status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        periods = [p for p in periods if _can_view_item(user, getattr(p, 'requested_department_id', None))]
        by_type["exam_period"] = len(periods)
        for p in periods:
            items.append(PendingItem(
                id=str(p.id),
                type="exam_period",
                title=p.name,
                created_by=p.created_by,
                created_at=p.created_at,
                occupation=f"Bắt đầu: {p.start_date.astimezone(vn_tz).strftime('%d/%m/%Y %H:%M')}",
                skill_level=None,
                requested_to=p.requested_to,
                requested_department_id=p.requested_department_id,
            ))

    if type in (None, "exam_room"):
        from app.models.exam_room import ExamRoom
        from datetime import timezone, timedelta
        vn_tz = timezone(timedelta(hours=7))
        rooms = await ExamRoom.find(
            ExamRoom.approval_status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        rooms = [r for r in rooms if _can_view_item(user, getattr(r, 'requested_department_id', None))]
        by_type["exam_room"] = len(rooms)
        for r in rooms:
            items.append(PendingItem(
                id=str(r.id),
                type="exam_room",
                title=r.name,
                created_by=r.created_by,
                created_at=r.created_at,
                occupation=f"Lịch thi: {r.scheduled_start.astimezone(vn_tz).strftime('%d/%m/%Y %H:%M')}",
                skill_level=None,
                requested_to=r.requested_to,
                requested_department_id=r.requested_department_id,
            ))

    if type in (None, "exam"):
        from app.models.exam import Exam
        from app.models.exam_template import ExamTemplate
        exams = await Exam.find(
            Exam.status == ApprovalStatus.PENDING_REVIEW
        ).sort("-created_at").to_list()
        exams = [e for e in exams if _can_view_item(user, getattr(e, 'requested_department_id', None))]
        by_type["exam"] = len(exams)
        for e in exams:
            template_name = ""
            if e.template_id:
                t = await ExamTemplate.get(e.template_id)
                template_name = f" ({t.name})" if t else ""
            items.append(PendingItem(
                id=str(e.id),
                type="exam",
                title=f"{e.name}{template_name}",
                created_by=e.created_by,
                created_at=e.created_at,
                occupation=e.occupation,
                skill_level=e.skill_level,
                requested_to=e.requested_to,
                requested_department_id=e.requested_department_id,
            ))

    items.sort(key=lambda i: i.created_at, reverse=True)
    return ApprovalSummary(
        total=sum(by_type.values()),
        by_type=by_type,
        items=items,
    )


class ApproveRequest(BaseModel):
    review_notes: Optional[str] = None


async def _check_approve_permission(item, user: User):
    if user.role == "admin":
        return
    
    # Check department
    req_dept = getattr(item, "requested_department_id", None)
    if req_dept and req_dept != "all":
        if str(user.department_id) != req_dept:
            raise HTTPException(403, "Bạn không thuộc phòng ban được phân quyền duyệt")
            
    # Check specific reviewer
    req_to = getattr(item, "requested_to", None)
    if req_to and req_to != str(user.id):
        raise HTTPException(403, "Chỉ người duyệt cụ thể mới được thao tác phê duyệt")


@router.post("/{type}/{item_id}/approve")
async def approve_item(
    type: PendingType,
    item_id: str,
    data: ApproveRequest,
    user: User = Depends(require_manager()),
):
    """Only Admin/Manager can approve. Must check specific reviewer permission."""
    item = await _get_item_if_can_view(type, item_id, user)
    await _check_approve_permission(item, user)
    return await _set_status(type, item_id, ApprovalStatus.APPROVED, str(user.id), data.review_notes)


@router.post("/{type}/{item_id}/reject")
async def reject_item(
    type: PendingType,
    item_id: str,
    data: ApproveRequest,
    user: User = Depends(require_manager()),
):
    """Only Admin/Manager can reject. Must check specific reviewer permission."""
    item = await _get_item_if_can_view(type, item_id, user)
    await _check_approve_permission(item, user)
    return await _set_status(type, item_id, ApprovalStatus.REJECTED, str(user.id), data.review_notes)


class SubmitForReviewRequest(BaseModel):
    requested_to: Optional[str] = None
    requested_department_id: Optional[str] = None
    note: Optional[str] = None


@router.post("/{type}/{item_id}/submit-for-review")
async def submit_for_review(
    type: PendingType,
    item_id: str,
    data: SubmitForReviewRequest,
    user: User = Depends(require_staff()),
):
    """Submit a DRAFT or REJECTED item for manager review."""
    return await _submit_for_review(type, item_id, str(user.id), data.requested_to, data.requested_department_id, data.note)


async def _submit_for_review(
    type: PendingType,
    item_id: str,
    requester_id: str,
    requested_to: Optional[str],
    requested_department_id: Optional[str],
    note: Optional[str],
):
    now = datetime.now(timezone.utc)

    def _ensure_before_start(start: Optional[datetime], label: str) -> None:
        if start is None:
            return
        if start.tzinfo is None:
            start_aware = start.replace(tzinfo=timezone.utc)
        else:
            start_aware = start
        if now >= start_aware:
            raise HTTPException(
                400,
                f"Không thể gửi yêu cầu duyệt {label}: thời gian bắt đầu đã qua.",
            )

    common_update = {
        "requested_at": now,
        "requested_to": requested_to,
        "requested_department_id": requested_department_id,
        "review_notes": note,
        "updated_at": now,
    }

    if type == "document":
        from app.models.document import TrainingDocument
        d = await TrainingDocument.get(PydanticObjectId(item_id))
        if not d:
            raise HTTPException(404, "Document not found")
        if d.status not in (ApprovalStatus.DRAFT, ApprovalStatus.REJECTED):
            raise HTTPException(400, "Chỉ DRAFT hoặc REJECTED mới gửi yêu cầu duyệt được")
        await d.set({**common_update, "status": ApprovalStatus.PENDING_REVIEW})
        return {"id": str(d.id), "status": d.status}

    if type == "course":
        from app.models.course import Course
        c = await Course.get(PydanticObjectId(item_id))
        if not c:
            raise HTTPException(404, "Course not found")
        if c.status not in (ApprovalStatus.DRAFT, ApprovalStatus.REJECTED):
            raise HTTPException(400, "Chỉ DRAFT hoặc REJECTED mới gửi yêu cầu duyệt được")
        await c.set({**common_update, "status": ApprovalStatus.PENDING_REVIEW})
        return {"id": str(c.id), "status": c.status}

    if type == "exam_template":
        from app.models.exam_template import ExamTemplate
        t = await ExamTemplate.get(PydanticObjectId(item_id))
        if not t:
            raise HTTPException(404, "Exam template not found")
        if t.status not in (ApprovalStatus.DRAFT, ApprovalStatus.REJECTED):
            raise HTTPException(400, "Chỉ DRAFT hoặc REJECTED mới gửi yêu cầu duyệt được")
        await t.set({**common_update, "status": ApprovalStatus.PENDING_REVIEW})
        return {"id": str(t.id), "status": t.status}

    if type == "question":
        from app.models.question import Question
        q = await Question.get(PydanticObjectId(item_id))
        if not q:
            raise HTTPException(404, "Question not found")
        if q.status not in (ApprovalStatus.DRAFT, ApprovalStatus.REJECTED):
            raise HTTPException(400, "Chỉ DRAFT hoặc REJECTED mới gửi yêu cầu duyệt được")
        await q.set({**common_update, "status": ApprovalStatus.PENDING_REVIEW})
        return {"id": str(q.id), "status": q.status}

    if type == "exam_period":
        from app.models.exam_period import ExamPeriod
        p = await ExamPeriod.get(PydanticObjectId(item_id))
        if not p:
            raise HTTPException(404, "Exam period not found")
        if p.approval_status not in (ApprovalStatus.DRAFT, ApprovalStatus.REJECTED):
            raise HTTPException(400, "Chỉ DRAFT hoặc REJECTED mới gửi yêu cầu duyệt được")
        _ensure_before_start(p.start_date, "kỳ thi")
        await p.set({**common_update, "approval_status": ApprovalStatus.PENDING_REVIEW})
        return {"id": str(p.id), "status": p.approval_status}

    if type == "exam_room":
        from app.models.exam_room import ExamRoom
        r = await ExamRoom.get(PydanticObjectId(item_id))
        if not r:
            raise HTTPException(404, "Exam room not found")
        if r.approval_status not in (ApprovalStatus.DRAFT, ApprovalStatus.REJECTED):
            raise HTTPException(400, "Chỉ DRAFT hoặc REJECTED mới gửi yêu cầu duyệt được")
        _ensure_before_start(r.scheduled_start, "phòng thi")
        await r.set({**common_update, "approval_status": ApprovalStatus.PENDING_REVIEW})
        return {"id": str(r.id), "status": r.approval_status}

    if type == "exam":
        from app.models.exam import Exam
        e = await Exam.get(PydanticObjectId(item_id))
        if not e:
            raise HTTPException(404, "Exam not found")
        if e.status not in (ApprovalStatus.DRAFT, ApprovalStatus.REJECTED):
            raise HTTPException(400, "Chỉ DRAFT hoặc REJECTED mới gửi yêu cầu duyệt được")
        _ensure_before_start(e.scheduled_date, "đề thi")
        await e.set({**common_update, "status": ApprovalStatus.PENDING_REVIEW})
        return {"id": str(e.id), "status": e.status}

    raise HTTPException(400, f"Unknown type: {type}")


async def _set_status(
    type: PendingType,
    item_id: str,
    status: ApprovalStatus,
    reviewer_id: str,
    notes: Optional[str],
):
    if type == "document":
        from app.services import document_service
        doc = await document_service.update_document_status(item_id, status, reviewer_id, notes)
        if not doc:
            raise HTTPException(404, "Document not found")
        return {"id": str(doc.id), "status": doc.status}

    if type == "course":
        from app.services import course_service
        c = await course_service.update_course_status(item_id, status, reviewer_id, notes)
        if not c:
            raise HTTPException(404, "Course not found")
        return {"id": str(c.id), "status": c.status}

    if type == "exam_template":
        from app.services import exam_service
        t = await exam_service.update_template_status(item_id, status, reviewer_id)
        if not t:
            raise HTTPException(404, "Exam template not found")
        return {"id": str(t.id), "status": t.status}

    if type == "question":
        from app.models.question import Question
        q = await Question.get(PydanticObjectId(item_id))
        if not q:
            raise HTTPException(404, "Question not found")
        q.status = status
        q.reviewed_by = reviewer_id
        if notes:
            q.review_notes = notes
        if status == ApprovalStatus.APPROVED:
            q.approved_at = datetime.now(timezone.utc)
        q.updated_at = datetime.now(timezone.utc)
        await q.save()
        return {"id": str(q.id), "status": q.status}

    if type == "exam_period":
        from app.services import exam_period_service
        p = await exam_period_service.update_period_approval(item_id, status, reviewer_id, notes)
        if not p:
            raise HTTPException(404, "Exam period not found")
        return {"id": str(p.id), "status": p.approval_status}

    if type == "exam_room":
        from app.services import exam_period_service
        r = await exam_period_service.update_room_approval(item_id, status, reviewer_id, notes)
        if not r:
            raise HTTPException(404, "Exam room not found")
        return {"id": str(r.id), "status": r.approval_status}

    if type == "exam":
        from app.services import exam_service
        e = await exam_service.update_exam_approval(item_id, status, reviewer_id, notes)
        if not e:
            raise HTTPException(404, "Exam not found")
        return {"id": str(e.id), "status": e.status}

    raise HTTPException(400, f"Unknown type: {type}")


# ---------------- COMMENTS ENDPOINTS ----------------

class CommentRequest(BaseModel):
    content: str

@router.get("/{type}/{item_id}/comments")
async def get_comments(
    type: PendingType,
    item_id: str,
    user: User = Depends(require_staff()),
):
    await _get_item_if_can_view(type, item_id, user)
    comments = await ReviewComment.find(
        ReviewComment.target_type == type,
        ReviewComment.target_id == item_id
    ).sort("created_at").to_list()
    return comments

@router.post("/{type}/{item_id}/comments")
async def add_comment(
    type: PendingType,
    item_id: str,
    data: CommentRequest,
    user: User = Depends(require_staff()),
):
    await _get_item_if_can_view(type, item_id, user)
    comment = ReviewComment(
        target_type=type,
        target_id=item_id,
        user_id=str(user.id),
        user_name=user.full_name,
        department_id=str(user.department_id) if user.department_id else None,
        content=data.content,
    )
    await comment.insert()
    return {"id": str(comment.id)}