from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from shared.infrastructure.config.settings import settings

engine = create_async_engine(
    url=f"postgresql+psycopg://neondb_owner:npg_SU3FAZu9bMei@ep-cold-math-a1jx3m56-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    echo=settings.ENVIRONMENT == "dev",
    future=True,
)


async def get_session():
    async with AsyncSession(engine) as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        from chat.domain.entities import UserConversation

        await conn.run_sync(SQLModel.metadata.create_all)
