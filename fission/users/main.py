import datetime as dt
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlencode, urlparse, quote_plus

VENDOR_DIR = Path(__file__).resolve().parent / "vendor"
if VENDOR_DIR.exists():
    sys.path.insert(0, str(VENDOR_DIR))

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

JSON_HEADERS = {"content-type": "application/json"}
SECRET_DIRS = [Path("/secrets/mongodb-auth"), Path("/secrets/default/mongodb-auth")]

_client: Optional[MongoClient] = None
_collection: Optional[Collection] = None


def make_response(status: int, body: Any) -> Tuple[str, int, Dict[str, str]]:
    return json.dumps(body, default=_json_default), status, JSON_HEADERS


def _json_default(value: Any) -> Any:
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt.timezone.utc)
        return value.isoformat()
    return value


def read_secret_value(key: str) -> Optional[str]:
    for base in SECRET_DIRS:
        secret_path = base / key
        if secret_path.exists():
            value = secret_path.read_text(encoding="utf-8").strip() or None
            if value:
                return value
    env_value = os.environ.get(key)
    return env_value.strip() if isinstance(env_value, str) and env_value.strip() else None


def get_users_collection() -> Collection:
    global _client, _collection

    if _collection is not None:
        return _collection

    username = read_secret_value("MONGO_INITDB_ROOT_USERNAME")
    password = read_secret_value("MONGO_INITDB_ROOT_PASSWORD")

    if not username or not password:
        raise RuntimeError("MongoDB credentials are unavailable")

    hosts = os.environ.get("MONGO_HOSTS", "mongo.dino.home")
    query_params: Dict[str, str] = {}

    auth_source = os.environ.get("MONGO_AUTH_SOURCE", "admin")
    if auth_source:
        query_params["authSource"] = auth_source

    mongo_options = os.environ.get("MONGO_OPTIONS")
    if mongo_options:
        for fragment in mongo_options.split("&"):
            if "=" not in fragment:
                continue
            key, value = fragment.split("=", 1)
            query_params[key] = value

    uri = f"mongodb://{quote_plus(username)}:{quote_plus(password)}@{hosts}/"
    if query_params:
        uri = f"{uri}?{urlencode(query_params)}"

    _client = MongoClient(uri)
    database_name = os.environ.get("MONGO_DATABASE", "tessaro")
    collection_name = os.environ.get("MONGO_USERS_COLLECTION", "users")
    _collection = _client[database_name][collection_name]
    return _collection


def normalize_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(doc)
    normalized.pop("_id", None)

    for key in ("created_at", "updated_at"):
        value = normalized.get(key)
        if isinstance(value, dt.datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=dt.timezone.utc)
            normalized[key] = value.isoformat()

    organizations = normalized.get("organizations")
    if not isinstance(organizations, list):
        normalized["organizations"] = []

    return normalized


def fetch_all_users() -> List[Dict[str, Any]]:
    collection = get_users_collection()
    cursor = collection.find({}, {"_id": False})
    return [normalize_user(doc) for doc in cursor]


def main(context=None, data=None):
    context_dict: Dict[str, Any]
    request_dict: Dict[str, Any]

    if isinstance(context, dict):
        context_dict = context
    else:
        context_dict = {}

    request = context_dict.get("request")
    if isinstance(request, dict):
        request_dict = request
    else:
        request_dict = {}

    method = str(request_dict.get("method", "GET")).upper()
    if method != "GET":
        return make_response(405, {"error": "Method not allowed"})

    try:
        users = fetch_all_users()

        raw_url = request_dict.get("url") or context_dict.get("url")
        query = request_dict.get("query") if isinstance(request_dict.get("query"), dict) else {}
        summary = None

        if isinstance(query, dict) and query.get("summary") is not None:
            summary = str(query.get("summary"))
        elif raw_url:
            parsed = urlparse(str(raw_url))
            summary_values = parse_qs(parsed.query).get("summary")
            if summary_values and summary_values[0] is not None:
                summary = str(summary_values[0])

        if summary == "count":
            return make_response(200, {"count": len(users)})

        user_id: Optional[str] = None
        if isinstance(query, dict) and query.get("id") is not None:
            user_id = str(query.get("id"))
        elif raw_url:
            parsed = urlparse(str(raw_url))
            id_values = parse_qs(parsed.query).get("id")
            if id_values and id_values[0] is not None:
                user_id = str(id_values[0])

        params = context_dict.get("params")
        if user_id is None and isinstance(params, dict) and params.get("id") is not None:
            user_id = str(params.get("id"))

        if user_id is not None:
            for user in users:
                if user.get("id") == user_id:
                    return make_response(200, user)
            return make_response(404, {"error": "User not found"})

        return make_response(200, users)
    except (RuntimeError, PyMongoError) as error:
        print("[tessaro-users] request failed:", repr(error))
        return make_response(500, {"error": "Failed to load users"})
