# AOP and Spring AOP: Timing and Retry Annotations

Aspect-oriented programming (AOP) separates **what an operation does** from **behavior shared by many operations**, such as logging, timing, security checks, transactions, and retries.

This explainer builds two method annotations: `@LogElapsedTime` and `@RetryOperation`. The examples use synchronous Java methods and Spring's proxy-based AOP. The setup below targets Spring Boot 3.x / Spring Framework 6.x; the custom aspects also illustrate the proxy model used in Spring Framework 7.x. A later section distinguishes Spring's production retry options.

For annotation declarations, retention, and metadata, see [Java Annotations](../java/annotations.md).

## 1. Why AOP Exists

Without AOP, a service method can accumulate responsibilities unrelated to its business logic:

```text
start timer
try operation
retry eligible failures
stop timer and log elapsed time
return result
```

Copying that wrapper into many services creates duplication and inconsistent policies. These shared responsibilities are called **cross-cutting concerns** because they cut across multiple classes or features.

With AOP, the service expresses its intent declaratively:

```java
@LogElapsedTime
@RetryOperation(maxAttempts = 3, delayMillis = 100,
        retryOn = SocketTimeoutException.class)
public String fetchRate() throws SocketTimeoutException {
    return provider.fetchRate();
}
```

The body still fetches a rate. Separate code implements timing and retry behavior.

**An annotation does not execute anything by itself.** Without a consumer, these annotations are just metadata. Here, that consumer is Spring's AOP infrastructure and the aspects we register with it.

### Vocabulary

| Term | Meaning | In this example |
| --- | --- | --- |
| Aspect | A module for a cross-cutting concern | `ElapsedTimeAspect` |
| Join point | A place where behavior can be applied | A method execution reached through a Spring proxy |
| Pointcut | A rule selecting join points | Methods annotated with `@LogElapsedTime` |
| Advice | Code run at a selected join point | Start a timer, invoke the method, log elapsed time |
| Target | The object providing the business behavior | `RateService` |
| Proxy | An object that intercepts calls before delegating | The Spring-managed wrapper around `RateService` |
| Weaving | Connecting aspects with the code they affect | In Spring AOP, connecting interceptors through runtime proxies |

AOP is the general concept. **Spring AOP is one implementation**, with a deliberately narrower scope than full AspectJ.

## 2. How Spring AOP Works

When a bean qualifies for advice, Spring normally gives its callers a proxy instead of a direct reference to the target:

```text
Caller
  -> Spring proxy
     -> timing advice
        -> retry advice
           -> target method
```

The proxy runs matching advice and delegates to the target. An around advice can call `proceed()` to continue the invocation chain, return a replacement result, throw an exception, or invoke the remaining chain multiple times.

Spring AOP supports method-execution join points on Spring-managed beans. It does not generally intercept field access, constructors, arbitrary local objects, or every method call in the JVM.

### Advice Types

| Annotation | When it runs |
| --- | --- |
| `@Before` | Before the matched execution |
| `@AfterReturning` | After normal completion |
| `@AfterThrowing` | After exceptional completion |
| `@After` | On exit, whether successful or exceptional |
| `@Around` | Around the remaining invocation chain, controlling whether and how it proceeds |

Use the least powerful advice that fits. Timing needs state spanning the call; retry needs repeated invocation. Both are good uses of `@Around`.

### Spring AOP Versus AspectJ

Spring AOP can use AspectJ's annotation syntax, including `@Aspect`, without using AspectJ bytecode weaving.

- **Spring AOP:** runtime proxies, Spring beans, method-execution interception through those proxies.
- **AspectJ weaving:** compile-time or load-time bytecode weaving, with broader join points and no dependency on a call crossing a Spring proxy.

Using `@Aspect` alone does not turn a Spring application into a woven AspectJ application.

## 3. Setup

In a Spring Boot **3.x** application using Boot dependency management, add:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

