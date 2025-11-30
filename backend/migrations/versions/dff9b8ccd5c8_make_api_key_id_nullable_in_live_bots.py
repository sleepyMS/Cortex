"""make api_key_id nullable in live_bots

Revision ID: dff9b8ccd5c8
Revises: c60503499d80
Create Date: 2025-12-01 02:32:18.170914

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dff9b8ccd5c8'
down_revision: Union[str, Sequence[str], None] = 'c60503499d80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make api_key_id nullable to support paper trading mode
    op.alter_column('live_bots', 'api_key_id',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Revert api_key_id to NOT NULL
    op.alter_column('live_bots', 'api_key_id',
               existing_type=sa.UUID(),
               nullable=False)
