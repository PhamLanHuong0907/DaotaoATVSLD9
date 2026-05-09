from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone

class ReviewComment(Document):
    target_type: str
    target_id: str
    user_id: str
    user_name: str
    department_id: Optional[str] = None
    content: str
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "review_comments"
        indexes = ["target_type", "target_id", "department_id", "created_at"]
