from typing import Literal

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text

from app.api.schemas import DataResponse, Meta
from app.core.request_id import get_request_id
from app.db.session import AsyncSessionFactory

router = APIRouter(tags=["health"])


class HealthData(BaseModel):
    status: Literal["ok", "unavailable"]
    database: Literal["ok", "unavailable"] | None = None


@router.get("/health/live", response_model=DataResponse[HealthData])
async def live(request: Request) -> DataResponse[HealthData]:
    return DataResponse(
        data=HealthData(status="ok"),
        meta=Meta(request_id=get_request_id(request)),
    )


@router.get("/health/ready", response_model=DataResponse[HealthData])
async def ready(request: Request) -> DataResponse[HealthData] | JSONResponse:
    try:
        async with AsyncSessionFactory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "data": {"status": "unavailable", "database": "unavailable"},
                "meta": {"requestId": get_request_id(request)},
            },
        )
    return DataResponse(
        data=HealthData(status="ok", database="ok"),
        meta=Meta(request_id=get_request_id(request)),
    )
