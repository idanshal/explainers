# Super Type Tokens in Java

A **super type token** is an object that carries a generic type description, such as `List<User>` or `Map<String, List<User>>`, into runtime code. Libraries use that description when a plain `Class<?>` cannot express the requested type.

The usual syntax looks unusual but has a specific purpose:

```java
ParameterizedTypeReference<List<User>> usersType =
        new ParameterizedTypeReference<List<User>>() {};
```

The empty `{}` creates an **anonymous subclass**. Its declared generic superclass records `List<User>`, which the token implementation can read through reflection. This example uses Spring's `org.springframework.core.ParameterizedTypeReference`; `User` is your application's model class.

**Documentation baseline:** checked on November 4, 2026 using Java SE 27 reflection documentation, the current Spring Framework API/reference, and Jackson's current 3.x source documentation. The standalone demonstration requires Java 17+; Spring and Jackson examples require their respective libraries. This is a longstanding Java pattern, not a new Java 27 language feature.

## The Problem: Class Tokens Cannot Describe Every Type

A **type token** is a value representing a type. `String.class`, whose type is `Class<String>`, is the simplest example. An API receiving it knows that the requested runtime class is `String`.

For an ordinary model, `User.class` is enough. For a parameterized collection, Java has no class literal `List<User>.class`. `List.class` represents the list interface but does not say what its elements should be.

This matters when deserializing JSON:

```json
[{"id":1,"name":"Maya"},{"id":2,"name":"Noah"}]
```

The JSON contains objects, but not a Java declaration saying "these objects are Users". A decoder needs the target type. Given only `List.class`, a JSON library may produce a list of generic maps rather than `User` instances. Assigning or casting that result to `List<User>` does not convert the maps; it can defer a `ClassCastException` until an element is used.

| Target | Is a class token sufficient? | Typical argument |
| --- | --- | --- |
| `User` | Yes | `User.class` |
| `User[]` | Yes; the component class is known | `User[].class` |
| `List<User>` | No | A token carrying `List<User>` |
| `Map<String, List<User>>` | No | A token carrying the complete nested type |
| `Envelope<User>` | No, if the consumer needs the payload type | A token carrying `Envelope<User>` |

The relevant question is not simply "does the class use generics?" It is "does this operation need information that the raw class does not provide?"

## How Does This Work With Type Erasure?

Java generally implements generics through **type erasure**. Ordinary `new ArrayList<String>()` and `new ArrayList<Integer>()` instances have the same runtime class. Their objects do not each carry a separate reified element-type argument.

However, erasure does **not** mean all generic metadata disappears. Generic declarations on fields, methods, and superclasses can be retained in class-file signatures and exposed by reflection.

The token pattern deliberately places the target type in one such declaration:

```text
new Token<List<String>>() {}
             |
             v
anonymous subclass declares: extends Token<List<String>>
             |
             v
getGenericSuperclass() describes Token<List<String>>
             |
             v
getActualTypeArguments()[0] describes List<String>
```

**"Super" refers to the superclass declaration being inspected.** It has nothing to do with the wildcard syntax `? super User`, a call to `super()`, or creating a superclass instance instead of a subclass.

The Java reflection API distinguishes several descriptions:

| Reflection type | Example it can describe |
| --- | --- |
| `Class<?>` | `String`, raw `List`, or `User[]` |
| `ParameterizedType` | `List<String>` or `Map<String, List<User>>` |
| `TypeVariable<?>` | An unresolved `T` from a generic declaration |
| `WildcardType` | `? extends Number` or `? super User` |
| `GenericArrayType` | An array whose component is a parameterized type or type variable, such as `T[]` |

All implement `java.lang.reflect.Type`. A `Type` is metadata, not necessarily a `Class` you can cast to or instantiate directly.

## A Runnable Demonstration Without Libraries

This deliberately small implementation supports **direct subclasses only**. Use established library tokens in application code; a production implementation may need inheritance traversal, type-variable resolution, equality, and other rules that this demonstration does not implement.

```java
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class TokenDemo {

    public abstract static class Token<T> {
        private final Type type;

        protected Token() {
            Type superclass = getClass().getGenericSuperclass();
            if (!(superclass instanceof ParameterizedType parameterized)
                    || parameterized.getRawType() != Token.class) {
                throw new IllegalArgumentException("Use a direct parameterized Token subclass");
            }
            type = parameterized.getActualTypeArguments()[0];
        }

        public final Type getType() {
            return type;
        }
    }

    static <T> Token<List<T>> unresolvedListType() {
        return new Token<List<T>>() {};
    }

    public static void main(String[] args) {
        Token<List<String>> strings = new Token<List<String>>() {};
        Token<Map<String, List<Long>>> nested =
                new Token<Map<String, List<Long>>>() {};

        System.out.println(strings.getType().getTypeName());
        System.out.println(nested.getType().getTypeName());
        System.out.println(new ArrayList<String>().getClass()
                .equals(new ArrayList<Integer>().getClass()));

        Token<List<String>> unresolved = TokenDemo.<String>unresolvedListType();
        ParameterizedType listType = (ParameterizedType) unresolved.getType();
        System.out.println(listType.getActualTypeArguments()[0] instanceof TypeVariable<?>);
    }
}
```

