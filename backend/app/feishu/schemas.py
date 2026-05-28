from pydantic import BaseModel, ConfigDict


class FeishuConfigOut(BaseModel):
    has_webhook: bool
    push_weekly: bool
    push_monthly: bool
    push_hour: int
    enabled: bool


class FeishuConfigUpdate(BaseModel):
    webhook_url: str | None = None
    push_weekly: bool | None = None
    push_monthly: bool | None = None
    push_hour: int | None = None
    enabled: bool | None = None
