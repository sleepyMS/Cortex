"""Descriptive message about your changes

Revision ID: 5a0622ae4794
Revises: 
Create Date: 2025-07-31 21:22:06.394468

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a0622ae4794'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('plans',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=50), nullable=False),
    sa.Column('price', sa.Float(), nullable=False),
    sa.Column('features', sa.JSON(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_plans_id'), 'plans', ['id'], unique=False)
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('username', sa.String(length=100), nullable=True),
    sa.Column('hashed_password', sa.String(length=255), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('is_email_verified', sa.Boolean(), nullable=False),
    sa.Column('role', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_table('api_keys',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('exchange', sa.String(length=100), nullable=False),
    sa.Column('api_key_encrypted', sa.String(length=512), nullable=False),
    sa.Column('secret_key_encrypted', sa.String(length=512), nullable=False),
    sa.Column('memo', sa.String(length=255), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'exchange', name='_user_exchange_uc')
    )
    op.create_index(op.f('ix_api_keys_id'), 'api_keys', ['id'], unique=False)
    op.create_table('email_verification_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('jti', sa.String(length=255), nullable=False),
    sa.Column('hashed_token', sa.String(length=512), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('is_used', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'jti', name='_user_email_verif_jti_uc')
    )
    op.create_index(op.f('ix_email_verification_tokens_id'), 'email_verification_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_email_verification_tokens_jti'), 'email_verification_tokens', ['jti'], unique=True)
    op.create_table('password_reset_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('jti', sa.String(length=255), nullable=False),
    sa.Column('hashed_token', sa.String(length=512), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('is_used', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'jti', name='_user_password_reset_jti_uc')
    )
    op.create_index(op.f('ix_password_reset_tokens_id'), 'password_reset_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_password_reset_tokens_jti'), 'password_reset_tokens', ['jti'], unique=True)
    op.create_table('refresh_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('jti', sa.String(length=255), nullable=False),
    sa.Column('hashed_token', sa.String(length=512), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('is_revoked', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'jti', name='_user_jti_uc')
    )
    op.create_index(op.f('ix_refresh_tokens_id'), 'refresh_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_jti'), 'refresh_tokens', ['jti'], unique=True)
    op.create_table('social_accounts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('provider', sa.String(length=50), nullable=False),
    sa.Column('provider_user_id', sa.String(length=255), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('username', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider', 'provider_user_id', name='_provider_user_uc')
    )
    op.create_index(op.f('ix_social_accounts_email'), 'social_accounts', ['email'], unique=True)
    op.create_index(op.f('ix_social_accounts_id'), 'social_accounts', ['id'], unique=False)
    op.create_table('strategies',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('author_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('rules', sa.JSON(), nullable=False),
    sa.Column('is_public', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_strategies_id'), 'strategies', ['id'], unique=False)
    op.create_table('subscriptions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('plan_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=False),
    sa.Column('payment_gateway_sub_id', sa.String(length=255), nullable=True),
    sa.Column('refresh_token', sa.String(length=512), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('payment_gateway_sub_id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_subscriptions_id'), 'subscriptions', ['id'], unique=False)
    op.create_table('backtests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('strategy_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('parameters', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['strategy_id'], ['strategies.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_backtests_id'), 'backtests', ['id'], unique=False)
    op.create_table('live_bots',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('strategy_id', sa.Integer(), nullable=False),
    sa.Column('api_key_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('stopped_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('initial_capital', sa.Float(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], ),
    sa.ForeignKeyConstraint(['strategy_id'], ['strategies.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_live_bots_id'), 'live_bots', ['id'], unique=False)
    op.create_table('backtest_results',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('backtest_id', sa.Integer(), nullable=False),
    sa.Column('total_return_pct', sa.Float(), nullable=True),
    sa.Column('mdd_pct', sa.Float(), nullable=True),
    sa.Column('sharpe_ratio', sa.Float(), nullable=True),
    sa.Column('win_rate_pct', sa.Float(), nullable=True),
    sa.Column('pnl_curve_json', sa.JSON(), nullable=True),
    sa.Column('trade_summary_json', sa.JSON(), nullable=True),
    sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['backtest_id'], ['backtests.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('backtest_id')
    )
    op.create_index(op.f('ix_backtest_results_id'), 'backtest_results', ['id'], unique=False)
    op.create_table('community_posts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('author_id', sa.Integer(), nullable=False),
    sa.Column('backtest_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['backtest_id'], ['backtests.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('backtest_id')
    )
    op.create_index(op.f('ix_community_posts_created_at'), 'community_posts', ['created_at'], unique=False)
    op.create_index(op.f('ix_community_posts_id'), 'community_posts', ['id'], unique=False)
    op.create_table('trade_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('backtest_id', sa.Integer(), nullable=True),
    sa.Column('live_bot_id', sa.Integer(), nullable=True),
    sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
    sa.Column('side', sa.String(length=10), nullable=False),
    sa.Column('price', sa.Float(), nullable=False),
    sa.Column('quantity', sa.Float(), nullable=False),
    sa.Column('commission', sa.Float(), nullable=True),
    sa.Column('pnl', sa.Float(), nullable=True),
    sa.Column('current_balance', sa.Float(), nullable=True),
    sa.CheckConstraint('(backtest_id IS NOT NULL AND live_bot_id IS NULL) OR (backtest_id IS NULL AND live_bot_id IS NOT NULL)', name='_trade_log_exclusive_parent_check'),
    sa.ForeignKeyConstraint(['backtest_id'], ['backtests.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['live_bot_id'], ['live_bots.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trade_logs_id'), 'trade_logs', ['id'], unique=False)
    op.create_index(op.f('ix_trade_logs_timestamp'), 'trade_logs', ['timestamp'], unique=False)
    op.create_table('comments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('post_id', sa.Integer(), nullable=False),
    sa.Column('author_id', sa.Integer(), nullable=False),
    sa.Column('content', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['post_id'], ['community_posts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_comments_id'), 'comments', ['id'], unique=False)
    op.create_table('likes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('post_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['post_id'], ['community_posts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'post_id', name='_user_post_uc')
    )
    op.create_index(op.f('ix_likes_id'), 'likes', ['id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_likes_id'), table_name='likes')
    op.drop_table('likes')
    op.drop_index(op.f('ix_comments_id'), table_name='comments')
    op.drop_table('comments')
    op.drop_index(op.f('ix_trade_logs_timestamp'), table_name='trade_logs')
    op.drop_index(op.f('ix_trade_logs_id'), table_name='trade_logs')
    op.drop_table('trade_logs')
    op.drop_index(op.f('ix_community_posts_id'), table_name='community_posts')
    op.drop_index(op.f('ix_community_posts_created_at'), table_name='community_posts')
    op.drop_table('community_posts')
    op.drop_index(op.f('ix_backtest_results_id'), table_name='backtest_results')
    op.drop_table('backtest_results')
    op.drop_index(op.f('ix_live_bots_id'), table_name='live_bots')
    op.drop_table('live_bots')
    op.drop_index(op.f('ix_backtests_id'), table_name='backtests')
    op.drop_table('backtests')
    op.drop_index(op.f('ix_subscriptions_id'), table_name='subscriptions')
    op.drop_table('subscriptions')
    op.drop_index(op.f('ix_strategies_id'), table_name='strategies')
    op.drop_table('strategies')
    op.drop_index(op.f('ix_social_accounts_id'), table_name='social_accounts')
    op.drop_index(op.f('ix_social_accounts_email'), table_name='social_accounts')
    op.drop_table('social_accounts')
    op.drop_index(op.f('ix_refresh_tokens_jti'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_id'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    op.drop_index(op.f('ix_password_reset_tokens_jti'), table_name='password_reset_tokens')
    op.drop_index(op.f('ix_password_reset_tokens_id'), table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
    op.drop_index(op.f('ix_email_verification_tokens_jti'), table_name='email_verification_tokens')
    op.drop_index(op.f('ix_email_verification_tokens_id'), table_name='email_verification_tokens')
    op.drop_table('email_verification_tokens')
    op.drop_index(op.f('ix_api_keys_id'), table_name='api_keys')
    op.drop_table('api_keys')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_plans_id'), table_name='plans')
    op.drop_table('plans')
    # ### end Alembic commands ###
