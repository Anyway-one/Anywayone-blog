from ipaddress import ip_address

from fastapi import Request

from app.core.config import get_settings


def get_client_ip(request: Request) -> str | None:
    direct_ip = request.client.host if request.client else None
    if not get_settings().trusted_proxy_headers:
        return direct_ip

    forwarded_ip = request.headers.get("cf-connecting-ip")
    if not forwarded_ip:
        forwarded_for = request.headers.get("x-forwarded-for")
        forwarded_ip = forwarded_for.split(",", 1)[0].strip() if forwarded_for else None
    if not forwarded_ip:
        return direct_ip
    try:
        return str(ip_address(forwarded_ip))
    except ValueError:
        return direct_ip


def get_trusted_location(request: Request) -> tuple[str | None, str | None, str | None]:
    if not get_settings().trusted_proxy_headers:
        return None, None, None
    return (
        _clean_header(
            request.headers.get("cf-ipcountry") or request.headers.get("x-vercel-ip-country")
        ),
        _clean_header(request.headers.get("x-vercel-ip-country-region")),
        _clean_header(request.headers.get("x-vercel-ip-city")),
    )


def _clean_header(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    return cleaned[:120] or None
