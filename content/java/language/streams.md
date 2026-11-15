# Java Streams: Transforming, Flattening, and Collecting Data

Streams describe a computation over a sequence of elements: select the elements you need, transform them, and produce a result. They are useful when that pipeline communicates the intent more clearly than a loop.

**Documentation baseline:** checked on November 4, 2026 against the official **Java SE 27** API and stream package documentation. The executable examples below use Java 17+ features, require no external dependencies, and can be read in order using the shared imports and sample data.

## What Is a Stream?

A `java.util.stream.Stream<T>` is a sequence of elements supporting aggregate operations. Unlike a collection, it does not store elements or provide indexed access. It describes how to process a source, such as a list, array, generated sequence, or file.

Do not confuse it with `InputStream` and `OutputStream`, which read and write bytes.

Every pipeline has three parts:

```text
source -> intermediate operations -> terminal operation
list.stream() -> filter(...).map(...) -> toList()
```

| Part | Examples | What it does |
| --- | --- | --- |
| Source | `list.stream()`, `Arrays.stream(array)`, `Stream.of(...)` | Supplies elements. |
| Intermediate operation | `filter`, `map`, `flatMap`, `distinct`, `sorted`, `limit` | Returns a stream describing another processing stage. |
| Terminal operation | `toList`, `collect`, `count`, `sum`, `findFirst`, `anyMatch`, `forEach` | Initiates computation and produces a result or effect. |

Intermediate operations are **lazy**: adding a `filter` does not immediately traverse the source. A terminal operation drives processing, consuming only as much as needed. For example, `anyMatch` can stop after finding a match.

A stream is **single-use**. Create a fresh `orders.stream()` for each independent computation; do not save one stream and try to run two terminal operations on it. Collection-backed streams normally need no closing. Resource-backed streams such as `Files.lines(path)` require try-with-resources; a terminal operation does not automatically close them.

## Why Use Streams?

- **Express intent.** A pipeline can say "paid orders, then customer names, then unique names" without exposing accumulator management.
- **Compose transformations.** Filtering, flattening, grouping, and aggregation fit together without intermediate collections between every stage.
- **Avoid unnecessary work.** Laziness and short-circuiting let operations such as `findFirst` or `anyMatch` avoid consuming the whole source when possible.
- **Reuse standard aggregation strategies.** Collectors handle grouping, counting, joining, and map construction.

Streams are not automatically faster, more memory-efficient, or more readable than loops. Prefer a loop for complicated branching, explicit `break` / `continue`, checked-exception-heavy work, or sequences of commands with important side effects. A short loop is better than a pipeline full of mutable workarounds.

Java streams also do **not** translate arbitrary lambdas into SQL. Streaming an already loaded collection processes it in Java; push suitable database filtering and aggregation into the database when possible.

## Shared Sample Data

These imports and declarations support the examples that follow. Amounts are represented in cents to avoid using floating-point arithmetic for money. The sample lists and their elements are non-null unless an example explicitly introduces nulls.

```java
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

record Order(String id, String customer, boolean paid,
             long totalCents, List<String> items) {}

List<Order> orders = List.of(
        new Order("A1", "Maya", true, 2500, List.of("book", "pen")),
        new Order("A2", "Noah", false, 1500, List.of("book")),
        new Order("A3", "Maya", true, 4000, List.of("lamp", "book")));
```

## Filter, Map, and Aggregate

`filter` keeps or discards an element. `map` transforms each element into one result, possibly changing its type.

```java
List<String> paidCustomers = orders.stream()
        .filter(Order::paid)
        .map(Order::customer)
        .distinct()
        .toList();

long paidTotalCents = orders.stream()
        .filter(Order::paid)
        .mapToLong(Order::totalCents)
        .sum();

boolean hasUnpaidOrder = orders.stream()
        .anyMatch(order -> !order.paid());
```

The results are `[Maya]`, `6500`, and `true`. `Order::paid` is a method reference equivalent to `order -> order.paid()`.

`mapToLong` produces a primitive `LongStream`, avoiding a boxed `Long` for each mapped value and exposing numeric operations such as `sum`. Similar specializations exist for `int` and `double`.

