# Java Annotations: Practical Uses and Meta-Annotations

## 1. What Does `@interface` Mean?

An **annotation** attaches information to code, such as a class, method, or field. That information is called **metadata**: information describing the code rather than instructions executed by the code.

There are two distinct steps: **define the annotation type**, then **apply it**.

### Define the Annotation Type

```java
public @interface Audit {
    String action();
    boolean includeArguments() default false;
}
```

`@interface Audit` defines the annotation's name and available settings.

### Apply the Annotation

```java
@Audit(action = "delete-file")
public void deleteFile(String filename) {
    // Delete the file.
}
```

`@Audit(...)` attaches those settings to `deleteFile`. It does not call a method named `Audit`.

`action` is required; `includeArguments` is optional. The declarations look like methods, but define metadata values, not behavior to implement.

**This does not automatically write an audit log.** A consumer must read the annotation and act on it. For auditing, that consumer could be an interceptor: code that runs around a method call to record the operation.

```text
Annotation describes the operation -> consumer reads it -> consumer performs the behavior
```

An ordinary `interface` defines a behavior contract that classes implement. An `@interface` defines metadata that code carries.

If an element is named `value`, Java allows shorthand: `@Label("internal")` means `@Label(value = "internal")`. An annotation with no elements, such as `@Override`, is a marker annotation.

## 2. What Is a Meta-Annotation?

A **meta-annotation is an annotation applied to an annotation declaration**. It describes the annotation itself, rather than an application method or class.

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Audit {
    String action();
    boolean includeArguments() default false;
}
```

Read this declaration as: "Define `Audit`, allow it on methods, and keep its metadata available while the program runs."

| Annotation use | What it describes |
| --- | --- |
| `@Audit(action = "delete-file")` on `deleteFile` | The application method |
| `@Target(METHOD)` on `Audit` | Where the annotation may be used |
| `@Retention(RUNTIME)` on `Audit` | When its metadata remains available |

**Meta-annotation is a role, not a separate Java declaration syntax.** Both annotations and meta-annotations are defined using `@interface`; the difference is what they are attached to.

### Java's Standard Meta-Annotations

| Meta-annotation | Meaning | Practical reason to use it |
| --- | --- | --- |
| `@Retention` | Controls how long metadata survives | Use `RUNTIME` when a runtime framework needs to read it |
| `@Target` | Restricts where it can appear | A method interceptor may need a method-only annotation |
| `@Documented` | Includes annotation uses in generated Javadoc | Show callers an annotation that is part of the API contract |
| `@Inherited` | Enables superclass lookup for class annotations | Let subclasses inherit a class-level marker during annotation lookup |
| `@Repeatable` | Allows the same annotation several times | Attach several categories or declarations to one element |

Retention policies are `SOURCE` (not kept in class files), `CLASS` (kept, but unavailable through ordinary runtime reflection), and `RUNTIME` (available through reflection). **The default is `CLASS`.** Reflection means inspecting classes, methods, and their metadata while the program runs.

`@Inherited` does not apply to overridden methods or implemented interfaces. `@Repeatable` requires a container annotation holding an array of the repeated annotation type.

### From Meta-Annotations to Composition

A framework annotation can also be placed on another annotation declaration. For example, placing `@Transactional` on a custom `@ReadOnlyQuery` lets Spring reuse transaction settings through that custom annotation.

This is called a **composed annotation**. The framework must support looking through the annotation to find its meta-annotations; Java does not automatically combine their behavior. The examples below show both ordinary usage and this composition.

### How a Consumer Adds Behavior: An Audit Wrapper

The consumer does not modify the annotation or the method. It **reads the metadata and adds work around the method call**.

This standalone example simulates file deletion; it does not delete any files:

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Method;

public class AuditConsumerDemo {
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.METHOD)
    public @interface Audit {
        String action();
    }

    public static class FileActions {
        @Audit(action = "delete-file")
        public void deleteFile(String filename) {
            System.out.println("Simulated deletion: " + filename);
        }
    }

    public static void invokeWithAudit(Object target, Method method, Object... arguments)
            throws ReflectiveOperationException {
        Audit audit = method.getAnnotation(Audit.class);

        if (audit != null) {
            System.out.println("AUDIT attempt: " + audit.action());
        }

        method.invoke(target, arguments);
    }

    public static void main(String[] args) throws ReflectiveOperationException {
        FileActions fileActions = new FileActions();
        Method method = FileActions.class.getMethod("deleteFile", String.class);
        invokeWithAudit(fileActions, method, "notes.txt");
    }
}
```

Run as `java AuditConsumerDemo.java`. Output:

```text
AUDIT attempt: delete-file
Simulated deletion: notes.txt
```

