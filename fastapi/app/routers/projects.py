from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.label import Label as LabelModel
from app.models.project import Project as ProjectModel
from app.models.user import User
from app.schemas.label import Label as LabelSchema
from app.schemas.label import LabelCreate
from app.schemas.project import Project as ProjectSchema
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.project_service import (
    create_project,
    delete_project,
    get_project,
    get_projects,
    update_project,
)
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSchema])
def list_projects(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[ProjectModel]:
    """List all projects for current user"""
    return get_projects(db, current_user)


@router.post("", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
def create_new_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectModel:
    """Create a new project"""
    return create_project(db, project_data, current_user)


@router.get("/{project_id}", response_model=ProjectSchema)
def get_project_by_id(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> ProjectModel:
    """Get a specific project"""
    return get_project(db, project_id, current_user)


@router.put("/{project_id}", response_model=ProjectSchema)
def update_project_by_id(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectModel:
    """Update a project"""
    return update_project(db, project_id, project_data, current_user)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_by_id(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    """Delete a project"""
    delete_project(db, project_id, current_user)
    return None


# Intentional inconsistency: inline logic instead of service layer
@router.get("/{project_id}/labels", response_model=list[LabelSchema])
def get_project_labels(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[LabelModel]:
    """Get labels for a project"""
    # Inline check without service layer
    get_project(db, project_id, current_user)
    labels = db.query(LabelModel).filter(LabelModel.project_id == project_id).all()
    return labels


# Intentional inconsistency: minimal validation
@router.post(
    "/{project_id}/labels",
    response_model=LabelSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_project_label(
    project_id: int,
    label_data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LabelModel:
    """Create a label for a project"""
    get_project(db, project_id, current_user)
    label = LabelModel(**label_data.model_dump(), project_id=project_id)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label
