"""Plugin-owned settings discovery."""
import hashlib
import os


def settings_sections():
    digest = hashlib.sha256()
    for relative in (
        "static/settings/main.js",
        "static/js/logging.js",
        "templates/logging_settings.jinja2",
        "static/clientjs/logging.js",
        "static/css/logging.css",
    ):
        with open(os.path.join(os.path.dirname(__file__), relative), "rb") as source:
            digest.update(source.read())
    return [
        {
            "id": "logging",
            "title": "Logs",
            "order": 150,
            "api_version": 1,
            "asset_version": digest.hexdigest()[:20],
            "module": "/plugin/logging/static/settings/main.js",
            "permissions": ["ADMIN", "PLUGIN_LOGGING_MANAGE"],
            "template": "logging_settings.jinja2",
        }
    ]
