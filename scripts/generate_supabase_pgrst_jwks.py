#!/usr/bin/env python3
"""Generate a JWKS for PostgREST that can trust HS256 and RS256 tokens."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def load_json_file(path: str) -> object:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def ensure_jwks(document: object) -> dict[str, list[dict[str, object]]]:
    if isinstance(document, dict) and "keys" in document:
        keys = document["keys"]
        if not isinstance(keys, list):
            raise ValueError("JWKS 'keys' must be a list")
        return {"keys": keys}

    if isinstance(document, dict):
        return {"keys": [document]}

    raise ValueError("Expected a JWK object or a JWKS object")


def build_oct_jwk(secret: str, kid: str | None) -> dict[str, object]:
    secret_bytes = secret.encode("utf-8")
    derived_kid = kid or f"supabase-hs256-{hashlib.sha256(secret_bytes).hexdigest()[:12]}"
    return {
        "kty": "oct",
        "kid": derived_kid,
        "alg": "HS256",
        "use": "sig",
        "key_ops": ["verify"],
        "k": b64url(secret_bytes)
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Build a JWKS for PostgREST that includes the existing Supabase HS256 "
            "secret and one or more external public JWKs."
        )
    )
    parser.add_argument("--hs256-secret", required=True, help="Existing Supabase JWT secret")
    parser.add_argument("--hs256-kid", help="Optional kid for the generated symmetric JWK")
    parser.add_argument(
        "--public-jwk-file",
        action="append",
        default=[],
        help="Path to a public JWK or JWKS JSON file. Can be provided multiple times."
    )
    parser.add_argument(
        "--output",
        help="Optional output file for the JWKS JSON. Defaults to stdout."
    )
    args = parser.parse_args()

    jwks = {"keys": [build_oct_jwk(args.hs256_secret, args.hs256_kid)]}

    for path in args.public_jwk_file:
        external = ensure_jwks(load_json_file(path))
        jwks["keys"].extend(external["keys"])

    document = json.dumps(jwks, separators=(",", ":"), ensure_ascii=True)
    if args.output:
        Path(args.output).write_text(document, encoding="utf-8")
    else:
        print(document)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