Boot auto-configures annotation-based AOP when the required classes are present, unless AOP auto-configuration is disabled. Put the aspects and service under the application's component-scan package. Each public type below belongs in its own file; the examples use the package `demo.aop`.

For a non-Boot Spring application with `spring-aop` and `aspectjweaver` on the classpath, enable proxy support explicitly:

```java
package demo.aop;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@EnableAspectJAutoProxy
@ComponentScan("demo.aop")
public class AopConfiguration {
}
```

Choose the Boot auto-configuration route or explicit configuration as appropriate; adding `@EnableAspectJAutoProxy` is not normally necessary for Boot.

## 4. Example: Log Elapsed Execution Time

### Declare the Annotation

```java
package demo.aop;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface LogElapsedTime {
}
```

`RUNTIME` makes the metadata available while the application runs. `METHOD` restricts its use to methods. This example deliberately does not implement class-level or composed-annotation matching.

### Implement the Aspect

```java
package demo.aop;

import java.util.concurrent.TimeUnit;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Order(1)
public class ElapsedTimeAspect {
    private static final Logger log =
            LoggerFactory.getLogger(ElapsedTimeAspect.class);

    @Around("@annotation(demo.aop.LogElapsedTime)")
    public Object logElapsedTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.nanoTime();
        try {
            return joinPoint.proceed();
        } finally {
            long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(
                    System.nanoTime() - startedAt);
            log.info("{} completed in {} ms",
                    joinPoint.getSignature().toShortString(), elapsedMillis);
        }
    }
}
```

Read this as:

1. Select executions annotated with `@LogElapsedTime`.
2. Record a monotonic start time using `System.nanoTime()`, not the wall clock.
3. Call `proceed()` and return its result unchanged.
4. Log elapsed time in `finally`, including when the invocation throws.

The advice does not swallow the target exception. Here, "completed" means the invocation ended, not necessarily that it succeeded. Millisecond conversion truncates fractional milliseconds; a fast call can log `0 ms`. The duration is elapsed time, not CPU time, and includes waiting inside the wrapped invocation.

Avoid logging method arguments or return values indiscriminately: they may contain credentials, personal data, or large payloads.

## 5. Example: A Retry Annotation

Retry means **invoking the operation again after an eligible failure**, not resuming a failed execution midway. The next invocation starts at the beginning of the method.

The custom annotation is named `@RetryOperation` to avoid confusing it with either Spring library's `@Retryable`. This small implementation teaches AOP mechanics; it is not a replacement for a production resilience library.

### Declare the Policy

```java
package demo.aop;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RetryOperation {
    int maxAttempts() default 3;
    long delayMillis() default 100;
    Class<? extends Exception>[] retryOn();
}
```

`maxAttempts = 3` means **one initial attempt plus at most two retries**. Requiring `retryOn` makes the failure policy explicit instead of retrying every exception by default.

### Implement the Aspect

```java
package demo.aop;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Order(2)
public class RetryOperationAspect {
    @Around(value = "@annotation(retry)", argNames = "retry")
    public Object retry(ProceedingJoinPoint joinPoint, RetryOperation retry)
            throws Throwable {
        if (retry.maxAttempts() < 1 || retry.delayMillis() < 0
                || retry.retryOn().length == 0) {
            throw new IllegalArgumentException("Invalid retry policy");
        }

        for (int attempt = 1; ; attempt++) {
            try {
                return joinPoint.proceed();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw interrupted;
            } catch (Exception failure) {
                if (Thread.currentThread().isInterrupted()
                        || attempt >= retry.maxAttempts()
                        || !isRetryable(failure, retry.retryOn())) {
                    throw failure;
                }
                if (retry.delayMillis() > 0) {
                    try {
                        Thread.sleep(retry.delayMillis());
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        throw interrupted;
                    }
                }
            }
        }
    }

    private boolean isRetryable(Exception failure,
            Class<? extends Exception>[] retryOn) {
        for (Class<? extends Exception> exceptionType : retryOn) {
            if (exceptionType.isInstance(failure)) {
                return true;
            }
        }
        return false;
    }
}
```

