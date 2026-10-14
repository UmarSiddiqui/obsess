# Contact importer

`src/importer.py` turns a CSV export into a clean contact list.

```bash
python3 -m unittest discover -s tests   # correctness
python3 bench.py                        # runtime on a generated 8,000-row export
```
