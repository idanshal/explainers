# Constructor Injection in Spring Boot

Constructor injection is generally recommended in Spring Boot because it makes dependencies explicit and safer.

## Main Advantages

- **Dependencies are mandatory and clear.** The constructor shows exactly what the class needs to work.
- **Supports immutability.** Dependencies can be declared `final` and cannot be replaced after construction.
- **Fails fast.** Missing dependencies are detected when the application starts, rather than later when a method is called.
- **Easier unit testing.** Tests can instantiate the class directly without starting Spring or using reflection:

  ```java
  OrderService service = new OrderService(mockRepository);
  ```

- **Prevents partially initialized objects.** With field or setter injection, an object can exist temporarily with dependencies unset. Constructor injection guarantees a fully initialized instance.
- **Makes excessive dependencies visible.** A constructor with many parameters may indicate that the class has too many responsibilities. Field injection can hide this problem.
- **Fits modern Java practices.** Constructor injection works naturally with `final` fields, records, and immutable design.

## Example

```java
@Service
public class OrderService {
    private final OrderRepository repository;

    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }
}
```

With a single constructor, Spring automatically uses it, so `@Autowired` is usually unnecessary.

## Why Field Injection Is Discouraged

```java
@Service
public class OrderService {
    @Autowired
    private OrderRepository repository;
}
```

Field injection hides the dependency, prevents simple construction in tests, generally requires reflection, and allows the object to exist in an incomplete state.

## When Setter Injection Can Make Sense

Setter injection is reasonable for optional dependencies or dependencies that may legitimately be changed after construction. For normal required dependencies, constructor injection is the preferred choice.