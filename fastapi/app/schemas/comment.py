from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CommentBase(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CommentCreate(CommentBase):
    pass


class Comment(CommentBase):
    id: int
    task_id: int
    author_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
