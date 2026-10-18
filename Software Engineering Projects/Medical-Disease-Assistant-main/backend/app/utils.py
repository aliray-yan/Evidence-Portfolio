"""
Utility functions
"""

from datetime import datetime, date
from typing import Any
import json


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder for datetime objects"""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def format_datetime(dt: datetime) -> str:
    """Format datetime for display"""
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_date(d: date) -> str:
    """Format date for display"""
    if d is None:
        return ""
    return d.strftime("%Y-%m-%d")


def calculate_age(birth_date: date) -> int:
    """Calculate age from birth date"""
    if birth_date is None:
        return 0
    today = date.today()
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )