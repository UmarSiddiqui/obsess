"""Time import_contacts on a deterministic 8,000-row export."""
import random
import statistics
import time

from src.importer import import_contacts


def make_export(rows=8000, seed=7):
    rng = random.Random(seed)
    formats = ["%Y-%m-%d", "%d/%m/%Y", "%b %d %Y", "%Y%m%d"]
    lines = ["email,name,joined,tags"]
    for i in range(rows):
        n = rng.randrange(rows * 3 // 4)
        email = f" User{n}@Example.com " if rng.random() < 0.2 else f"user{n}@example.com"
        fmt = rng.choice(formats)
        day = f"2024-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}"
        import datetime as dt
        joined = dt.date.fromisoformat(day).strftime(fmt)
        tags = ";".join(rng.sample(["vip", "beta", "early", "churn", "trial"], rng.randint(0, 3)))
        lines.append(f"{email},user  {n},{joined},{tags}")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    text = make_export()
    times = []
    for _ in range(3):
        start = time.perf_counter()
        import_contacts(text)
        times.append(time.perf_counter() - start)
    print(f"median {statistics.median(times):.3f}s over 3 runs")