`@annotation(retry)` both selects annotated methods and binds their annotation to the `retry` parameter. Explicit `argNames` avoids depending on compiler-retained parameter names for that binding; the leading `ProceedingJoinPoint` parameter may be omitted from `argNames`.

The advice:

- Returns immediately on success, including a `null` result.
- Retries only configured exception types or their subclasses. This simple implementation does not search nested causes.
- Rethrows the last failure when attempts are exhausted, without wrapping it.
- Does not catch JVM `Error` types.
- Preserves interruption and stops retrying when cancellation is signaled through the interrupt flag.
- Sleeps only between attempts, never after the final failure.

`Thread.sleep` blocks the invoking thread, and the loop does not impose a timeout on an individual attempt. Production policies need bounded operation timeouts, an overall deadline, backoff and jitter, and observability. Async or reactive retries require a different implementation.

## 6. Use Both Annotations

Define the provider contract and register an implementation as a Spring bean:

```java
package demo.aop;

import java.net.SocketTimeoutException;

public interface RateProvider {
    String fetchRate() throws SocketTimeoutException;
}
```

The provider implementation is application-specific; it is not supplied here. The service uses constructor injection:

```java
package demo.aop;

import java.net.SocketTimeoutException;
import org.springframework.stereotype.Service;

@Service
public class RateService {
    private final RateProvider provider;

    public RateService(RateProvider provider) {
        this.provider = provider;
    }

    @LogElapsedTime
    @RetryOperation(maxAttempts = 3, delayMillis = 100,
            retryOn = SocketTimeoutException.class)
    public String fetchRate() throws SocketTimeoutException {
        return provider.fetchRate();
    }
}
```

Another bean must call the **injected `RateService`**, so the call crosses the proxy. The annotations are placed on the concrete public method rather than relying on annotation inheritance from interfaces.

### Ordering Changes What the Timer Measures

Lower `@Order` values have higher precedence: they enter first and exit last. With timing at `1` and retry at `2`, timing wraps the entire retry loop:

```text
timing starts
  attempt 1 -> timeout
  wait 100 ms
  attempt 2 -> timeout
  wait 100 ms
  attempt 3 -> success
timing logs once: all attempts + both waits + advice overhead
```

Reversing the orders makes retry wrap timing. Each attempt then produces its own timing log, and retry delays fall outside those measurements. The visual order of annotations on the service method does **not** establish advice order.

### Expected Checks

Verify these through an actual Spring proxy, not by constructing `new RateService(...)`:

| Provider behavior | Expected result |
| --- | --- |
| Succeeds immediately | One provider call, original result, one timing log |
| Throws `SocketTimeoutException` twice, then succeeds | Three calls, two waits, original result, one total timing log |
| Always throws `SocketTimeoutException` | Three calls, last exception propagated, one timing log |
| Throws `IllegalArgumentException` | One call, no retry, same failure propagated |
| Caller is interrupted while waiting between attempts | Stop retrying, propagate interruption, preserve interrupt status |

In tests, use a controllable fake provider and `delayMillis = 0` for ordinary retry-count checks. Test interruption separately with a nonzero delay. Assert invocation counts and outcomes rather than exact elapsed milliseconds, which are scheduler-dependent.

## 7. Proxy Boundaries and Other Pitfalls

### Self-Invocation Bypasses Advice

If `RateService` calls `this.fetchRate()` from another method, it calls the target directly. The annotated call does not cross the proxy, so timing and retry advice do not run for that internal call. Advice wrapping the outer call still runs if that call crossed the proxy.

Prefer moving the annotated operation to a separate bean and injecting it. Making the method public does not fix self-invocation. Likewise, `new RateService(provider)` is not a proxied Spring bean.