Use the terminal operation matching the question: `anyMatch` for existence, `count` for quantity, `min` / `max` for an extremum. Do not collect an entire list just to ask whether it is empty.

## Does `filter(...).filter(...)` Matter?

### Two Filters Mean AND, Not OR

```java
List<Order> separateFilters = orders.stream()
        .filter(Order::paid)
        .filter(order -> order.totalCents() >= 3000)
        .toList();

List<Order> combinedFilter = orders.stream()
        .filter(order -> order.paid() && order.totalCents() >= 3000)
        .toList();
```

Both select order `A3`. With pure predicates, the same predicate order, and the same terminal operation, these forms express the same selection. An element rejected by the first condition never reaches the second. Java's `&&` also short-circuits; `&` evaluates both sides and is not the equivalent replacement.

Choose separate filters when they name independent rules clearly. Combine them when the conditions read naturally together. Neither form is universally faster.

If the exact same pure predicate appears twice, `filter(predicate).filter(predicate)` does not change the selected elements compared with one filter, but may perform redundant checks for survivors. A stateful predicate that returns different answers across calls is not a valid basis for this simplification.

### Two Filters Are Not Two Full Passes

In a typical sequential pipeline containing only stateless stages such as `filter` and `map`, stages are fused: each element passes through the applicable stages before the next element is requested. There is no intermediate list after the first filter.

```text
order A1 -> paid? yes -> at least 3000? no  -> discard
order A2 -> paid? no                       -> discard
order A3 -> paid? yes -> at least 3000? yes -> retain
```

This is a useful execution model, not a promise about exact callback scheduling in every implementation or in parallel pipelines. Stateful operations such as `sorted` may need buffering, and short-circuiting may stop processing early.

### Filter Order Can Matter

For **pure predicates that are defined for every input**, swapping two adjacent filters preserves which elements survive. It can still change cost: put a cheap condition that rejects many elements before expensive work when the logic permits it.

But a condition may be a safety guard for the next condition:

```java
List<String> nonBlankNames = Stream.of("Maya", null, " ", "Noah")
        .filter(Objects::nonNull)
        .filter(name -> !name.isBlank())
        .toList();
```

This produces `[Maya, Noah]`. Reversing these filters would call `isBlank()` on null and throw `NullPointerException`. Combining them as `name -> name != null && !name.isBlank()` is safe because the guard remains first.

Predicates should be stateless and non-interfering: do not modify the source or base decisions on mutable state that changes during execution. Do not use logging, counters, network calls, or mutation inside predicates as a contract for required effects.

### The Operations Between Filters Matter Too

```java
List<Integer> filterThenLimit = Stream.of(1, 2, 3, 4)
        .filter(number -> number % 2 == 0)
        .limit(2)
        .toList();

List<Integer> limitThenFilter = Stream.of(1, 2, 3, 4)
        .limit(2)
        .filter(number -> number % 2 == 0)
        .toList();
```

The first returns `[2, 4]`; the second returns `[2]`. Do not merge or move filters across other operations without checking the semantics.

## FlatMap: One Element Becomes Zero or More Elements

`map` returns one output per input. If that output is a collection, it remains a collection. `flatMap` maps each input to a **stream** and flattens those streams by one level.

```java
List<List<String>> itemLists = orders.stream()
        .map(Order::items)
        .toList();

List<String> allItems = orders.stream()
        .flatMap(order -> order.items().stream())
        .toList();
```

`itemLists` is `[[book, pen], [book], [lamp, book]]`. `allItems` is `[book, pen, book, lamp, book]`. Mapping to `order.items().stream()` with `map` would instead produce a stream of streams, not a flattened stream of strings.

### Use Case: Unique Items Across Paid Orders

```java
List<String> uniquePaidItems = orders.stream()
        .filter(Order::paid)
        .flatMap(order -> order.items().stream())
        .distinct()
        .sorted()
        .toList();
```

The result is `[book, lamp, pen]`. Filtering orders before flattening avoids visiting items in unpaid orders. Filtering after flattening would operate on strings, not orders.

