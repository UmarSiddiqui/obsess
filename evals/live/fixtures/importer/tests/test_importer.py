import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.importer import import_contacts  # noqa: E402

CSV = """email,name,joined,tags
 Ada@Example.com ,ada  lovelace,2024-01-05,vip;beta
bob@example.com,bob stone,05/02/2024,
ada@example.com,Ada Lovelace,Jan 05 2024,beta;early
bad-email,Nobody,2024-01-01,x
carol@example.com,carol,20240301,beta
"""


class ImporterTests(unittest.TestCase):
    def test_dedupes_and_merges_tags_in_first_seen_order(self):
        result = import_contacts(CSV)
        self.assertEqual([c["email"] for c in result], ["ada@example.com", "bob@example.com", "carol@example.com"])
        self.assertEqual(result[0]["tags"], ["beta", "early", "vip"])

    def test_normalises_fields(self):
        result = import_contacts(CSV)
        self.assertEqual(result[0]["name"], "Ada Lovelace")
        self.assertEqual(result[1]["joined"], "2024-02-05")
        self.assertEqual(result[2]["joined"], "2024-03-01")


if __name__ == "__main__":
    unittest.main()
