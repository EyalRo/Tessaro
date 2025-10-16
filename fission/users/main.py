import json
import typing as t

STATIC_USERS: t.List[t.Dict[str, t.Any]] = [
    {
        "id": "user_static_admin",
        "name": "Static Admin",
        "email": "admin-static@tessaro.local",
        "role": "admin",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z",
        "organizations": [
            {
                "id": "org_tessaro",
                "name": "Tessaro",
            }
        ],
    },
    {
        "id": "user_static_member",
        "name": "Static Member",
        "email": "member-static@tessaro.local",
        "role": "member",
        "created_at": "2024-01-02T00:00:00.000Z",
        "updated_at": "2024-01-02T00:00:00.000Z",
        "organizations": [
            {
                "id": "org_tessaro",
                "name": "Tessaro",
            }
        ],
    },
]

JSON_HEADERS = {"content-type": "application/json"}


def make_response(status: int, body: t.Any) -> t.Tuple[str, int, t.Dict[str, str]]:
    return json.dumps(body), status, JSON_HEADERS


def main(context=None, data=None):
    if not isinstance(context, dict):
        context = {}

    request = context.get("request")
    if not isinstance(request, dict):
        request = {}

    method = str(request.get("method", "GET")).upper()
    if method != "GET":
        return make_response(405, {"error": "Method not allowed"})

    params = context.get("params")
    if isinstance(params, dict):
        user_id = params.get("id")
        if user_id:
            for user in STATIC_USERS:
                if user["id"] == user_id:
                    return make_response(200, user)
            return make_response(404, {"error": "User not found"})

    return make_response(200, STATIC_USERS)