### Use Case: Flatten Nested Collections

```java
List<List<Integer>> batches = List.of(List.of(1, 2), List.of(), List.of(3));

List<Integer> numbers = batches.stream()
        .flatMap(Collection::stream)
        .toList();
```

The result is `[1, 2, 3]`; an empty inner list contributes zero elements. Flattening is not recursive: another nesting level would need another transformation.

### Use Case: Keep Present Optional Values

```java
List<Optional<String>> lookups = List.of(
        Optional.of("Maya"), Optional.empty(), Optional.of("Noah"));

List<String> foundNames = lookups.stream()
        .flatMap(Optional::stream)
        .toList();
```

The result is `[Maya, Noah]`. Since Java 9, `Optional.stream()` yields one element if present and zero if empty, avoiding an unchecked `get()`.

Prefer empty collections or streams over nulls. Although `flatMap` treats a null *mapped stream* as empty, `order.items().stream()` still throws if `items()` itself returns null.

For small zero-to-many expansions, Java 16+ also offers `mapMulti`, which lets a callback emit elements without constructing a separate stream per input. Use it when that form is clearer or measurement justifies it; `flatMap` remains a natural fit when you already have nested collections or streams.

## Collect: Describe the Result You Want

`collect` is a terminal operation performing a **mutable reduction**: it accumulates elements into result containers, potentially combines partial results, and optionally finishes them into another result. The final result need not itself be mutable or even be a collection.

`Collector` is the strategy; `Collectors` is the utility class supplying standard strategies. Prefer those strategies over manually implementing a collector.

### Lists: Choose Mutability Explicitly

| Expression | Contract |
| --- | --- |
| `stream.toList()` | Java 16+; unmodifiable list, in encounter order if defined. |
| `stream.collect(Collectors.toList())` | List in encounter order; no guarantee of implementation type, mutability, serializability, or thread safety. |
| `stream.collect(Collectors.toCollection(ArrayList::new))` | Explicitly creates a mutable `ArrayList`. |
| `stream.collect(Collectors.toUnmodifiableList())` | Java 10+; unmodifiable list; rejects null elements. |

An unmodifiable list prevents structural changes and element replacement; it does not make mutable element objects deeply immutable. Do not replace `collect(toList())` with `toList()` blindly if callers mutate the result.

```java
ArrayList<String> editableCustomers = orders.stream()
        .map(Order::customer)
        .collect(Collectors.toCollection(ArrayList::new));

editableCustomers.add("Leah");
```

### Use Case: Group Orders by Customer

```java
Map<String, List<Order>> ordersByCustomer = orders.stream()
        .collect(Collectors.groupingBy(Order::customer));

Map<String, Long> orderCounts = orders.stream()
        .collect(Collectors.groupingBy(Order::customer, Collectors.counting()));

Map<String, Long> totalsByCustomer = orders.stream()
        .collect(Collectors.groupingBy(
                Order::customer, Collectors.summingLong(Order::totalCents)));
```

Maya has two orders totaling `6500` cents; Noah has one totaling `1500`. The second collector inside `groupingBy` is called a **downstream collector**: it describes what to compute within each group.

The default `groupingBy` does not guarantee map key iteration order or map/list mutability. Choose a map factory, such as `TreeMap::new`, if sorted keys are part of your contract.

### Use Case: Build a Lookup Map and Handle Duplicate Keys

```java
Map<String, Order> ordersById = orders.stream()
        .collect(Collectors.toMap(Order::id, Function.identity()));

Map<String, Long> mergedTotals = orders.stream()
        .collect(Collectors.toMap(
                Order::customer, Order::totalCents, Long::sum));
```

`Function.identity()` keeps the original object as the value. The two-argument `toMap` throws `IllegalStateException` for duplicate keys, even if the mapped values are equal. The three-argument version defines a merge policy; here totals for the same customer are added.

Do not silently choose "first wins" or "last wins" unless that is the required business rule. Use `groupingBy` when every value for a key should be retained. Do not assume arbitrary null values are supported; normalize or reject them deliberately.

