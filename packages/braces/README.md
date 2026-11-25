# Braces

Braces helps programs expand compact text patterns into the values they represent.

## Get started

```sh
pnpm add braces
```

Node.js 8 or later is declared in the package manifest. This package is maintained in the Standards workspace and published under the unscoped `braces` name.

## Usage

```js
const braces = require('braces');

braces('file-{a,b}.txt'); // ['file-(a|b).txt']
braces.expand('file-{a,b}.txt'); // ['file-a.txt', 'file-b.txt']
```

See the [upstream guide][braces-guide] for ranges, escaping, options, and more examples.

## Validation

| Command                | Checks                        |
| ---------------------- | ----------------------------- |
| `pnpm run quality:all` | Full configured Quality scope |
| `pnpm run test`        | Unit or project tests         |
| `pnpm run build`       | Build output                  |

Quality can apply safe fixes; review the diff before committing. No separate browser or Playwright test command is defined here.

## Contributing

Run this package's tests and the consuming workspace checks after a fork change. Document any upstream divergence in [FORK.md](FORK.md).

Open changes through the repository pull-request workflow; see the [root README](../../README.md).

## License

MIT. See [LICENSE](LICENSE) and [FORK.md](FORK.md) for provenance.

[braces-guide]: https://github.com/micromatch/braces#readme
