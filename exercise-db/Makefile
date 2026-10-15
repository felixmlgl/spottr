# Spottr exercise database. Run from exercise-db/.
#   make fetch     download raw snapshots of every source in config.yaml (network, <= 1 req/s)
#   make fetch-media  download exercise images to media/ (gitignored, never committed)
#   make build     normalize every source, merge, export dist/ and reports/
#   make validate  all checks (fails on any violation)
#   make load      load into Postgres, only if DATABASE_URL is set

PY := uv run --frozen python -I
SOURCES := $(shell $(PY) -c "import yaml; print(' '.join(yaml.safe_load(open('config.yaml'))['sources']))")

.PHONY: fetch fetch-media build normalize validate load clean

fetch:
	@for s in $(SOURCES); do echo "== fetch $$s"; $(PY) sources/$$s/fetch.py || exit 1; done

fetch-media:
	@for s in $(SOURCES); do if [ -f sources/$$s/fetch_media.py ]; then echo "== fetch-media $$s"; $(PY) sources/$$s/fetch_media.py || exit 1; fi; done

normalize:
	@for s in $(SOURCES); do $(PY) sources/$$s/normalize.py || exit 1; done

build: normalize
	@$(PY) -m spottr_exdb.build

validate:
	@$(PY) -m spottr_exdb.validate

load:
	@$(PY) -m spottr_exdb.load

clean:
	rm -f dist/exercises.sqlite dist/seed.sql dist/exercises.json
