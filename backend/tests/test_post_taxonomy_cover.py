import uuid
from datetime import UTC, datetime

from app.modules.posts.models import Post
from app.modules.posts.schemas import PublicPostListItem
from app.modules.posts.service import validate_publication


def test_public_post_serializes_taxonomy_and_cover_as_camel_case() -> None:
    category_id = uuid.uuid4()
    tag_id = uuid.uuid4()
    media_id = uuid.uuid4()
    item = PublicPostListItem.model_validate(
        {
            "id": uuid.uuid4(),
            "title": "文章标题",
            "slug": "example-post",
            "excerpt": "摘要",
            "category": {"id": category_id, "name": "技术", "slug": "technology"},
            "tags": [{"id": tag_id, "name": "Python", "slug": "python"}],
            "cover_media": {
                "id": media_id,
                "public_url": "https://api.anywayone.com/media/cover.webp",
                "width": 1600,
                "height": 900,
            },
            "cover_alt": "文章封面",
            "reading_time_minutes": 3,
            "published_at": datetime(2026, 8, 27, tzinfo=UTC),
        }
    )

    data = item.model_dump(by_alias=True, mode="json")

    assert data["category"]["id"] == str(category_id)
    assert data["tags"][0]["id"] == str(tag_id)
    assert data["coverMedia"] == {
        "id": str(media_id),
        "publicUrl": "https://api.anywayone.com/media/cover.webp",
        "width": 1600,
        "height": 900,
    }
    assert data["coverAlt"] == "文章封面"


def test_cover_requires_alternative_text_before_publication() -> None:
    post = Post(
        author_id=uuid.uuid4(),
        title="文章标题",
        slug="example-post",
        markdown="正文",
        cover_media_id=uuid.uuid4(),
        cover_alt="",
    )

    result = validate_publication(post)

    assert result.valid is False
    assert [issue.field for issue in result.issues] == ["coverAlt"]