The consumer is `invokeWithAudit`:

1. `getAnnotation` reads the method's annotation.
2. `audit.action()` retrieves `"delete-file"`.
3. `println` adds the audit behavior.
4. `method.invoke` executes the original method. An unannotated method would run without the audit message.

Calling `fileActions.deleteFile("notes.txt")` directly prints only the simulated deletion. **The additional behavior exists only when the call passes through the consumer.**

This logs an attempted operation, not a successful outcome. A production audit interceptor would also handle failures, record the caller, and use an appropriate logging system without exposing sensitive arguments. Framework proxies automate routing calls through interceptors; the underlying metadata-to-behavior principle is the same.

## 3. Common Framework and Application Uses

These examples illustrate existing framework annotations. You normally **use** them, rather than declare their annotation types yourself.

### HTTP Routing: Expose an Endpoint

```java
@RestController
public class GreetingController {
    @GetMapping("/hello")
    public String hello(@RequestParam(name = "name", defaultValue = "World") String name) {
        return "Hello, " + name;
    }
}
```

In a running Spring MVC application, `GET /hello?name=Sam` returns `Hello, Sam`.

- `@RestController`: makes this a controller whose return values become response bodies.
- `@GetMapping`: connects an HTTP GET path to a method.
- `@RequestParam`: binds a query-string parameter to an argument.

**Consumer:** Spring MVC discovers the route and invokes the method when a request arrives.

### Input Validation: Reject Invalid Requests

```java
public record SignupRequest(
        @NotBlank String username,
        @NotBlank @Email String email) {
}
```

Inside a controller:

```java
@PostMapping("/signups")
public String signup(@Valid @RequestBody SignupRequest request) {
    return "Accepted";
}
```

An empty username or malformed email is rejected before this method executes, normally with HTTP 400. This requires a Bean Validation provider, commonly supplied by Boot's validation starter.

**Consumer:** MVC triggers validation through `@Valid`; the validation provider checks the constraints. Simply constructing `new SignupRequest("", "bad")` does not automatically validate it.

### JSON Mapping: Adapt External Property Names

```java
public record Person(
        @JsonProperty("first_name") String firstName) {
}
```

Jackson maps `{"first_name":"Sam"}` to a `Person` whose `firstName()` is `"Sam"`. Serialization uses the same configured property name.

**Consumer:** Jackson reads `@JsonProperty` when converting between Java objects and JSON. This is useful when external JSON naming differs from Java naming.

### Transactions: Make Related Database Writes Atomic

```java
@Transactional
public void transfer(long fromAccount, long toAccount, BigDecimal amount) {
    debit(fromAccount, amount);
    credit(toAccount, amount);
}
```

With a transaction manager and participating database operations, both writes can commit together. By default, an unchecked exception triggers rollback; checked exceptions require suitable rollback configuration when rollback is desired.

**Consumer:** Spring's transaction interceptor surrounds the method call. In the usual proxy-based mode, the call must go through the Spring-managed proxy; calling another annotated method through `this` bypasses that interception.

### Caching: Avoid Repeating Expensive Reads

```java
@Cacheable(cacheNames = "weather", key = "#p0")
public Forecast forecast(String city) {
    return weatherClient.fetch(city);
}
```

For a cache hit, Spring returns the cached result without calling `weatherClient.fetch`. For a miss, it calls the method and caches the result. `#p0` means the first argument.

**Consumer:** Spring's caching interceptor. This requires caching to be enabled, usually with `@EnableCaching`, and a configured cache manager. Expiration and invalidation are separate concerns; the annotation does not choose a TTL.

### Testing: Mark Tests and Give Them Categories

```java
@Test
@Tag("fast")
void addsTwoNumbers() {
    assertEquals(5, calculator.add(2, 3));
}
```

JUnit discovers and runs the test. Build tools can include or exclude tests by tag. The `fast` tag is a category, not a timeout or performance guarantee.

## 4. Practical Meta-Annotations: Reuse Framework Behavior

Meta-annotations are especially useful for **composed annotations**: a purpose-specific annotation that packages existing framework settings.

### Spring: Standardize Read-Only Transactions

If many query methods use the same transaction settings, define one reusable annotation:

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.transaction.annotation.Transactional;

@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Transactional(readOnly = true)
public @interface ReadOnlyQuery {
}
```

Use it on a public method in a Spring-managed service:

```java
@ReadOnlyQuery
public List<Book> findBooks() {
    return bookRepository.findAll();
}
```

**What happens:** Spring discovers `@Transactional` through `@ReadOnlyQuery` and applies those transaction settings. You do not need to implement a new transaction interceptor.

`readOnly = true` is a hint to transaction infrastructure, not a universal guarantee that all writes are prohibited. The usual transaction-manager and proxy requirements still apply.

### JUnit: Standardize Fast Tests

JUnit supports composed annotations too:

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Test
@Tag("fast")
public @interface FastTest {
}
```