Expected output:

```text
java.util.List<java.lang.String>
java.util.Map<java.lang.String, java.util.List<java.lang.Long>>
true
true
```

The first two lines demonstrate captured declarations. The third demonstrates erasure of ordinary collection instances. The fourth demonstrates an important limitation: supplying `<String>` at a method call does not rewrite the method's anonymous class signature to contain `String` instead of `T`.

The braces are an empty **class body**, not double-brace collection initialization. A named direct subclass, such as `class UserListToken extends Token<List<User>> {}`, can capture the same metadata too.

## Use Case: Generic HTTP Responses in Spring

For Spring HTTP clients, use `ParameterizedTypeReference<T>`. It lives in `spring-core`; the `RestClient` API lives in `spring-web`.

The following class assumes a configured `RestClient` with a base URL and a compatible JSON message converter. In a Boot application, obtain the client through your normal configured builder rather than bypassing application settings. The remote `/users` endpoint must return a JSON array matching the model.

```java
import java.util.List;
import java.util.Objects;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;

public class UsersClient {
    public record User(long id, String name) {}

    private static final ParameterizedTypeReference<List<User>> USERS_TYPE =
            new ParameterizedTypeReference<List<User>>() {};

    private final RestClient restClient;

    public UsersClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public List<User> fetchUsers() {
        return Objects.requireNonNull(
                restClient.get()
                        .uri("/users")
                        .retrieve()
                        .body(USERS_TYPE),
                "Expected a response body");
    }

    public <T> T fetch(String path, ParameterizedTypeReference<T> responseType) {
        return Objects.requireNonNull(
                restClient.get().uri(path).retrieve().body(responseType),
                "Expected a response body");
    }
}
```

`body(USERS_TYPE)` gives the message converter both the outer list type and the element type. `body(List.class)` would not. The explicit empty-body policy is separate: a type token does not guarantee that an HTTP response contains a body.

For the generic `fetch` helper, construct the token **at the caller**, where the type is concrete, and pass it in. For example, call `client.fetch("/users", new ParameterizedTypeReference<List<UsersClient.User>>() {})`.

`RestClient` is available since Spring Framework 6.1. The same token pattern is used by `WebClient.bodyToMono(...)` for a generic response body. Tokens are reusable metadata, so a `static final` constant is reasonable for a frequently used fixed type.

## Use Case: JSON Deserialization With Jackson 3

Jackson uses its own `TypeReference<T>`, not Spring's `ParameterizedTypeReference<T>`. With Jackson 3, the relevant imports start with `tools.jackson`:

```java
import java.util.List;
import java.util.Map;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

public class JsonTokenDemo {
    public record User(long id, String name) {}

    public static void main(String[] args) {
        JsonMapper mapper = JsonMapper.builder().build();

        String usersJson = "[{\"id\":1,\"name\":\"Maya\"}]";
        List<User> users = mapper.readValue(
                usersJson, new TypeReference<List<User>>() {});

        String groupedJson = "{\"engineering\":[{\"id\":1,\"name\":\"Maya\"}]}";
        Map<String, List<User>> usersByTeam = mapper.readValue(
                groupedJson, new TypeReference<Map<String, List<User>>>() {});

        System.out.println(users.get(0).name());
        System.out.println(usersByTeam.get("engineering").get(0).name());
    }
}
```

Both lines print `Maya`. The nested token carries the map's key type, its list value type, and that list's element type.

This requires `tools.jackson.core:jackson-databind` and its transitive dependencies. Use versions aligned through your framework or the Jackson BOM rather than mixing independently chosen Jackson components. Reuse an application-configured mapper when modules, naming, or other policies matter.

Jackson 2 uses `com.fasterxml.jackson.core.type.TypeReference` and `com.fasterxml.jackson.databind...` instead. Do not mix the two package families. The underlying idea is the same, but the token classes are not interchangeable with each other or with Spring's token.

## The Generic Helper Trap

It is tempting to hide token construction inside a generic method:

```java
static <T> ParameterizedTypeReference<List<T>> listType() {
    return new ParameterizedTypeReference<List<T>>() {};
}
```

