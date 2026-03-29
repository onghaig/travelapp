import json
import os
import redis.asyncio as aioredis
from typing import Optional


class RedisClient:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = aioredis.from_url(redis_url, decode_responses=True)

    async def disconnect(self):
        if self.redis:
            await self.redis.aclose()

    async def get_trip_state(self, trip_id: str) -> dict:
        if not self.redis:
            return {}
        data = await self.redis.get(f"trip_state:{trip_id}")
        if data:
            return json.loads(data)
        return {}

    async def set_trip_state(self, trip_id: str, state: dict, ttl: int = 86400):
        if not self.redis:
            return
        await self.redis.set(
            f"trip_state:{trip_id}",
            json.dumps(state),
            ex=ttl,
        )

    async def get_messages(self, trip_id: str) -> list:
        if not self.redis:
            return []
        data = await self.redis.get(f"messages:{trip_id}")
        if data:
            return json.loads(data)
        return []

    async def set_messages(self, trip_id: str, messages: list, ttl: int = 86400):
        if not self.redis:
            return
        await self.redis.set(
            f"messages:{trip_id}",
            json.dumps(messages),
            ex=ttl,
        )

    async def ping(self) -> bool:
        if not self.redis:
            return False
        try:
            await self.redis.ping()
            return True
        except Exception:
            return False


redis_client = RedisClient()
