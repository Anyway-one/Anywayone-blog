from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(word.capitalize() for word in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class Meta(ApiModel):
    request_id: str


class PageMeta(Meta):
    page: int
    page_size: int
    total: int
    total_pages: int


class DataResponse(ApiModel, Generic[T]):
    data: T
    meta: Meta


class PaginatedResponse(ApiModel, Generic[T]):
    data: list[T]
    meta: PageMeta


class MessageData(ApiModel):
    message: str


JsonObject = dict[str, Any]