### Proxy Type Matters

- **JDK dynamic proxies** expose interface methods. Callers generally depend on the interface type.
- **Class-based proxies** subclass the target. Final classes cannot be subclassed, and final or private methods cannot be advised by overriding them. Static methods are not intercepted as instance calls through either proxy type.

Core Spring normally chooses JDK proxies when suitable interfaces exist, otherwise class-based proxies. Spring Boot defaults to class-based proxies. A public, non-final method on a non-final class is a straightforward choice for these examples.

### Async and Reactive Work Has a Different Lifetime

For a method returning `CompletableFuture`, `Mono`, or `Flux`, this custom timer measures only the synchronous call returning that value, not eventual completion. This retry aspect catches synchronous throws, not later asynchronous failures. Use completion hooks or reactive operators, or library support designed for that return type.

### Retry Is Not Automatically Safe

A timeout does not prove that the remote operation failed. It may have succeeded but lost its response. Retrying a payment or message publication can duplicate effects. Use idempotency keys, deduplication, or operations known to be safe to repeat.

Avoid retrying validation failures, authorization failures, or programming bugs. Avoid independent retry loops at multiple layers: three attempts at each of three layers can produce up to 27 downstream calls.

### Transactions Need Deliberate Ordering

Retrying inside a transaction already marked rollback-only may make every later attempt unusable. A common arrangement is retry outside a transactional operation so each attempt gets its own transaction. Configure that boundary and propagation intentionally, often using separate beans; neither annotation placement nor these aspects' order values alone guarantee fresh transactions.

## 8. Production Retry: Which `@Retryable`?

There are two distinct Spring APIs. Imports and attempt semantics matter.

| API | Enablement | Attempt setting |
| --- | --- | --- |
| Spring Retry library: `org.springframework.retry.annotation.Retryable` | `@EnableRetry` from the same package; add the Spring Retry dependency and required AOP support | `maxAttempts` includes the initial attempt |
| Spring Framework 7+: `org.springframework.resilience.annotation.Retryable` | `@EnableResilientMethods` from the same package | `maxRetries` counts retries after the initial attempt |

For example, with **Spring Framework 7+**, enable its resilience support on a configuration class:

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.resilience.annotation.EnableResilientMethods;

@Configuration
@EnableResilientMethods
public class ResilienceConfiguration {
}
```

Then annotate a Spring bean's public method with the Framework 7 annotation:

```java
@org.springframework.resilience.annotation.Retryable(
        includes = java.net.SocketTimeoutException.class,
        maxRetries = 2,
        delay = 100)
public String fetchRate() throws java.net.SocketTimeoutException {
    return provider.fetchRate();
}
```

This permits **three total attempts**, like `maxAttempts = 3` in our custom example. Framework 7's retry support also handles supported reactive return types; that does not make the custom aspect above reactive-aware.

Use a supported resilience API for production rather than growing the teaching loop into a framework. Do not stack the built-in retry annotation and `@RetryOperation` on the same operation. When combining built-in retry with timing or transactions, verify the library advisor's ordering rather than assuming it matches our custom `@Order(2)`.

## Mental Model

**Annotation = metadata. Pointcut = selection. Advice = behavior. Proxy = interception boundary.**

Timing normally proceeds once and observes the outcome. Retry can proceed several times and change how many times the business operation executes. The proxy boundary, advice order, and safety of repeating the operation are as important as the annotation itself.

## References

- [Spring AOP concepts](https://docs.spring.io/spring-framework/reference/core/aop/introduction-defn.html)
- [Declaring advice and binding annotation parameters](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html)
- [Spring proxying mechanisms and self-invocation](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)
- [Advice and transaction ordering](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/applying-more-than-just-tx-advice.html)
- [Spring Framework resilience support (7+)](https://docs.spring.io/spring-framework/reference/core/resilience.html)
- [Spring Retry](https://github.com/spring-projects/spring-retry)