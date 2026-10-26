#!/usr/bin/env python3
"""Record one daily adoption snapshot for /obsess.

Appends a row to metrics/adoption.csv and merges GitHub's 14-day traffic windows into
metrics/traffic.json (GitHub forgets traffic after 14 days, so it has to be archived).

Sources:
  GitHub repo API      stars, forks, watchers, open issues        (public, GITHUB_TOKEN is enough)
  GitHub traffic API   views, unique visitors, clones, referrers  (needs TRAFFIC_TOKEN: a fine-grained
                                                                    PAT with Administration: read)
  skills.sh API        deduplicated `npx skills add` installs     (public)

Any source that fails is recorded as empty rather than guessed.
Usage: python3 tools/adoption.py [--repo owner/name] [--out metrics]
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

FIELDS = ["date", "stars", "forks", "watchers", "open_issues", "skills_sh_installs",
          "views_14d", "unique_visitors_14d", "clones_14d", "unique_cloners_14d", "top_referrers"]


def get(url: str, token: str | None = None) -> dict | list | None:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "obsess-adoption"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
            return json.load(r)
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
        print(f"skip {url}: {e}")
        return None


def merge_daily(store: dict, kind: str, payload: dict | None) -> None:
    for day in (payload or {}).get(kind, []):
        store.setdefault(day["timestamp"][:10], {})[kind] = {"count": day["count"], "uniques": day["uniques"]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "UmarSiddiqui/obsess"))
    ap.add_argument("--skill", default="obsess")
    ap.add_argument("--out", type=Path, default=Path("metrics"))
    args = ap.parse_args()
    api = f"https://api.github.com/repos/{args.repo}"
    public_token = os.environ.get("GITHUB_TOKEN")
    traffic_token = os.environ.get("TRAFFIC_TOKEN")

    row = {k: "" for k in FIELDS}
    row["date"] = dt.date.today().isoformat()
    repo = get(api, public_token)
    if isinstance(repo, dict):
        row.update(stars=repo.get("stargazers_count", ""), forks=repo.get("forks_count", ""),
                   watchers=repo.get("subscribers_count", ""), open_issues=repo.get("open_issues_count", ""))
    skill = get(f"https://skills.sh/api/v1/skills/{args.repo}/{args.skill}")
    if isinstance(skill, dict) and "installs" in skill:
        row["skills_sh_installs"] = skill["installs"]

    args.out.mkdir(parents=True, exist_ok=True)
    traffic_file = args.out / "traffic.json"
    traffic = json.loads(traffic_file.read_text()) if traffic_file.exists() else {"daily": {}, "referrers": {}}
    if traffic_token:
        views = get(f"{api}/traffic/views", traffic_token)
        clones = get(f"{api}/traffic/clones", traffic_token)
        refs = get(f"{api}/traffic/popular/referrers", traffic_token)
        merge_daily(traffic["daily"], "views", views)
        merge_daily(traffic["daily"], "clones", clones)
        if isinstance(views, dict):
            row.update(views_14d=views.get("count", ""), unique_visitors_14d=views.get("uniques", ""))
        if isinstance(clones, dict):
            row.update(clones_14d=clones.get("count", ""), unique_cloners_14d=clones.get("uniques", ""))
        if isinstance(refs, list):
            traffic["referrers"][row["date"]] = refs
            row["top_referrers"] = " ".join(f"{r['referrer']}:{r['uniques']}" for r in refs[:5])
    else:
        print("TRAFFIC_TOKEN not set: views, clones and referrers skipped")
    traffic["daily"] = dict(sorted(traffic["daily"].items()))
    traffic_file.write_text(json.dumps(traffic, indent=2) + "\n")

    csv_file = args.out / "adoption.csv"
    rows = list(csv.DictReader(csv_file.open())) if csv_file.exists() else []
    rows = [r for r in rows if r["date"] != row["date"]] + [row]
    with csv_file.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps(row))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
