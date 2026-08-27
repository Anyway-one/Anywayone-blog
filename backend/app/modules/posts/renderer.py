import math
import re
from dataclasses import dataclass
from typing import Any

import nh3
from markdown_it import MarkdownIt
from markdown_it.token import Token

from app.api.schemas import to_camel

markdown = MarkdownIt(
    "commonmark",
    {"html": False, "linkify": False, "typographer": False},
).enable("table")

HEADING_TAGS = {f"h{level}" for level in range(1, 7)}
ALLOWED_ATTRIBUTES = {tag: {"id"} for tag in HEADING_TAGS}
ALLOWED_ATTRIBUTES.update(
    {
        "a": {"href", "title", "target"},
        "code": {"class"},
        "img": {"src", "alt", "title", "width", "height", "loading"},
    }
)


@dataclass(frozen=True)
class RenderedMarkdown:
    html: str
    toc: list[dict[str, Any]]
    reading_time_minutes: int


def render_markdown(source: str) -> RenderedMarkdown:
    tokens = markdown.parse(source)
    toc = _decorate_headings(tokens)
    rendered = markdown.renderer.render(tokens, markdown.options, {})
    safe_html = nh3.clean(
        rendered,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer",
    )
    return RenderedMarkdown(
        html=safe_html,
        toc=toc,
        reading_time_minutes=_reading_time(source),
    )


def _decorate_headings(tokens: list[Token]) -> list[dict[str, Any]]:
    toc: list[dict[str, Any]] = []
    used_ids: dict[str, int] = {}
    for index, token in enumerate(tokens):
        if token.type != "heading_open" or index + 1 >= len(tokens):
            continue
        inline = tokens[index + 1]
        title = inline.content.strip()
        level = int(token.tag[1])
        base_id = _heading_id(title) or f"section-{len(toc) + 1}"
        occurrence = used_ids.get(base_id, 0) + 1
        used_ids[base_id] = occurrence
        heading_id = base_id if occurrence == 1 else f"{base_id}-{occurrence}"
        token.attrSet("id", heading_id)
        toc.append(
            {
                to_camel("id"): heading_id,
                to_camel("title"): title,
                to_camel("level"): level,
            }
        )
    return toc


def _heading_id(title: str) -> str:
    value = title.strip().lower()
    value = re.sub(r"[^\w\u4e00-\u9fff]+", "-", value, flags=re.UNICODE)
    return value.strip("-")[:80]


def _reading_time(source: str) -> int:
    without_code = re.sub(r"```.*?```|`[^`]*`", " ", source, flags=re.DOTALL)
    cjk_count = len(re.findall(r"[\u3400-\u9fff]", without_code))
    word_count = len(re.findall(r"\b[A-Za-z0-9][A-Za-z0-9_-]*\b", without_code))
    equivalent_words = word_count + cjk_count / 2
    return max(1, math.ceil(equivalent_words / 220))