```java
@FastTest
void addsTwoNumbers() {
    assertEquals(5, calculator.add(2, 3));
}
```

**What happens:** JUnit recognizes the method as a test tagged `fast`, through the annotations on `FastTest`. This avoids repeating `@Test` and `@Tag("fast")` everywhere.

**Important:** Plain Java reflection does not automatically follow custom meta-annotations. Spring and JUnit explicitly support these compositions. An arbitrary annotation will not acquire behavior unless its consumer supports it.

## 5. How Spring Boot Leverages Annotations

### Startup: One Annotation Combines Three Responsibilities

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

`@SpringBootApplication` combines:

| Underlying annotation | Responsibility |
| --- | --- |
| `@SpringBootConfiguration` | Marks the application's configuration class |
| `@EnableAutoConfiguration` | Enables conditional configuration based on dependencies, properties, and existing beans |
| `@ComponentScan` | Discovers components, by default in the application's package and its subpackages |

Boot supplies startup and auto-configuration; Spring Framework supplies much of the scanning, dependency injection, and annotation processing.

### Bean Discovery and Injection

```java
@Service
public class GreetingService {
    public String greet() {
        return "Hello";
    }
}
```

Spring discovers the service because `@Service` is meta-annotated with `@Component`. It can then inject this service into another bean's constructor. A single constructor does not require `@Autowired`.

Other familiar composition relationships are:

```text
@Service        -> @Component
@RestController -> @Controller + @ResponseBody
@Controller     -> @Component
@GetMapping     -> @RequestMapping(method = GET)
```

These are simplified relationships, not complete annotation declarations. They explain how a specialized annotation reuses more general framework behavior.

### Custom Endpoint Convention With `@AliasFor`

Suppose many endpoints use HTTP GET and return JSON. Package those settings in a custom annotation:

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.core.annotation.AliasFor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@RequestMapping(method = RequestMethod.GET, produces = "application/json")
public @interface JsonGet {
    @AliasFor(annotation = RequestMapping.class, attribute = "path")
    String[] value() default {};
}
```

Inside a `@RestController`:

```java
@JsonGet("/status")
public Map<String, String> status() {
    return Map.of("status", "ok");
}
```

With Spring MVC and a JSON converter configured, `GET /status` returns `{"status":"ok"}`.

**How it works:** `@RequestMapping` supplies GET and the JSON media type. `@AliasFor` tells Spring to use `JsonGet.value` as `RequestMapping.path`. Spring combines those values when registering the route.

`String[]` matches the aliased attribute's type; Java allows a single value as shorthand. Do not put `@GetMapping` and `@JsonGet` on the same method. The `produces` setting declares the media type; a message converter still performs serialization.

## 6. When Should You Define Your Own Annotation?

- **Reuse existing framework settings:** compose annotations such as `@ReadOnlyQuery`, `@FastTest`, or `@JsonGet`.
- **Add cross-cutting application behavior:** define an annotation such as `@Audit` and implement or configure a supporting interceptor. Avoid recording secrets or sensitive arguments.
- **Describe a rule for tooling:** let a compiler processor or analysis tool read it.

Do not use annotations for values that change per request, such as user input. Use method arguments or configuration objects instead.

Annotation elements can hold primitives, strings, enums, class literals, other annotations, and one-dimensional arrays of those types. They cannot hold arbitrary objects, collections, or `null`. Primitive and string values must be compile-time constants.

## 7. Remember These Three Points

1. `@interface` defines metadata; it does not implement behavior.
2. Framework annotations work because a framework reads them and acts.
3. Meta-annotations let supported frameworks reuse and combine existing behavior under a clearer application-specific name.

**Example scope:** Snippets are independent excerpts, not a complete application. Imports are omitted except in custom annotation declarations. Public top-level types belong in matching source files. Examples require the relevant libraries: Spring MVC, Bean Validation, Jackson, Spring transactions/caching, or JUnit Jupiter. Application types such as repositories and clients stand for your own implementations.

## References

- [Spring Boot application annotation](https://docs.spring.io/spring-boot/reference/using/using-the-springbootapplication-annotation.html)
- [Spring component scanning and meta-annotations](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html)
- [Spring MVC request-body validation](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestbody.html)
- [Spring transactions and composed annotations](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
- [Spring AliasFor contract](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/core/annotation/AliasFor.html)
- [JUnit composed annotations](https://docs.junit.org/current/user-guide/#writing-tests-meta-annotations)