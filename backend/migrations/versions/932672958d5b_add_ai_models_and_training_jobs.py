"""add_ai_models_and_training_jobs

Revision ID: 932672958d5b
Revises: 62a30a43a991
Create Date: 2025-12-23 05:34:20.655159

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '932672958d5b'
down_revision: Union[str, Sequence[str], None] = '62a30a43a991'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - AI 모델 관련 테이블 생성"""
    
    # 1. AI 모델 메타데이터 테이블
    op.create_table('ai_models',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('model_type', sa.String(length=50), nullable=False),
        sa.Column('architecture_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('feature_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('labeling_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('training_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('training_symbol', sa.String(length=50), nullable=False),
        sa.Column('training_timeframe', sa.String(length=10), nullable=False),
        sa.Column('training_start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('training_end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('training_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('validation_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('model_weights_path', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'TRAINING', 'COMPLETED', 'FAILED', name='aimodelstatus'), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_models_status'), 'ai_models', ['status'], unique=False)
    op.create_index(op.f('ix_ai_models_user_id'), 'ai_models', ['user_id'], unique=False)
    
    # 2. AI 학습 작업 추적 테이블
    op.create_table('ai_training_jobs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('model_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('progress_pct', sa.Integer(), nullable=False),
        sa.Column('current_epoch', sa.Integer(), nullable=True),
        sa.Column('total_epochs', sa.Integer(), nullable=True),
        sa.Column('current_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('celery_task_id', sa.String(length=255), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['model_id'], ['ai_models.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_training_jobs_celery_task_id'), 'ai_training_jobs', ['celery_task_id'], unique=False)
    op.create_index(op.f('ix_ai_training_jobs_model_id'), 'ai_training_jobs', ['model_id'], unique=False)
    op.create_index(op.f('ix_ai_training_jobs_user_id'), 'ai_training_jobs', ['user_id'], unique=False)
    
    # 3. 구매한 AI 모델 소유권 테이블
    op.create_table('user_purchased_ai_models',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('ai_model_id', sa.UUID(), nullable=False),
        sa.Column('order_item_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['ai_model_id'], ['ai_models.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['order_item_id'], ['marketplace_order_items.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'ai_model_id', name='_user_ai_model_uc')
    )
    op.create_index(op.f('ix_user_purchased_ai_models_ai_model_id'), 'user_purchased_ai_models', ['ai_model_id'], unique=False)
    op.create_index(op.f('ix_user_purchased_ai_models_user_id'), 'user_purchased_ai_models', ['user_id'], unique=False)
    
    # ⚠️ 주의: OHLCV 하이퍼테이블 관련 코드는 의도적으로 제거됨
    # Alembic이 자동 생성한 drop_table 명령은 시계열 데이터를 모두 삭제하므로 위험함


def downgrade() -> None:
    """Downgrade schema - AI 모델 관련 테이블 삭제"""
    
    # AI 관련 테이블만 삭제 (OHLCV 테이블은 건드리지 않음!)
    op.drop_index(op.f('ix_user_purchased_ai_models_user_id'), table_name='user_purchased_ai_models')
    op.drop_index(op.f('ix_user_purchased_ai_models_ai_model_id'), table_name='user_purchased_ai_models')
    op.drop_table('user_purchased_ai_models')
    
    op.drop_index(op.f('ix_ai_training_jobs_user_id'), table_name='ai_training_jobs')
    op.drop_index(op.f('ix_ai_training_jobs_model_id'), table_name='ai_training_jobs')
    op.drop_index(op.f('ix_ai_training_jobs_celery_task_id'), table_name='ai_training_jobs')
    op.drop_table('ai_training_jobs')
    
    op.drop_index(op.f('ix_ai_models_user_id'), table_name='ai_models')
    op.drop_index(op.f('ix_ai_models_status'), table_name='ai_models')
    op.drop_table('ai_models')
    
    # Enum 타입 삭제
    op.execute("DROP TYPE IF EXISTS aimodelstatus")
