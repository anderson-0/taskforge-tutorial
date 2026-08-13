from pydantic import BaseModel, ConfigDict, Field


class LabelBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")


class LabelCreate(LabelBase):
    pass


class Label(LabelBase):
    id: int
    project_id: int

    model_config = ConfigDict(from_attributes=True)
