---
level: intermediate
---

# jq: Query and Transform JSON

Research checked: 2026-11-15

**jq** is a command-line processor for JSON. Use it to inspect API responses, extract fields, filter arrays, reshape objects, and compute summaries without writing a full program. Unlike text matching, jq understands JSON types, nesting, and escaping.

## Install and Run

On macOS with Homebrew:

```sh
brew install jq
jq --version
```

For Linux and Windows installation options, use the [official download guide](https://jqlang.org/download/). The shell examples below use POSIX-style quoting, suitable for macOS shells and Bash; Windows shell quoting can differ.

The basic form is `jq 'FILTER' FILE`. Without a filename, jq reads standard input, so it also fits into pipelines such as `curl ... | jq '.'`. The `.` filter returns its input unchanged; jq pretty-prints it by default.

Single-quote the filter so the shell does not interpret jq's `$variables`, brackets, or other syntax. A pipe **inside** the quotes connects jq filters; a pipe **outside** connects shell processes.

## Example Data

The commands below assume an `orders.json` file containing this object. Every command starts from the original data; jq does not modify the input file.

```json
{
  "orders": [
    {"id": 101, "customer": "Ada", "status": "paid", "total": 120, "items": ["keyboard", "mouse"]},
    {"id": 102, "customer": "Ben", "status": "pending", "total": 45, "items": ["mouse"], "coupon": "WELCOME"},
    {"id": 103, "customer": "Ada", "status": "paid", "total": 80, "items": ["headset"]},
    {"id": 104, "customer": "Chen", "status": "cancelled", "total": 30, "items": []}
  ]
}
```

## The Mental Model

A filter consumes a JSON value and produces **zero, one, or many values**. jq applies the filter to each input JSON value, not necessarily once per file.

| Filter | Result |
| --- | --- |
| `.` | The current value |
| `.orders` | The orders array as one value |
| `.orders[0]` | The first order; indexes start at zero |
| `.orders[-1]` | The last order |
| `.orders[0:2]` | A slice containing the first two orders; the end index is excluded |
| `.orders[]` | Each order as a separate output value |
| `[.orders[]]` | Those separate values collected into one array |
| `.orders \| map(.id)` | One array of IDs |

For a key containing punctuation, use brackets and a double-quoted string: `.["not-a-simple-key"]`.

The distinction between an array and a stream matters:

```sh
jq '.orders[].id' orders.json
```

```text
101
102
103
104
```

```sh
jq '.orders | map(.id)' orders.json
```

```json
[101, 102, 103, 104]
```

The first command emits four JSON numbers. The second emits one JSON array. Use `map(...)` or `[...]` when the consumer expects a single array.

## Most Useful Commands

All commands in this table work with the example data.

| Goal | Command |
| --- | --- |
| Pretty-print the document | `jq '.' orders.json` |
| Compact JSON on one line per output value | `jq -c '.' orders.json` |
| Inspect top-level keys | `jq 'keys' orders.json` |
| Count orders | `jq '.orders \| length' orders.json` |
| Get the first customer's name as plain text | `jq -r '.orders[0].customer' orders.json` |
| Emit one compact object per order | `jq -c '.orders[]' orders.json` |
| Keep only paid orders, as an array | `jq '.orders \| map(select(.status == "paid"))' orders.json` |
| Filter with multiple conditions | `jq '.orders \| map(select(.status == "paid" and .total >= 100))' orders.json` |
| Pick fields and rename one | `jq '.orders \| map({id, buyer: .customer, total})' orders.json` |
| Sort by total, lowest first | `jq '.orders \| sort_by(.total)' orders.json` |
| Get the two largest orders | `jq '.orders \| sort_by(.total) \| reverse \| .[:2]' orders.json` |
| Get the largest order | `jq '.orders \| max_by(.total)' orders.json` |
| Sum the totals | `jq '[.orders[].total] \| add // 0' orders.json` |
| List distinct customers, sorted | `jq '[.orders[].customer] \| unique' orders.json` |
| Flatten the item arrays by one level | `jq '[.orders[].items] \| flatten(1)' orders.json` |
| Supply a default for a missing field | `jq '.orders \| map({id, coupon: (.coupon // "NONE")})' orders.json` |
| Find orders that have a coupon key | `jq '.orders \| map(select(has("coupon")))' orders.json` |
| Match customer names with a regex | `jq '.orders \| map(select(.customer \| test("^a"; "i")))' orders.json` |
| Add a computed field | `jq '.orders \| map(. + {large: (.total >= 100)})' orders.json` |
| Update a nested value in the output | `jq '.orders[0].status = "refunded"' orders.json` |
| Transform an existing value | `jq '.orders \|= map(.total \|= (. * 100))' orders.json` |
| Remove a field | `jq '.orders \| map(del(.coupon))' orders.json` |

The `|` characters inside these filters are jq pipes, not shell pipes.

### Fields, Defaults, and Types

- `.missing` returns `null` for a missing object key. `has("missing")` distinguishes absence from a key explicitly holding `null`.
- `.coupon // "NONE"` uses the fallback for both `null` **and `false`**, not just missing keys. To preserve `false`, test explicitly for `null`.
- `select(...)` keeps the current value when its condition is truthy; otherwise it emits nothing. In jq, only `false` and `null` are falsey; `0`, `""`, and `[]` are truthy.
- `.field?` suppresses errors from an inappropriate input type, and `.[]?` can skip values that cannot be iterated. These are not general-purpose schema validation.
- `tonumber` converts numeric strings, but errors on invalid numbers. An expression such as `.total | tonumber` is useful when an API returns `"120"` instead of `120`.

## Pass Shell Values Safely

Use `--arg` for strings rather than constructing filter source by interpolating shell variables:

```sh
jq --arg status 'paid' '.orders | map(select(.status == $status))' orders.json
```

In a script, the value can be a quoted shell variable: `--arg status "$status"`. The jq filter remains single-quoted, and `$status` inside it is a jq variable.

Use `--argjson` for a JSON number, boolean, array, object, or `null`:

```sh
jq --argjson minimum 100 '.orders | map(select(.total >= $minimum))' orders.json
```

`--arg minimum 100` would supply the string `"100"`, not the number `100`. `--argjson` expects valid JSON; arbitrary unquoted text is not valid JSON.

You can also construct JSON without reading input. `-n` runs the filter once with `null` as input, while jq handles string escaping:

```sh
jq -n --arg customer 'Ada' --argjson total 120 '{customer: $customer, total: $total}'
```

```json
{"customer": "Ada", "total": 120}
```

## Worked Example: Paid Revenue by Customer

Suppose an API response contains the sample orders and you need one summary per customer, sorted by paid revenue:

```sh
jq '.orders
  | map(select(.status == "paid"))
  | group_by(.customer)
  | map({customer: .[0].customer, orders: length, revenue: (map(.total) | add)})
  | sort_by(.revenue)
  | reverse' orders.json
```

Output:

```json
[
  {
    "customer": "Ada",
    "orders": 2,
    "revenue": 200
  }
]
```

How it works:

1. `.orders` selects the array.
2. `map(select(...))` keeps paid orders and returns an array.
3. `group_by(.customer)` groups orders into arrays sharing a customer. It sorts by the grouping key itself; pre-sorting is unnecessary.
4. The next `map` creates one object per group. Within it, `.` refers to that group's array, so `length` counts orders and `map(.total) | add` sums their totals.
5. Sorting and reversing puts the highest revenue first.

With no paid orders, the result is `[]`. For exact financial accounting, prefer integer minor units, such as cents, and respect jq's numeric precision limits rather than relying on arbitrary decimal arithmetic.

## Text and Spreadsheet Output

Use `-r` to emit strings without JSON quotes. String interpolation inserts jq expressions with `\(...)`:

```sh
jq -r '.orders[] | "Order \(.id): \(.customer) owes \(.total)"' orders.json
```

The first line is `Order 101: Ada owes 120`.

Use arrays with `@csv` or `@tsv` to format rows:

```sh
jq -r '(["id", "customer", "total"], (.orders[] | [.id, .customer, .total])) | @csv' orders.json
```

```csv
"id","customer","total"
101,"Ada",120
102,"Ben",45
103,"Ada",80
104,"Chen",30
```

`@csv` quotes and escapes CSV fields; do not build CSV by simply joining values with commas. Spreadsheet applications can interpret formula-looking text as formulas even in valid CSV, so sanitize untrusted values for the target application.

## Useful CLI Options

| Option | Use |
| --- | --- |
| `-r` | Write string results as raw text; non-string results still use JSON formatting |
| `-c` | Write each output JSON value compactly on one line |
| `-S` | Sort object keys in the output; does not sort arrays |
| `-s` | Read all input JSON values into one array before filtering |
| `-R` | Read input lines as strings instead of parsing JSON |
| `-Rs` | Read the entire input as one string |
| `-n` | Run once without reading input; useful for constructing JSON |
| `-e` | Set exit status based on the last output value |
| `--arg name value` | Pass a string variable |
| `--argjson name json` | Pass a typed JSON variable |
| `--slurpfile name file` | Load a file's JSON values into an array variable |
| `-f filter.jq` | Read the jq program from a file instead of the command line |

### JSON Lines and Slurping

jq accepts consecutive JSON values, including newline-delimited JSON (JSON Lines). Pretty-printed input can span lines; a newline is not normally what defines a JSON value.

```sh
printf '%s\n' '{"total":120}' '{"total":80}' | jq -s 'map(.total) | add'
```

This prints `200`. Without `-s`, the filter would run separately for each input object. Slurping loads all values into memory; it is convenient for small datasets but can be costly for large files. jq's `--stream` option is a different, more advanced mode that emits path/value events for incremental processing.

## Checks in Scripts

Use `-e` with an expression that emits a boolean, for example to require at least one paid order:

```sh
jq -e 'any(.orders[]; .status == "paid")' orders.json
```

This prints `true` and exits with status `0` for the sample. With `-e`, a final result of `false` or `null` gives status `1`; no output gives status `4`. Parse errors and other failures are also nonzero.

Without `-e`, successfully evaluating `false` normally still exits successfully. Also, `jq -e '.'` is **not** a generic JSON validity check: valid JSON containing `false` or `null` fails its truthiness condition. Use `jq '.'` when you only need parsing, and remember that empty input contains no JSON value but normally still exits successfully.

In a shell pipeline, checking jq's status alone might miss a failure upstream. Where supported, enable `pipefail`, and use appropriate HTTP failure handling when piping an API response into jq.

## Common Mistakes

- **Using text search to parse JSON:** Formatting, escaped strings, and nesting can change without changing the data. Use field access and structured filters.
- **Confusing streams with arrays:** `.orders[].id` emits multiple values; `[.orders[].id]` produces one array.
- **Forgetting the current input:** In `.orders[] | .customer`, `.` now refers to an order, not the original document.
- **Using `-r` to convert a whole object into plain text:** It only changes how string results are written.
- **Assuming jq edits files:** Assignment filters change the output value, not the source file. Do not redirect output back to the same input path; the shell can truncate it before jq reads it. Use a separate output file, validate it, and replace the original deliberately.
- **Assuming every number is exact:** jq's number handling has precision limits. Avoid treating very large numeric identifiers or financial calculations as arbitrary-precision arithmetic.

## References

- [Official jq manual](https://jqlang.org/manual/)
- [Installation and downloads](https://jqlang.org/download/)
- [Interactive jq playground](https://play.jqlang.org/)

Examples use established jq features and were tested with jq 1.7.1. Consult the manual for differences in your installed version.