#### Choose Keys and Values Independently

A lookup map is useful when later code repeatedly finds objects by ID instead of scanning a list. A map can also contain a projection rather than the whole object:

```java
Map<String, Long> totalsByOrderId = orders.stream()
        .collect(Collectors.toMap(Order::id, Order::totalCents));

Order selectedOrder = ordersById.get("A3");
```

`totalsByOrderId` maps `A1` to `2500`, `A2` to `1500`, and `A3` to `4000`. `selectedOrder` is the order with ID `A3`. For these non-null values, a missing key makes `get` return null; decide whether that means "not found" or an application error.

#### Make Duplicate-Key Policy Explicit

Keys are not unique just because the input objects are different. The sample has two distinct orders for Maya, so mapping customer names to orders needs a decision:

```java
Map<String, Order> firstOrderByCustomer = orders.stream()
        .collect(Collectors.toMap(
                Order::customer, Function.identity(),
                (existing, incoming) -> existing));

Map<String, Order> lastOrderByCustomer = orders.stream()
        .collect(Collectors.toMap(
                Order::customer, Function.identity(),
                (existing, incoming) -> incoming));
```

For this ordered input, Maya maps to `A1` in the first result and `A3` in the second. "Last" means last in encounter order, **not newest by timestamp**. If the requirement is "newest", compare an explicit timestamp instead. Without a defined encounter order, these policies do not identify a stable business winner.

Use the two-argument overload when duplicate IDs indicate bad data and should fail. Use a merge function such as `Long::sum` for aggregation, or `groupingBy` for `Map<String, List<Order>>` when keeping every order is the point. Merge functions must be associative to support correct parallel reduction; subtraction is not a suitable merge rule.

#### Choose Map Ordering and Mutability

The default `toMap` does not guarantee a map implementation, iteration order, mutability, serializability, or thread safety. The four-argument overload lets you supply a specific map:

```java
LinkedHashMap<String, Order> orderedOrdersById = orders.stream()
        .collect(Collectors.toMap(
                Order::id, Function.identity(),
                (existing, incoming) -> {
                    throw new IllegalStateException("Duplicate order ID: " + existing.id());
                },
                LinkedHashMap::new));

Map<String, Order> unmodifiableOrdersById = orders.stream()
        .collect(Collectors.toUnmodifiableMap(Order::id, Function.identity()));
```

The `LinkedHashMap` preserves insertion order, giving keys `A1`, `A2`, `A3` for this pipeline, and is mutable. Its throwing merge function preserves the duplicate-ID validation of the simpler overload. Supply `TreeMap::new` instead if keys must be sorted.

`toUnmodifiableMap` (Java 10+) prevents map changes, rejects null keys and values, and rejects duplicate keys unless a merge function is supplied. It does not promise encounter-order iteration or deep immutability of the stored objects. Prefer non-null keys and values for all these examples; do not rely on implementation-specific null-key behavior of a default `toMap`.

### Use Case: Partition, Join, or Preserve Unique Encounter Order

```java
Map<Boolean, List<Order>> byPaymentStatus = orders.stream()
        .collect(Collectors.partitioningBy(Order::paid));

String customerLabel = orders.stream()
        .map(Order::customer)
        .distinct()
        .collect(Collectors.joining(", "));

Set<String> uniqueCustomers = orders.stream()
        .map(Order::customer)
        .collect(Collectors.toCollection(LinkedHashSet::new));
```

`partitioningBy` always supplies both Boolean keys, including an empty partition when needed. `customerLabel` is `Maya, Noah`. The `LinkedHashSet` preserves the unique customers' encounter order; `Collectors.toSet()` does not guarantee that order or a particular set implementation.

### Use Case: Group First, Flatten Within Each Group

```java
Map<String, Set<String>> itemsByCustomer = orders.stream()
        .collect(Collectors.groupingBy(
                Order::customer,
                Collectors.flatMapping(
                        order -> order.items().stream(),
                        Collectors.toSet())));
```

