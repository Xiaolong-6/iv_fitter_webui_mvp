# Offline tools

This folder contains optional helper scripts that are not part of the IV-fitter runtime backend or frontend.

## prepare_publication_demo_data.py

Creates publication-derived demo-data templates without downloading copyrighted data, scraping figures, or changing the fitter.

Example:

```bash
python tools/prepare_publication_demo_data.py 10.1038/s41560-026-02068-9 --data-type JV
python tools/prepare_publication_demo_data.py --self-test
```

The generated CSV/meta templates remain under `examples/demo_data/publication_data/`.
