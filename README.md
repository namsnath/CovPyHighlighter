# `Coverage.py` Highlighter (covpyhighlighter)

An extension to highlight lines according to a `coverage.json` generated by `Coverage.py`

## Features

---

## Requirements

* Python `coverage` module
* A `coverage.json` file generated by `coverage`

---

## Extension Settings

This extension contributes the following settings:
* `covpyhighlighter.coverageFileName`: Name of the json file containing coverage data
* `covpyhighlighter.coverageFilePath`: Path to the folder containing the coverage JSON file
* `covpyhighlighter.replacePath`: Substring in paths that needs to be replaced
* `covpyhighlighter.replacePathWith`: Substring to replace with in the paths

## Commands

---

## Known Issues

* Data is not cached. Decorations re-done on every editor change.
* Decorations do not reload when coverage file changes.
* No warnings when coverage data is outdated.
