import datetime as dt
import hashlib
import json
import os
import secrets
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, quote_plus, urlparse

try:
    from flask import request as flask_request  # type: ignore
except ImportError:  # pragma: no cover
    flask_request = None  # type: ignore

VENDOR_DIR = Path(__file__).resolve().parent / "vendor"
if VENDOR_DIR.exists():
    sys.path.insert(0, str(VENDOR_DIR))

from pymongo import MongoClient, ReturnDocument
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError, PyMongoError

JSON_HEADERS = {"content-type": "application/json"}
SECRET_DIRS = [Path("/secrets/mongodb-auth"), Path("/secrets/default/mongodb-auth")]

_client: Optional[MongoClient] = None
_database = None
_indexes_ready = False


class ValidationError(Exception):
    status: int

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def make_response(status: int, body: Any) -> Tuple[str, int, Dict[str, str]]:
    return json.dumps(body, default=_json_default), status, JSON_HEADERS


def make_error(status: int, message: str) -> Tuple[str, int, Dict[str, str]]:
    return make_response(status, {"message": message})


def no_content(status: int = 204) -> Tuple[str, int, Dict[str, str]]:
    return "", status, {}


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


def iso_now() -> str:
    return dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc).isoformat()


def get_database():
    global _client, _database, _indexes_ready

    if _database is not None:
        return _database

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
            if key and value:
                query_params[key] = value

    uri = f"mongodb://{quote_plus(username)}:{quote_plus(password)}@{hosts}/"
    if query_params:
        encoded = "&".join(f"{key}={value}" for key, value in query_params.items())
        uri = f"{uri}?{encoded}"

    _client = MongoClient(uri)
    database_name = os.environ.get("MONGO_DATABASE", "tessaro")
    _database = _client[database_name]

    if not _indexes_ready:
        ensure_indexes(_database)
        _indexes_ready = True

    return _database


def get_collection(name: str) -> Collection:
    database = get_database()
    return database[name]


def ensure_indexes(database) -> None:
    database["users"].create_index("email", unique=True)
    database["organizations"].create_index("name", unique=True)
    database["services"].create_index("name", unique=True)
    database["metrics"].create_index("key", unique=True)
    database["user_credentials"].create_index("user_id", unique=True)
    database["sessions"].create_index("token_hash", unique=True)


