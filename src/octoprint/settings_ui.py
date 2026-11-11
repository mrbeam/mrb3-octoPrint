"""Native OctoPrint settings providers for a machine-hosted settings shell."""
import hashlib
from pathlib import Path


def settings_sections():
    root = Path(__file__).parent
    digest = hashlib.sha256()
    paths = [
        root / "static/settings/access.js",
        root / "static/settings/access.css",
        root / "static/js/app/viewmodels/access.js",
        root / "static/js/app/client/access.js",
        root / "templates/dialogs/settings/accesscontrol.jinja2",
    ]
    paths.extend(
        sorted((root / "templates/snippets/settings/accesscontrol").glob("*.jinja2"))
    )
    for path in paths:
        digest.update(str(path.relative_to(root)).encode())
        digest.update(path.read_bytes())
    return [
        {
            "id": "users",
            "title": "Access Control",
            "order": 20,
            "api_version": 1,
            "asset_version": digest.hexdigest()[:20],
            "module": "/static/settings/access.js",
            "permissions": ["ADMIN"],
            "template": "dialogs/settings/accesscontrol.jinja2",
            "context": access_context,
        }
    ]


def access_context():
    from octoprint.access.permissions import Permissions

    return {
        "settings_provider_data": {
            "permissions": [permission.as_dict() for permission in Permissions.all()]
        }
    }
