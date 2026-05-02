<!-- markdownlint-disable no-inline-html first-line-h1 -->
<p align="center">
  <img width="200" src=".github/logo.png" alt="" />
</p>
<h1 align="center">
  publiccode-ui
</h1>
<p align="center">
  White label web frontend for browsing software catalogs by any
  <a href="https://github.com/italia/developers-italia-api">software-catalog-api</a>
  compatible API.
</p>

Built with Astro. Fully static: all data is fetched at build time.

## Quick start

```shell
git clone https://github.com/bfabio/publiccode-ui
cd publiccode-ui
npm install
npm run dev
```

The dev server runs at <http://localhost:4321>.

## Commands

```shell
npm run dev        # dev server
npm run build      # production build
npm run preview    # preview production build
npm run typecheck  # type check without emitting
```

## Configuration

| Variable    | Default   | Description    |
|-------------|-----------|----------------|
| `BASE_PATH` | `/`       | URL base path  |
| `THEME`     | `default` | UI theme       |

## Themes

Themes live in `public/themes/{name}/index.css`. Set `THEME` at
build time to switch:

```shell
THEME=retro npm run build
```

Available themes:

- `default`
- `mono`
- `retro`

## Contributing

Contributing is always appreciated.
Feel free to open issues, fork or submit a Pull Request.

## License

Copyright (c) 2026-

The source code is released under the BSD license (SPDX code: `BSD-3-Clause`).

Attribution is preserved through the git history, see `git log` for a full
list of contributors and their contributions.