This captures the declaration `List<T>`, **not** a particular `List<User>`. A result variable declared as `ParameterizedTypeReference<List<User>>` does not supply the missing runtime binding. The standalone demonstration above shows this with an explicit `<String>` call.

Instead, choose one of these approaches:

1. Pass a concrete token from the caller, as in `UsersClient.fetch`.
2. Pass an element `Class<T>` and construct a library-specific parameterized type explicitly, when that accurately describes your use case.
3. Use a library's type-resolution facilities with a concrete declaring context when resolving inherited type variables.

For example, Jackson's `mapper.getTypeFactory().constructCollectionType(List.class, User.class)` builds a `JavaType` describing `List<User>` without an anonymous subclass. Spring's `ResolvableType.forClassWithGenerics(List.class, User.class).getType()` can construct a reflective description, which `ParameterizedTypeReference.forType(...)` can wrap.

These builders require real type information as input. They do not recover an unknown erased type. Also, a builder returning `Type` or `JavaType` may not enforce correspondence with a generic result variable: keep your static declarations aligned with the runtime description rather than using an unchecked cast to claim a different type.

## What Tokens Do Not Do

- **They do not change JVM erasure.** An ordinary list does not acquire a runtime `User` element-type check because a token exists nearby.
- **They do not inspect arbitrary collections to discover their declared type.** Empty collections alone already make that approach impossible in general; inspecting current elements would not recover the declared generic contract either.
- **They do not validate or convert by themselves.** A decoder or other consumer must interpret the captured `Type`. A cast is not a deserializer.
- **They do not make abstract targets instantiable.** `List<User>` supplies type information, but a decoder still needs a way to construct `User` and any abstract payload types. See [Jackson 3 Mr Bean](jackson/jackson-3-mrbean.md) for a separate materialization mechanism.
- **They do not make wildcards concrete.** A token for `List<? extends Number>` captures that wildcard; it does not identify a specific numeric subtype to instantiate.
- **They do not make all inheritance paths simple.** Type variables across multiple superclass levels require resolution; the miniature `Token` implementation intentionally rejects indirect subclasses.
- **They do not replace safe deserialization policies.** Supply expected application-owned target types; do not treat arbitrary client-supplied class names as trusted instructions for instantiation.

Generic metadata can also come from a field or method declaration through `getGenericType()` or `getGenericReturnType()`. An anonymous token is convenient when you need to supply that metadata explicitly at a call site, not the only way reflection can obtain it.

## Which Representation Should I Use?

| Situation | Starting point |
| --- | --- |
| API expects a plain class | `User.class` |
| Spring client needs a nested generic response | `ParameterizedTypeReference<...>` |
| Jackson deserializes a fixed generic target | Jackson's `TypeReference<...>` |
| Generic structure is assembled at runtime | A library type builder, such as Jackson `JavaType` or Spring `ResolvableType` |
| Writing reflection infrastructure | `Type` and its subinterfaces, plus explicit resolution rules |

Use the representation the receiving API accepts. There is no single standard JDK `TypeToken<T>` class and no need to introduce a custom token abstraction when a library already provides the appropriate one.

## Bottom Line

A class token says **"User"**; a super type token can say **"List of User"**. The anonymous subclass preserves a concrete generic superclass declaration that reflection can read. Create the token where the full target type is known, pass it to the API that needs it, and do not confuse preserved declaration metadata with recovery of erased object types.

## References

- [Java SE 27: Class.getGenericSuperclass](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/lang/Class.html#getGenericSuperclass())
- [Java SE 27: ParameterizedType](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/lang/reflect/ParameterizedType.html)
- [Java SE 27: Type Erasure](https://docs.oracle.com/en/java/javase/27/docs/specs/jls/jls-4.html#jls-4.6)
- [Spring: ParameterizedTypeReference](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/core/ParameterizedTypeReference.html)
- [Spring: REST Clients](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html)
- [Spring: ResolvableType](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/core/ResolvableType.html)
- [Jackson 3.x: TypeReference Source and API Documentation](https://github.com/FasterXML/jackson-core/blob/3.x/src/main/java/tools/jackson/core/type/TypeReference.java)
- [Jackson 3.x: ObjectMapper Source and API Documentation](https://github.com/FasterXML/jackson-databind/blob/3.x/src/main/java/tools/jackson/databind/ObjectMapper.java)
- [Neal Gafter: Super Type Tokens](https://gafter.blogspot.com/2006/12/super-type-tokens.html), the original explanation linked by Spring and Jackson.

The Spring `current` and Jackson `3.x` links move over time. Match package names and APIs to the dependency versions used by your application; development-branch documentation is not a promise that every API exists in every released 3.x version.