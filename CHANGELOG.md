# Change Log

## `0.3.2` - 20230213
- Fix a small bug where status bar would not update for files where coverage is cached

## `0.3.1` - 20230212
- Adds CD to deploy extension
- Updates packages to address vulnerabilities

## `0.3.0` - 20210418
- Adds caching for editor decorations, should improve performance when switching between multiple files

## `0.2.0` - 20210408
- Updates the status bar item to show more details
- Fixes bugs in `updateCache` logic
- Adds watchers for coverage files
- Supports branch details in coverage, adds it to status bar
- Adds normal descriptions to `package.json`

## `0.1.0` - 20210331
### End-User:
- Properly supports the `coverageFilePath` config
    - Can read files from an explicitly defined location
- Adds configs for customising highlight colors
- Improves status bar item
    - Adds loading state
    - Adds placeholder text when coverage not found
    - Limits coverage percentage to two decimal places
### Dev:
- Sets up a `ConfigProvider` to allow for easier config reads in the extension

---
## `0.0.1` - 20210329
- Initial release