`Collectors.flatMapping` is a downstream collector, not the intermediate `Stream.flatMap` operation. It preserves the customer grouping context while collecting item strings. Maya's set contains `book`, `pen`, and `lamp`; Noah's contains `book`. Set iteration order is unspecified.

Similarly, `Collectors.filtering` filters *inside* a group. With `groupingBy`, it can retain a group with an empty result, whereas filtering the stream before grouping removes a key entirely if none of its elements survive.

## Reduce: Combine Elements Into One Value

`reduce` is a terminal operation that combines elements into one result. Typical uses include totals, products, or combining immutable domain values when there is no more specific terminal operation. It is not limited to numbers, but its combination rules must be valid regardless of how work is partitioned.

### With an Identity: A Result Even for Empty Input

```java
long reducedTotalCents = orders.stream()
        .map(Order::totalCents)
        .reduce(0L, Long::sum);

long emptyTotalCents = Stream.<Long>empty()
        .reduce(0L, Long::sum);
```

The results are `8000` and `0`. The **identity** is a neutral value: adding zero does not change a total. It is also the result for an empty stream. For multiplication the identity would be one, not zero.

For ordinary numeric totals, prefer the clearer primitive specialization: `orders.stream().mapToLong(Order::totalCents).sum()`. The explicit reduction is useful for understanding the mechanism and for custom combination rules.

### Without an Identity: Optional for Empty Input

```java
Optional<Long> largestTotalCents = orders.stream()
        .map(Order::totalCents)
        .reduce(Long::max);

Optional<Long> emptyLargestTotal = Stream.<Long>empty()
        .reduce(Long::max);
```

The results are `Optional[4000]` and `Optional.empty()`. Without an identity, the first available value seeds the reduction. `Optional` represents the absence of a result when no element exists. Do not immediately call `get()` without handling that case.

For this particular question, `mapToLong(Order::totalCents).max()` is more direct and returns an `OptionalLong`.

### Three Arguments: Input and Result Types Can Differ

```java
long directReducedTotalCents = orders.stream()
        .reduce(
                0L,
                (subtotal, order) -> subtotal + order.totalCents(),
                Long::sum);

long parallelReducedTotalCents = orders.parallelStream()
        .reduce(
                0L,
                (subtotal, order) -> subtotal + order.totalCents(),
                Long::sum);
```

Both produce `8000`. The input type is `Order`; the result type is `Long`.

| Argument | Responsibility |
| --- | --- |
| Identity: `0L` | Neutral result value, also returned for empty input. |
| Accumulator: `(subtotal, order) -> ...` | Combines a partial result with one input element. |
| Combiner: `Long::sum` | Combines partial results, especially when processing in parallel. |

For example, partitions containing `A1, A2` and `A3` produce subtotals `4000` and `4000`; the combiner adds them to `8000`. The runtime chooses partitioning, so correctness must not depend on these particular groups.

The accumulator and combiner must agree: accumulating an element into a subtotal must have the same effect as combining that subtotal with the result of accumulating the element from the identity. Here both add exactly that order's total.

### Rules That Keep Reduction Correct

- **Associativity:** regrouping must not change the result. Addition of these integer totals works; subtraction does not. Floating-point addition can produce rounding differences when regrouped.
- **A genuine identity:** do not use `100L` as the identity for addition to "add a fee once". Parallel reduction can introduce the identity in multiple partitions. Sum from zero, then add a one-time fee to the final result.
- **Stateless, non-interfering callbacks:** do not mutate the source or depend on changing external state.
- **No shared mutable identity:** an `ArrayList` identity that is mutated during `reduce` is not a fresh container per partition. Use `collect`, whose supplier creates separate containers.

Integer arithmetic still has range limits. The sample totals fit in `long`; use an appropriate numeric representation and overflow policy for your domain rather than assuming a reduction detects overflow.

### Reduce Versus Collect

Use `reduce` for combining values, normally by returning a new result rather than mutating a shared container. Use `collect` for accumulating into lists, maps, sets, or other mutable result containers. Both can ultimately produce a single object; the difference is the reduction mechanism, not simply "one result versus many".

