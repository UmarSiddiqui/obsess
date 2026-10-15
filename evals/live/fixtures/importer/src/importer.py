"""Import contacts from a CSV export."""
import csv
import io
from datetime import datetime

DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%b %d %Y", "%Y%m%d"]


def parse_date(value):
    value = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def normalise_email(value):
    return value.strip().lower()


def import_contacts(text):
    """Return contacts in first-seen order, one per email, with ISO dates."""
    rows = list(csv.DictReader(io.StringIO(text)))
    seen = []
    contacts = []
    for row in rows:
        email = normalise_email(row["email"])
        if not email or "@" not in email:
            continue
        if email in seen:
            for contact in contacts:
                if contact["email"] == email:
                    contact["tags"] = sorted(set(contact["tags"] + [t.strip() for t in row["tags"].split(";") if t.strip()]))
            continue
        seen.append(email)
        contacts.append({
            "email": email,
            "name": " ".join(row["name"].split()).title(),
            "joined": parse_date(row["joined"]),
            "tags": sorted(set(t.strip() for t in row["tags"].split(";") if t.strip())),
        })
    return contacts
