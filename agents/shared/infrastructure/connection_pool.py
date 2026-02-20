from psycopg_pool import AsyncConnectionPool
from loguru import logger
from typing import Optional
from shared.infrastructure.config.settings import settings

connection_pool: Optional[AsyncConnectionPool] = None


async def init_connection_pool() -> AsyncConnectionPool:
    """
    Initialize async connection pool for postgres
    """
    global connection_pool

    try:
        pool_size = settings.CONNECTION_POOL_SIZE

        connection_pool = AsyncConnectionPool(
            conninfo=f"postgres://neondb_owner:npg_SU3FAZu9bMei@ep-cold-math-a1jx3m56-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            open=False,
            max_size=pool_size,
            kwargs={
                "autocommit": True,
                "connect_timeout": 5,
                "prepare_threshold": None,
            },
        )
        await connection_pool.open()
        logger.info(
            "Connection pool created, pool size: {pool_size}", pool_size=pool_size
        )
        return connection_pool
    except Exception as e:
        logger.error("Error creating connection pool {error}", error=str(e))
        raise e


async def close_pool():
    global connection_pool
    if connection_pool is not None:
        try:
            await connection_pool.close()
            logger.info("Connection pool closed")
        except Exception as e:
            logger.error("Error closing connection pool {error}", error=str(e))
            raise e


async def get_connection_pool() -> AsyncConnectionPool:
    global connection_pool
    if connection_pool is None:
        connection_pool = await init_connection_pool()
    return connection_pool
