from app.modules.posts.renderer import render_markdown


def test_renderer_creates_unique_toc_ids() -> None:
    result = render_markdown("# 标题\n\n## 标题\n\n正文")

    assert result.toc == [
        {"id": "标题", "title": "标题", "level": 1},
        {"id": "标题-2", "title": "标题", "level": 2},
    ]
    assert 'id="标题"' in result.html
    assert result.reading_time_minutes == 1


def test_renderer_does_not_allow_raw_script() -> None:
    result = render_markdown("<script>alert('xss')</script>\n\n[bad](javascript:alert(1))")

    assert "<script" not in result.html
    assert 'href="javascript:' not in result.html
