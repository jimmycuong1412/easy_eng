# materials_generator/generate.py
"""Orchestrator: generate materials via an injected query function and render SQL.

The query function is injected (query_fn: prompt -> response text) so the
orchestration logic is unit-testable without calling the real Agent SDK.
The real SDK call lives in default_query_fn.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from typing import Awaitable, Callable

from .catalog import CATALOG, MaterialSpec
from .models import Material
from .schema_prompts import build_prompt, parse_response
from .sql import render_file

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("materials-gen")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "out" / "materials_insert.sql"

QueryFn = Callable[[str], Awaitable[str]]


async def generate_one(spec: MaterialSpec, query_fn: QueryFn) -> Material | None:
    prompt = build_prompt(spec)
    try:
        raw = await query_fn(prompt)
    except Exception as e:  # SDK/network failure
        log.warning("[%s] query failed: %s", spec.slug, e)
        return None
    try:
        material = parse_response(spec, raw)
    except ValueError as e:
        log.warning("[%s] parse failed: %s", spec.slug, e)
        return None
    errors = material.validate()
    if errors:
        log.warning("[%s] invalid: %s", spec.slug, "; ".join(errors))
        return None
    log.info("[%s] ok", spec.slug)
    return material


async def run(specs: list[MaterialSpec], query_fn: QueryFn, out_path: Path) -> dict:
    materials: list[Material] = []
    failed = 0
    for spec in specs:
        m = await generate_one(spec, query_fn)
        if m is None:
            failed += 1
        else:
            materials.append(m)

    if materials:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(render_file(materials), encoding="utf-8")
        log.info("wrote %d materials -> %s", len(materials), out_path)
    else:
        log.warning("no materials generated; not writing %s", out_path)

    return {"generated": len(materials), "failed": failed, "specs": len(specs)}


async def default_query_fn(prompt: str) -> str:
    """Real Agent SDK call. Pure generation: no tools."""
    from claude_agent_sdk import (
        AssistantMessage,
        ClaudeAgentOptions,
        TextBlock,
        query,
    )

    response = ""
    async for message in query(
        prompt=prompt,
        options=ClaudeAgentOptions(
            allowed_tools=[],
            max_turns=2,
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    response += block.text
    return response


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate materials -> idempotent SQL")
    parser.add_argument("--limit", type=int, default=None, help="cap number of specs")
    parser.add_argument("--dry-run", action="store_true",
                        help="generate but print SQL instead of writing out/")
    parser.add_argument("--out", type=str, default=str(DEFAULT_OUT))
    args = parser.parse_args()

    specs = CATALOG if args.limit is None else CATALOG[: args.limit]

    if args.dry_run:
        async def dry():
            mats: list[Material] = []
            for spec in specs:
                m = await generate_one(spec, default_query_fn)
                if m:
                    mats.append(m)
            if mats:
                print(render_file(mats))
            print(f"\n-- DRY RUN: {len(mats)}/{len(specs)} generated (not written)",
                  file=sys.stderr)
        asyncio.run(dry())
        return

    summary = asyncio.run(run(specs, default_query_fn, Path(args.out)))
    print(f"Done: generated={summary['generated']} failed={summary['failed']} "
          f"specs={summary['specs']}")


if __name__ == "__main__":
    main()
