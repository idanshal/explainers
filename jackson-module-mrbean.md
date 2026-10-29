# Jackson 3 Mr Bean Module

This is a standalone guide to `jackson-module-mrbean` for Jackson 3.

## What It Does

Jackson normally needs a concrete class to create when it deserializes JSON. An interface or abstract class cannot be instantiated directly, so deserializing into one without additional type information or configuration usually fails.

Mr Bean is a Jackson module that can generate a concrete implementation at runtime for an interface or abstract class. Jackson can then deserialize JSON into that generated implementation while the application continues to refer to the declared interface or abstract type. This is sometimes called *bean materialization*.

For example, an application can declare a simple interface:

```java
public interface Point {
    int getX();
    void setX(int value);

    int getY();
}
```

With Mr Bean registered, Jackson can deserialize JSON directly to `Point`:

```java
String json = "{\"x\":12,\"y\":35}";
Point point = objectMapper.readValue(json, Point.class);
```

The generated implementation provides methods for the abstract bean-style properties. The application does not need to write or compile a concrete `Point` class itself.

## Jackson 3 Setup

For Maven, the Jackson 3 artifact uses the `tools.jackson.module` group:

```xml
<dependency>
    <groupId>tools.jackson.module</groupId>
    <artifactId>jackson-module-mrbean</artifactId>
    <version>${jackson.version}</version>
</dependency>
```

Use a version compatible with the rest of the Jackson 3 dependencies, preferably managed through the Jackson BOM rather than versioning individual Jackson artifacts independently.

Register the module with the Jackson 3 mapper builder:

```java
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.module.mrbean.MrBeanModule;

ObjectMapper objectMapper = JsonMapper.builder()
        .addModule(new MrBeanModule())
        .build();
```

After registration, use the mapper normally. Mr Bean participates when Jackson encounters an abstract class or interface as a deserialization target.

## When It Is Useful

Mr Bean can help when:

- A target type is an interface or abstract class and there is no concrete implementation available to instantiate.
- The type is a simple bean-style data model, and a generated implementation is acceptable.
- The application must keep an interface-based API while receiving JSON data.

Without Mr Bean, Jackson generally cannot instantiate an abstract target by itself. Common alternatives are to deserialize into a concrete DTO, register a specific abstract-to-concrete mapping, or use Jackson's polymorphic type support when the JSON identifies one of several real subtypes.

## Limitations and Cautions

- Mr Bean is best suited to simple bean-like interfaces and abstract classes. It generates implementations for abstract methods based on their signatures; it is not a general-purpose replacement for carefully designed concrete domain classes.
- Abstract types annotated with `@JsonTypeInfo` are not materialized by Mr Bean. That annotation indicates polymorphic deserialization, where Jackson should select a real subtype instead. Do not rely on Mr Bean and default typing working together; use an explicit subtype strategy for polymorphic data.
- The generated implementation exists at runtime. It is not a source file that the application can edit or refer to by a stable, application-defined class name.
- If you control the model, a concrete DTO or an explicit implementation is usually easier to understand and maintain. Use Mr Bean when dynamic implementation of an abstraction is genuinely useful.

## Jackson 3 Package Names

Jackson 3 moved most databinding APIs from `com.fasterxml.jackson.databind` to `tools.jackson.databind`. Mr Bean's Jackson 3 module is `tools.jackson.module.mrbean`. Jackson annotations remain in `com.fasterxml.jackson.annotation`, so annotation imports do not follow the databinding package rename.

## References

- [Mr Bean documentation for Jackson 3](https://github.com/FasterXML/jackson-modules-base/tree/3.x/mrbean)
- [Jackson 3 databind documentation](https://github.com/FasterXML/jackson-databind/tree/3.x)