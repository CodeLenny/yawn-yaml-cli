# YAWN YAML CLI

A command-line YAML editor that preserves comments and styling.

Based on the Node.js package [YAWN YAML](https://github.com/mohsen1/yawn-yaml).

## Installation

```bash
npm install yawn-yaml-cli [--global]
```

## Usage

```bash
yawn [command] # If installed with --global
$(npm bin)/yawn [command] # If installed locally
```

See `yawn --help` for all commands and options, including output format and error handling.
Major commands are listed below.

### `yawn get`
```bash
yawn get <file> <path>
```

Gets the specified entry inside the given YAML file.

Uses [`lodash.get()`](https://lodash.com/docs/#get) syntax for the path.

### `yawn set`
```bash
yawn set <file> <path> <value>
```

Sets an entry in the given YAML file.
Uses [`lodash.set()`](https://lodash.com/docs/#set) syntax for the path.

If adding to an existing array, any value higher than the last index will push to the last array index, instead of
inserting `null` entries:

```yaml
users:
  - alice
  - bob

# Run `yawn set users.yaml users[10] jim`

users:
  - alice
  - bob
  - jim # Inserted at index 3, not 10.
```

### `yawn push`
```bash
yawn push <file> <path> <value>
```

Pushes the given value onto the end of an array, creating the array if needed.

```yaml
# users.yaml
users:
  - alice
  - bob
```

```bash
yawn push users.yaml users "jim"

rm -rf users.yaml; yawn push users.yaml users "alice"
# will create "users.yaml", a "users" array, and will push "alice" onto the new array
```