def user_doc_to_response(doc: Dict[str, Any], organizations_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    organization_ids = doc.get("organization_ids") or []
    organizations = [
        organizations_map[org_id]
        for org_id in organization_ids
        if org_id in organizations_map
    ]

    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name"),
        "email": doc.get("email"),
        "role": doc.get("role"),
        "avatar_url": doc.get("avatar_url"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "organizations": organizations,
    }


def organization_doc_to_response(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name"),
        "plan": doc.get("plan"),
        "status": doc.get("status"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def service_doc_to_response(doc: Dict[str, Any]) -> Dict[str, Any]:
    organization_count = doc.get("organization_count")
    if organization_count is None:
        organization_ids = doc.get("organization_ids") or []
        organization_count = len(organization_ids)

    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name"),
        "service_type": doc.get("service_type"),
        "status": doc.get("status"),
        "organization_count": organization_count,
        "description": doc.get("description"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def metrics_doc_to_number_response(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {"value": doc.get("value", 0)}


def metrics_doc_to_timestamp_response(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {"value": doc.get("value")}


def hash_password(password: str) -> Tuple[str, str]:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    )
    return salt, hashed.hex()


def normalize_string(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed if trimmed else None


def normalize_role(value: Any) -> str:
    role = normalize_string(value) or "member"
    allowed = {"member", "organization_admin", "admin"}
    if role not in allowed:
        raise ValidationError("role must be one of member, organization_admin, admin")
    return role


def parse_json_body(data: Any, request_dict: Dict[str, Any]) -> Dict[str, Any]:
    candidate = data

    if candidate is None and isinstance(request_dict.get("body"), (str, bytes, bytearray, memoryview)):
        candidate = request_dict.get("body")

    if candidate is None and flask_request is not None:
        try:
            if flask_request.is_json:  # type: ignore[attr-defined]
                parsed = flask_request.get_json(silent=True, cache=True)  # type: ignore[attr-defined]
                print("[tessaro-api] flask parsed json", parsed)
                if isinstance(parsed, dict):
                    return parsed
                if parsed is not None:
                    return {"value": parsed}
            raw = flask_request.get_data(cache=True, as_text=True)  # type: ignore[attr-defined]
            print("[tessaro-api] flask raw body", raw)
            candidate = raw if raw else None
        except RuntimeError:
            candidate = None

    if candidate is None:
        return {}

    if isinstance(candidate, (bytes, bytearray, memoryview)):
        candidate = bytes(candidate).decode("utf-8")

    if isinstance(candidate, str):
        text = candidate.strip()
        if not text:
            return {}
        try:
            return json.loads(text)
        except json.JSONDecodeError as error:
            raise ValidationError(f"Invalid JSON payload: {error}") from error

    if isinstance(candidate, dict):
        return candidate

    raise ValidationError("Unsupported request body type")


def parse_request(context: Any) -> Tuple[str, str, Dict[str, List[str]], Dict[str, Any]]:
    flask_available = False
    headers_from_flask: Dict[str, Any] = {}
    query: Dict[str, List[str]] = {}

    if flask_request is not None:
        try:
            method = str(flask_request.method or "GET").upper()
            raw_url = flask_request.url or ""
            path = flask_request.path or "/"
            query = {key: flask_request.args.getlist(key) for key in flask_request.args}
            headers_from_flask = {key: value for key, value in flask_request.headers.items()}
            flask_available = True
            request_dict = {
                "method": method,
                "url": raw_url,
                "path": path,
                "headers": headers_from_flask,
            }
        except RuntimeError:
            flask_available = False

    if not flask_available:
        context_dict: Dict[str, Any] = context if isinstance(context, dict) else {}
        print("[tessaro-api] context keys", list(context_dict.keys()))
        request_dict = context_dict.get("request")
        if not isinstance(request_dict, dict):
            request_dict = {}
        else:
            print("[tessaro-api] request keys", list(request_dict.keys()))

        method = str(request_dict.get("method", "GET")).upper()
        raw_url = request_dict.get("url") or context_dict.get("url") or ""

        path = request_dict.get("path") or context_dict.get("path") or "/"
        if isinstance(raw_url, str) and raw_url:
            parsed = urlparse(raw_url)
            path = parsed.path or path
            query = parse_qs(parsed.query)
    else:
        raw_url = raw_url  # type: ignore  # already defined above

    override_path = None
    if "__path" in query:
        override_path = first_value(query, "__path")
        query.pop("__path", None)
        if override_path:
            from urllib.parse import unquote
            override_path = unquote(unquote(override_path))

    if override_path is None:
        headers = request_dict.get("headers")
        if not headers and headers_from_flask:
            headers = headers_from_flask
        if isinstance(headers, dict):
            for key, value in headers.items():
                if isinstance(key, str) and key.lower() == "x-tessaro-path":
                    if isinstance(value, str):
                        override_path = value
                    elif isinstance(value, list) and value:
                        first_header = value[0]
                        if isinstance(first_header, str):
                            override_path = first_header
                    break

    if override_path:
        parsed_override = urlparse(override_path if override_path.startswith("/") else f"/{override_path.lstrip('/')}")
        path = parsed_override.path or "/"
        query = parse_qs(parsed_override.query)

    print("[tessaro-api] parse_request", {
        "method": method,
        "raw_url": raw_url,
        "resolved_path": path,
        "query_keys": list(query.keys()),
        "override_path": override_path,
        "flask_available": flask_available,
    })

    return method, path or "/", query, request_dict


def first_value(query: Dict[str, List[str]], key: str) -> Optional[str]:
    values = query.get(key)
    if not values:
        return None
    for value in values:
        normalized = normalize_string(value)
        if normalized is not None:
            from urllib.parse import unquote_plus
            try:
                from urllib.parse import unquote_plus
                decoded = unquote_plus(normalized)
                return unquote_plus(decoded) if "%" in decoded else decoded
            except Exception:
                return normalized
    return None


def sanitize_identifier(value: Any) -> Optional[str]:
    identifier = normalize_string(value)
    if identifier is None:
        return None
    return identifier


def resolve_organization_ids(raw_ids: Any) -> Tuple[List[str], List[str]]:
    if not isinstance(raw_ids, list):
        return [], []

    normalized: List[str] = []
    for value in raw_ids:
        identifier = sanitize_identifier(value)
        if identifier:
            if identifier not in normalized:
                normalized.append(identifier)

    if not normalized:
        return [], []

    organizations = get_collection("organizations")
    cursor = organizations.find({"_id": {"$in": normalized}})
    existing = {doc["_id"] for doc in cursor}
    missing = [identifier for identifier in normalized if identifier not in existing]

    return normalized, missing


def collect_organizations_map(organization_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    if not organization_ids:
        return {}

    organizations = get_collection("organizations")
    cursor = organizations.find({"_id": {"$in": organization_ids}})
    return {doc["_id"]: organization_doc_to_response(doc) for doc in cursor}


def handle_users(method: str, segments: List[str], query: Dict[str, List[str]], body: Dict[str, Any]):
    users = get_collection("users")
    organizations = get_collection("organizations")

    user_id = segments[2] if len(segments) > 2 else None
    organization_filter = first_value(query, "organization_id")

    def should_include(doc) -> bool:
        org_ids = doc.get("organization_ids") or []
        if not org_ids:
            return False
        if organization_filter and organization_filter not in org_ids:
            return False
        return True

    if method == "GET" and user_id:
        doc = users.find_one({"_id": user_id})
        if not doc or not should_include(doc):
            return make_error(404, "User not found")

        org_map = collect_organizations_map(doc.get("organization_ids") or [])
        return make_response(200, user_doc_to_response(doc, org_map))

    if method == "GET":
        summary = first_value(query, "summary")
        if summary == "count":
            docs = [doc for doc in users.find({}) if should_include(doc)]
            return make_response(200, {"count": len(docs)})

        email = first_value(query, "email")
        if email:
            doc = users.find_one({"email": email})
            if not doc or not should_include(doc):
                return make_error(404, "User not found")
            org_map = collect_organizations_map(doc.get("organization_ids") or [])
            return make_response(200, user_doc_to_response(doc, org_map))

        docs = [doc for doc in users.find({}) if should_include(doc)]
        all_org_ids: List[str] = []
        for doc in docs:
            all_org_ids.extend(doc.get("organization_ids") or [])
        org_map = collect_organizations_map(list(set(all_org_ids)))
        payload = [user_doc_to_response(doc, org_map) for doc in docs]
        try:
            return make_response(200, payload)
        except Exception as error:
            safe_payload = []
            for doc in docs:
                try:
                    safe_payload.append(user_doc_to_response(doc, org_map))
                except Exception:
                    print("[tessaro-api] skipping unserializable user", doc.get("_id"), doc)
            print("[tessaro-api] encountered non-serializable user documents", error)
            return make_response(200, safe_payload)

    if method == "POST":
        name = normalize_string(body.get("name")) or "Unnamed"
        email = normalize_string(body.get("email"))
        if not email:
            raise ValidationError("email is required")

        role = normalize_role(body.get("role"))
        avatar_url = normalize_string(body.get("avatar_url"))

        organization_ids, missing = resolve_organization_ids(body.get("organization_ids"))
        if missing:
            raise ValidationError(f"organizations not found: {', '.join(missing)}")
        if not organization_ids:
            raise ValidationError("organization_ids required")

        identifier = sanitize_identifier(body.get("id")) or str(uuid.uuid4())
        timestamp = iso_now()

        doc = {
            "_id": identifier,
            "name": name,
            "email": email,
            "role": role,
            "avatar_url": avatar_url,
            "organization_ids": organization_ids,
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        try:
            users.insert_one(doc)
        except DuplicateKeyError:
            raise ValidationError("user already exists", status=409)
        except PyMongoError as error:
            raise RuntimeError(f"Failed to create user: {error}") from error

        org_map = collect_organizations_map(organization_ids)
        return make_response(201, user_doc_to_response(doc, org_map))

    if method in ("PATCH", "PUT") and user_id:
        doc = users.find_one({"_id": user_id})
        if not doc:
            return make_error(404, "User not found")

        updates: Dict[str, Any] = {}

        if "name" in body:
            updates["name"] = normalize_string(body.get("name")) or doc.get("name")
        if "email" in body:
            new_email = normalize_string(body.get("email"))
            if not new_email:
                raise ValidationError("email cannot be empty")
            updates["email"] = new_email
        if "role" in body:
            updates["role"] = normalize_role(body.get("role"))
        if "avatar_url" in body:
            updates["avatar_url"] = normalize_string(body.get("avatar_url"))
        if "organization_ids" in body:
            organization_ids, missing = resolve_organization_ids(body.get("organization_ids"))
            if missing:
                raise ValidationError(f"organizations not found: {', '.join(missing)}")
            updates["organization_ids"] = organization_ids

        if not updates:
            return make_response(200, user_doc_to_response(doc, collect_organizations_map(doc.get("organization_ids") or [])))

        updates["updated_at"] = iso_now()

        try:
            users.update_one({"_id": user_id}, {"$set": updates})
        except DuplicateKeyError:
            raise ValidationError("email already in use", status=409)

        updated = users.find_one({"_id": user_id}) or doc
        org_map = collect_organizations_map(updated.get("organization_ids") or [])
        return make_response(200, user_doc_to_response(updated, org_map))

    if method == "DELETE" and user_id:
        result = users.delete_one({"_id": user_id})
        if result.deleted_count == 0:
            return make_error(404, "User not found")
        return no_content()

    return make_error(405, "Method not allowed")


def handle_organizations(method: str, segments: List[str], query: Dict[str, List[str]], body: Dict[str, Any]):
    organizations = get_collection("organizations")
    users = get_collection("users")
    services = get_collection("services")

    organization_id = segments[2] if len(segments) > 2 else None

    if method == "GET" and organization_id:
        doc = organizations.find_one({"_id": organization_id})
        if not doc:
            return make_error(404, "Organization not found")
        return make_response(200, organization_doc_to_response(doc))

    if method == "GET":
        summary = first_value(query, "summary")
        if summary == "count":
            count = organizations.count_documents({})
            return make_response(200, {"count": count})

        docs = list(organizations.find({}))
        payload = [organization_doc_to_response(doc) for doc in docs]
        return make_response(200, payload)

    if method == "POST":
        print("[tessaro-api] organizations POST payload", body)
        name = normalize_string(body.get("name"))
        plan = normalize_string(body.get("plan")) or "standard"
        status = normalize_string(body.get("status")) or "active"
        if not name:
            raise ValidationError("name is required")

        identifier = sanitize_identifier(body.get("id")) or str(uuid.uuid4())
        timestamp = iso_now()

        doc = {
            "_id": identifier,
            "name": name,
            "plan": plan,
            "status": status,
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        try:
            organizations.insert_one(doc)
        except DuplicateKeyError:
            raise ValidationError("organization already exists", status=409)

        return make_response(201, organization_doc_to_response(doc))

    if method in ("PATCH", "PUT") and organization_id:
        doc = organizations.find_one({"_id": organization_id})
        if not doc:
            return make_error(404, "Organization not found")

        updates: Dict[str, Any] = {}

        if "name" in body:
            new_name = normalize_string(body.get("name"))
            if not new_name:
                raise ValidationError("name cannot be empty")
            updates["name"] = new_name
        if "plan" in body:
            updates["plan"] = normalize_string(body.get("plan")) or doc.get("plan")
        if "status" in body:
            updates["status"] = normalize_string(body.get("status")) or doc.get("status")

        if not updates:
            return make_response(200, organization_doc_to_response(doc))

        updates["updated_at"] = iso_now()

        organizations.update_one({"_id": organization_id}, {"$set": updates})
        updated = organizations.find_one({"_id": organization_id}) or doc
        return make_response(200, organization_doc_to_response(updated))

    if method == "DELETE" and organization_id:
        result = organizations.delete_one({"_id": organization_id})
        if result.deleted_count == 0:
            return make_error(404, "Organization not found")

        users.update_many({}, {"$pull": {"organization_ids": organization_id}})
        services.update_many({}, {"$pull": {"organization_ids": organization_id}})
        return no_content()

    return make_error(405, "Method not allowed")


def handle_services(method: str, segments: List[str], body: Dict[str, Any], query: Dict[str, List[str]]):
    services = get_collection("services")

    if len(segments) > 2 and segments[2] == "query" and method == "POST":
        organization_ids, _missing = resolve_organization_ids(body.get("organization_ids"))
        if not organization_ids:
            return make_response(200, [])

        cursor = services.find({"organization_ids": {"$in": organization_ids}})
        docs = list(cursor)
        payload = [service_doc_to_response(doc) for doc in docs]
        return make_response(200, payload)

    service_id = segments[2] if len(segments) > 2 else None

    if method == "GET" and service_id:
        doc = services.find_one({"_id": service_id})
        if not doc:
            return make_error(404, "Service not found")
        return make_response(200, service_doc_to_response(doc))

    if method == "GET":
        summary = first_value(query, "summary")
        if summary == "count":
            count = services.count_documents({})
            return make_response(200, {"count": count})

        docs = list(services.find({}))
        payload = [service_doc_to_response(doc) for doc in docs]
        return make_response(200, payload)

    if method == "POST":
        name = normalize_string(body.get("name"))
        service_type = normalize_string(body.get("service_type"))
        status = normalize_string(body.get("status")) or "active"
        description = body.get("description")
        organization_ids, missing = resolve_organization_ids(body.get("organization_ids"))

        if missing:
            raise ValidationError(f"organizations not found: {', '.join(missing)}")

        if not name:
            raise ValidationError("name is required")
        if not service_type:
            raise ValidationError("service_type is required")

        identifier = sanitize_identifier(body.get("id")) or str(uuid.uuid4())
        timestamp = iso_now()

        doc = {
            "_id": identifier,
            "name": name,
            "service_type": service_type,
            "status": status,
            "organization_ids": organization_ids,
            "organization_count": body.get("organization_count") or len(organization_ids),
            "description": description if description is None or isinstance(description, str) else str(description),
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        try:
            services.insert_one(doc)
        except DuplicateKeyError:
            raise ValidationError("service already exists", status=409)

        return make_response(201, service_doc_to_response(doc))

    if method in ("PATCH", "PUT") and service_id:
        doc = services.find_one({"_id": service_id})
        if not doc:
            return make_error(404, "Service not found")

        updates: Dict[str, Any] = {}

        if "name" in body:
            new_name = normalize_string(body.get("name"))
            if not new_name:
                raise ValidationError("name cannot be empty")
            updates["name"] = new_name
        if "service_type" in body:
            new_type = normalize_string(body.get("service_type"))
            if not new_type:
                raise ValidationError("service_type cannot be empty")
            updates["service_type"] = new_type
        if "status" in body:
            updates["status"] = normalize_string(body.get("status")) or doc.get("status")
        if "description" in body:
            value = body.get("description")
            updates["description"] = value if value is None or isinstance(value, str) else str(value)
        if "organization_ids" in body:
            organization_ids, missing = resolve_organization_ids(body.get("organization_ids"))
            if missing:
                raise ValidationError(f"organizations not found: {', '.join(missing)}")
            updates["organization_ids"] = organization_ids
        if "organization_count" in body:
            try:
                updates["organization_count"] = int(body.get("organization_count"))
            except (TypeError, ValueError):
                raise ValidationError("organization_count must be numeric")

        if not updates:
            return make_response(200, service_doc_to_response(doc))

        updates["updated_at"] = iso_now()
        services.update_one({"_id": service_id}, {"$set": updates})
        updated = services.find_one({"_id": service_id}) or doc
        return make_response(200, service_doc_to_response(updated))

    if method == "DELETE" and service_id:
        result = services.delete_one({"_id": service_id})
        if result.deleted_count == 0:
            return make_error(404, "Service not found")
        return no_content()

    return make_error(405, "Method not allowed")


def handle_metrics_increment(body: Dict[str, Any]):
    metrics = get_collection("metrics")
    key = normalize_string(body.get("key"))
    if not key:
        raise ValidationError("key is required")

    timestamp = iso_now()
    doc = metrics.find_one_and_update(
        {"_id": key, "kind": "number"},
        {
            "$inc": {"value": 1},
            "$set": {"updated_at": timestamp, "key": key, "kind": "number"},
            "$setOnInsert": {"created_at": timestamp},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    return make_response(200, metrics_doc_to_number_response(doc))


def handle_metrics_number(method: str, query: Dict[str, List[str]], body: Dict[str, Any]):
    metrics = get_collection("metrics")

    if method == "POST":
        key = normalize_string(body.get("key"))
        if key is None:
            raise ValidationError("key is required")
        try:
            value = int(body.get("value"))
        except (TypeError, ValueError):
            raise ValidationError("value must be an integer")

        timestamp = iso_now()
        metrics.update_one(
            {"_id": key, "kind": "number"},
            {
                "$set": {"value": value, "updated_at": timestamp, "key": key, "kind": "number"},
                "$setOnInsert": {"created_at": timestamp},
            },
            upsert=True,
        )
        return no_content()

    if method == "GET":
        key = first_value(query, "key")
        if not key:
            raise ValidationError("key is required")
        doc = metrics.find_one({"_id": key, "kind": "number"})
        if not doc:
            return make_error(404, "Metric not found")
        return make_response(200, metrics_doc_to_number_response(doc))

    return make_error(405, "Method not allowed")


def handle_metrics_timestamp(method: str, query: Dict[str, List[str]], body: Dict[str, Any]):
    metrics = get_collection("metrics")

    if method == "POST":
        key = normalize_string(body.get("key"))
        if not key:
            raise ValidationError("key is required")
        value = body.get("value")
        if value is not None:
            value = normalize_string(value)

        timestamp = iso_now()
        metrics.update_one(
            {"_id": key, "kind": "timestamp"},
            {
                "$set": {"value": value, "updated_at": timestamp, "key": key, "kind": "timestamp"},
                "$setOnInsert": {"created_at": timestamp},
            },
            upsert=True,
        )
        return no_content()

    if method == "GET":
        key = first_value(query, "key")
        if not key:
            raise ValidationError("key is required")
        doc = metrics.find_one({"_id": key, "kind": "timestamp"})
        if not doc:
            return make_error(404, "Metric not found")
        return make_response(200, metrics_doc_to_timestamp_response(doc))

    return make_error(405, "Method not allowed")


def handle_sessions(method: str, segments: List[str], body: Dict[str, Any]):
    sessions = get_collection("sessions")

    if method == "POST":
        token_hash = sanitize_identifier(body.get("token_hash"))
        if not token_hash:
            raise ValidationError("token_hash is required")

        doc = {
            "_id": token_hash,
            "token_hash": token_hash,
            "user_id": body.get("user_id"),
            "organization_id": body.get("organization_id"),
            "issued_at": body.get("issued_at"),
            "expires_at": body.get("expires_at"),
            "created_at": iso_now(),
            "updated_at": iso_now(),
        }
        sessions.replace_one({"_id": token_hash}, doc, upsert=True)
        return no_content(201)

    token_hash = segments[2] if len(segments) > 2 else None
    if not token_hash:
        raise ValidationError("session token hash is required")

    if method == "GET":
        doc = sessions.find_one({"_id": token_hash})
        if not doc:
            return make_error(404, "Session not found")
        payload = {
            "token_hash": doc.get("token_hash"),
            "user_id": doc.get("user_id"),
            "organization_id": doc.get("organization_id"),
            "issued_at": doc.get("issued_at"),
            "expires_at": doc.get("expires_at"),
        }
        return make_response(200, payload)

    if method == "PUT":
        if not isinstance(body, dict):
            raise ValidationError("request body must be an object")

        payload = {
            "_id": token_hash,
            "token_hash": token_hash,
            "user_id": body.get("user_id"),
            "organization_id": body.get("organization_id"),
            "issued_at": body.get("issued_at"),
            "expires_at": body.get("expires_at"),
            "updated_at": iso_now(),
        }

        sessions.replace_one({"_id": token_hash}, payload, upsert=True)
        return no_content()

    if method == "DELETE":
        sessions.delete_one({"_id": token_hash})
        return no_content()

    return make_error(405, "Method not allowed")


def handle_user_credentials(body: Dict[str, Any]):
    credentials = get_collection("user_credentials")

    user_id = sanitize_identifier(body.get("user_id"))
    if not user_id:
        raise ValidationError("user_id is required")

    password = body.get("password")
    if not isinstance(password, str) or not password:
        raise ValidationError("password is required")

    salt, password_hash = hash_password(password)
    timestamp = iso_now()

    credentials.update_one(
        {"_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "password_hash": password_hash,
                "salt": salt,
                "updated_at": timestamp,
            },
            "$setOnInsert": {"created_at": timestamp},
        },
        upsert=True,
    )

    return no_content()


def main(context=None, data=None):
    print("[tessaro-api] main invoked", {"context_type": type(context).__name__, "data_type": type(data).__name__})
    try:
        method, path, query, request_dict = parse_request(context)
        print("[tessaro-api] headers", request_dict.get("headers"))
        body = parse_json_body(data, request_dict)
        segments = [segment for segment in path.split("/") if segment]

        print("[tessaro-api] request", method, path, "segments=", segments)

        if len(segments) < 2 or segments[0] != "tessaro":
            return make_error(404, "Not found")

        resource = segments[1]

        if resource == "users":
            return handle_users(method, segments, query, body)
        if resource == "organizations":
            return handle_organizations(method, segments, query, body)
        if resource == "services":
            return handle_services(method, segments, body, query)
        if resource == "metrics":
            if len(segments) > 2 and segments[2] == "increment" and method == "POST":
                return handle_metrics_increment(body)
            if len(segments) > 2 and segments[2] == "number":
                return handle_metrics_number(method, query, body)
            if len(segments) > 2 and segments[2] == "timestamp":
                return handle_metrics_timestamp(method, query, body)
            return make_error(404, "Metric endpoint not found")
        if resource == "sessions":
            return handle_sessions(method, segments, body)
        if resource == "user-credentials" and method == "POST":
            return handle_user_credentials(body)

        return make_error(404, "Not found")

    except ValidationError as error:
        return make_error(getattr(error, "status", 400), str(error))
    except PyMongoError as error:
        print("[tessaro-api] Mongo error:", repr(error))
        return make_error(500, "Database error")
    except Exception as error:  # pylint: disable=broad-except
        print("[tessaro-api] unhandled error:", repr(error))
        return make_error(500, "Internal server error")