The three-argument `collect` makes the mechanics explicit:

```java
ArrayList<String> collectedCustomers = orders.stream()
        .map(Order::customer)
        .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
```

The supplier creates a fresh container, the accumulator adds an element, and the combiner merges partial containers. This is safe with a parallel stream too: the reduction manages container isolation. Adding to one shared `ArrayList` from a parallel `forEach` is not equivalent and is unsafe.

## Other Repeated Operations

Repeating an operation is legal when types match, but its meaning depends on that operation. For finite ordered inputs and pure callbacks:

| Pipeline | Meaning |
| --- | --- |
| `filter(first).filter(second)` | Keep elements satisfying both predicates. |
| `map(first).map(second)` | Apply the second transformation to the first transformation's result. Repetition is not generally redundant. |
| `flatMap(first).flatMap(second)` | Expand results again; useful for another nesting level. |
| `distinct().distinct()` | Same selected elements as one `distinct`, assuming stable equality. |
| `limit(10).limit(3)` | Same elements as `limit(3)`. |
| `skip(2).skip(3)` | Same elements as `skip(5)`. |
| `sorted(first).sorted(second)` | The second comparator determines final order; stable sorting preserves first-sort order only among second-comparator ties. |

For "sort by customer, then by order ID", use one composed comparator instead of trying to infer priority from two sorts:

```java
List<Order> sortedOrders = orders.stream()
        .sorted(Comparator.comparing(Order::customer).thenComparing(Order::id))
        .toList();
```

Finally, `forEach` returns `void`, so `forEach(...).forEach(...)` is not a valid chain. Two terminal actions require fresh streams, a deliberate combined action, or a suitable combined collector such as `Collectors.teeing` for two aggregations.

## Common Traps

- **Required effects in `peek` or `map`.** The implementation may skip stages if they cannot affect the terminal result; a sized source followed by `peek(...).count()` may not invoke `peek` at all. Use `peek` for debugging, not persistence, auditing, or correctness-critical validation.
- **Source mutation.** Do not add or remove elements from an ordinary source collection while its pipeline executes. A new output collection also does not imply the original objects were copied.
- **Assuming all streams are ordered.** Lists have encounter order; sources such as `HashSet` do not promise it. `findFirst` uses encounter order if present, while `findAny` may choose any element.
- **Automatic parallelism.** `stream()` is sequential; `parallelStream()` requests parallel execution. Parallel processing adds overhead and is not a general solution for blocking database or HTTP calls. Measure representative workloads before choosing it.
- **Confusing processing order with result order.** An ordered parallel pipeline can still produce an encounter-ordered list, while callbacks execute on different threads. Parallel `forEach` does not promise encounter order; `forEachOrdered` does when the stream has one.
- **Unbounded sources.** Infinite streams need a terminating computation. Adding `limit` after an operation that needs the complete input, such as sorting an unbounded generated stream, does not make that computation finish.

Modern streams also support `gather` and standard `Gatherers` (final since Java 24) for richer intermediate transformations such as windows. They complement these fundamentals; they are not required for ordinary filtering, flattening, and collecting.

## Bottom Line

Use streams for clear data transformations, not just to replace every loop. Two adjacent filters are normal and do not imply two materialized passes. Preserve safety guards, reason about operation order, use `flatMap` for zero-to-many expansion, and choose a collector whose result shape, ordering, and mutability match the caller's needs. For maps, decide what duplicate keys mean. For `reduce`, require an associative combination and a genuine identity when one is supplied.

## Official References

- [Java SE 27: Stream](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/stream/Stream.html)
- [Java SE 27: Stream Package, Laziness, Ordering, and Side Effects](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/stream/package-summary.html)
- [Java SE 27: Collectors](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/stream/Collectors.html)
- [Java SE 27: Collector Contract](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/stream/Collector.html)
- [Java SE 27: Predicate Composition](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/function/Predicate.html)
- [Java SE 27: Gatherers](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/stream/Gatherers.html)
- [OpenJDK: JDK 27 Release and API Links](https://jdk.java.net/27/)