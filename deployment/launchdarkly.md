# LaunchDarkly: Practical Feature Flags and Safe Releases

Documentation checked: 2026-11-11

LaunchDarkly is a feature management platform. Your application asks for a flag's value for a particular user, account, or other context, then chooses behavior based on the result. Teams can change targeting and release behavior without deploying new application code for every change.

This guide explains the model, shows a Java/Spring integration, and covers effective rollouts, testing, failure behavior, and operational pitfalls. Examples use the **Java server-side SDK 7.x** and contexts, not the older `LDUser` API. SDK capabilities, UI labels, regional endpoints, and plan entitlements can change.

## 1. What Problem Does It Solve?

Without flags, deploying new code often releases its behavior to everybody immediately. A flag separates those decisions:

```text
Deploy: put both old and new implementations in production
Release: choose who receives the new implementation
Observe: compare errors, latency, and business outcomes
Expand or disable: change targeting without another code deployment
```

For example, deploy a new pricing engine behind `pricing-v2-enabled`. Enable it for internal accounts, then a few customers, then a growing percentage of accounts. Keep the old implementation available while rollback remains necessary.

LaunchDarkly changes a **decision in code that already exists**. It does not deploy your application, generate the new implementation, or undo work already performed. If the running binary does not evaluate the flag, changing it has no effect.

| Use case | What a flag provides |
| --- | --- |
| Gradual release | Expose new behavior to a controlled audience |
| Operational switch | Disable an optional expensive or unhealthy path |
| Beta access | Target selected accounts or a reusable segment |
| Experiment | Assign variations as part of a defined measurement design |
| Runtime configuration | Choose a supported string, number, boolean, or JSON configuration |

A plain configuration file may be sufficient for a setting changed only at startup. LaunchDarkly becomes useful when you need dynamic targeting, coordinated release controls, and visibility into flag changes. Balance that value against service cost, operational dependency, and code complexity.

**A feature flag is not an authorization system.** A hidden button does not protect an API, and a release decision does not prove that the caller may access another tenant's data.

## 2. Learn the Vocabulary

| Term | Meaning |
| --- | --- |
| Project | A grouping of flags, environments, and related configuration |
| Environment | An isolated set of flag targeting settings, such as test or production |
| Flag key | The identifier used by code, such as `pricing-v2-enabled` |
| Variation | A value the flag can serve, such as `true`, `false`, or a configuration object |
| Context | The user, organization, device, or other entity being evaluated |
| Context kind | The type of entity, such as `user` or `organization` |
| Context key | A stable identifier within that kind |
| Attribute | Context data used for matching, such as `plan` or `region` |
| Segment | A reusable group of contexts selected by membership or rules |
| Targeting rule | A condition selecting a variation or rollout |
| SDK | The application library that retrieves flag data and evaluates or looks up values |

Flags normally have environment-specific targeting, even when their keys and variations belong to the same project. Do not infer the environment from a flag key. The SDK credential selects the environment the client connects to.

Give flags descriptive keys, an owner, a purpose, and a removal or review date. Distinguish temporary release flags from intentionally long-lived operational controls.

## 3. Where Evaluation Happens

For a typical Java backend using the default server-side setup:

```text
LaunchDarkly configuration
  -> background SDK connection -> local flag rules and segment data

Application request + context
  -> SDK evaluates locally -> variation -> application chooses code path

SDK analytics events
  -> asynchronous delivery back to LaunchDarkly
```

Ordinary flag evaluation is **not a synchronous HTTP request to LaunchDarkly for every business request**. The SDK maintains local configuration and normally receives updates through a background streaming connection. Specialized stores and integrations can add dependencies; understand your actual configuration.

Updates are not an atomic global transaction. Two service instances can temporarily evaluate different configuration versions. Do not assume changing a flag instantly changes all in-flight operations, browser sessions, or offline devices.

### Pick the Correct SDK and Credential

| Application | Credential and model |
| --- | --- |
| Trusted backend | Server SDK key; receives rules and evaluates for many contexts |
| Browser | Client-side ID; receives results for its context, not the entire private ruleset |
| Mobile | Mobile credential and SDK; platform-specific lifecycle and caching |
| Edge | Matching edge SDK and integration; do not assume normal server-SDK behavior |

Keep **server SDK keys secret**. Never embed one in browser JavaScript, a mobile bundle, a public repository, or frontend build variables. Client-side IDs are intentionally public, but that does not make exposed flags or client-supplied attributes trustworthy.

An SDK key is also not a management API token. Automating flag edits requires separately scoped administrative/API credentials and appropriate change controls.

## 4. Understand Which Value You Receive

Three similarly named settings have different purposes:

| Value | When it is used |
| --- | --- |
| Off variation | Normal result when flag targeting is turned off |
| Default rule / fallthrough | Targeting is on, but no earlier target or rule matches |
| SDK fallback argument | The SDK cannot provide a valid evaluation, such as a missing flag or unavailable initial data |

For this example, deliberately configure **all three as `false` initially**. They are separate settings, not automatically synchronized.

For ordinary server-side evaluation, the simplified decision order is:

1. Validate the evaluation and available flag data; return fallback on an evaluation error.
2. If targeting is off, return the configured off variation.
3. Check prerequisites; an unmet prerequisite normally selects the dependent flag's off variation.
4. Check individual targets.
5. Evaluate targeting rules in order; the first matching rule wins.
6. Use the default rule, which may itself contain a percentage rollout.

Rules depend on the context passed **at this evaluation**. Seeing an account in LaunchDarkly's context list does not mean the Java SDK will retrieve its attributes from that list. Supply the attributes your rules need from trusted application data.

Wrong context kinds, missing attributes, unexpected attribute types, rule order, and prerequisite flags are common reasons for surprising results. Use evaluation details to distinguish a legitimate `false` from an error returning the fallback.

## 5. Walkthrough: Gate a New Pricing Path in Java

This is an application integration example, not a LaunchDarkly project already created by this repository.

### Configure the Flag First

In a non-production LaunchDarkly environment:

1. Create a boolean flag with the exact key `pricing-v2-enabled`.
2. Set its off variation to `false` and its default rule to `false`.
3. Add an individual target of kind `organization`, key `account-demo`, serving `true`.
4. Turn targeting on in that environment and save/apply the change.
5. Retrieve that environment's **server-side SDK key** through the approved secret-management process.

The target only takes effect when targeting is on and prerequisites, if any, are satisfied. Use a test environment and non-sensitive demo identifiers before production.

### Add the Dependency

Add this to the application's Maven dependencies:

```xml
<dependency>
    <groupId>com.launchdarkly</groupId>
    <artifactId>launchdarkly-java-server-sdk</artifactId>
    <version>7.17.5</version>
</dependency>
```

This pins the version shown in the Java reference checked above; it is not a promise that this remains the latest release. Check supported versions, dependency compatibility, and release notes before adopting it.

### Evaluate with an Explicit Context and Fallback

The following complete class can run in a Java application with that dependency. Supply `LAUNCHDARKLY_SDK_KEY` through your IDE, deployment secret store, or another approved mechanism; do not put a real key in source or shell history.

```java
import com.launchdarkly.sdk.EvaluationDetail;
import com.launchdarkly.sdk.LDContext;
import com.launchdarkly.sdk.server.LDClient;
import com.launchdarkly.sdk.server.LDConfig;
import java.time.Duration;

public class LaunchDarklyDemo {
    public static void main(String[] args) throws Exception {
        String sdkKey = System.getenv("LAUNCHDARKLY_SDK_KEY");
        if (sdkKey == null || sdkKey.trim().isEmpty()) {
            throw new IllegalStateException("LAUNCHDARKLY_SDK_KEY is required");
        }

        LDConfig config = new LDConfig.Builder()
                .startWait(Duration.ofSeconds(5))
                .build();

        try (LDClient client = new LDClient(sdkKey, config)) {
            if (!client.isInitialized()) {
                System.err.println("Flag data unavailable at startup; using fallbacks");
            }

            LDContext account = LDContext.builder("account-demo")
                    .kind("organization")
                    .set("plan", "pro")
                    .build();

            EvaluationDetail<Boolean> decision = client.boolVariationDetail(
                    "pricing-v2-enabled", account, false);

            String pricingPath = decision.getValue() ? "pricing-v2" : "pricing-v1";
            System.out.println("Selected path: " + pricingPath);
            System.out.println("Evaluation reason: " + decision.getReason());
        }
    }
}
```

This prints which implementation the application would select; it does not calculate prices or implement the two pricing engines. The `plan` value illustrates a context attribute; the individual target above matches the context kind and key, not that attribute.

The constructor waits up to the configured initialization interval. If initial data is unavailable, the example logs a warning and uses the safe fallback while the SDK continues trying in the background. Because this is a short-lived demo, it evaluates only once; a long-running service can later receive live configuration.

Try the following against the test environment:

| Change | Expected observation after the SDK receives it |
| --- | --- |
| Targeting on, `account-demo` targeted to `true` | `pricing-v2`, typically `TARGET_MATCH` |
| Change the evaluated account key to an untargeted key | `pricing-v1`, typically `FALLTHROUGH` |
| Turn targeting off | `pricing-v1`, with `OFF` |
| Evaluate a nonexistent flag key | Fallback `false`, with an `ERROR` reason |

Do not treat every returned `false` as an outage or every successful initialization as proof that targeting is correct.

### In Spring: Share One Client and Close It on Shutdown

Do not create a client per HTTP request. Each maintains background resources and local state. Share one client per required project/environment credential in an application process.

In a Spring application, a configuration class can expose it as a singleton bean:

```java
import com.launchdarkly.sdk.server.LDClient;
import com.launchdarkly.sdk.server.LDConfig;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LaunchDarklyConfiguration {
    @Bean(destroyMethod = "close")
    public LDClient launchDarklyClient(
            @Value("${launchdarkly.sdk-key}") String sdkKey) {
        if (sdkKey.trim().isEmpty()) {
            throw new IllegalArgumentException("LaunchDarkly SDK key is required");
        }
        LDConfig config = new LDConfig.Builder()
                .startWait(Duration.ofSeconds(5))
                .build();
        return new LDClient(sdkKey, config);
    }
}
```

Bind `launchdarkly.sdk-key` to a secret supplied externally, for example through Spring's external configuration. Do not commit the value. Inject the client into a small application-owned policy/service using [constructor injection](../spring-boot/constructor-injection.md).

The bean above permits fallback operation after the startup wait; it does not implement a readiness policy. Decide whether this is acceptable for your application and expose degraded SDK status through appropriate monitoring. Avoid restart loops that make a LaunchDarkly outage take down an otherwise functional application.

Evaluate at the business-operation boundary and reuse the decision within that operation. Do not evaluate once for every line item if a mid-request flag update could create an inconsistent order. For a durable multi-step process that needs a stable choice across retries or restarts, persist the chosen strategy with the business operation.

## 6. Design Context Identity Before Percentage Rollouts

For a tenant-level pricing change, an `organization` context with a stable account ID is usually more appropriate than a random request ID. That keeps the release unit aligned with the customer account.

| Identity choice | Consequence |
| --- | --- |
| Stable user ID | Appropriate when each user can independently receive a variation |
| Stable organization ID | Appropriate when an entire account should receive a consistent variation |
| New random ID for every request | Unstable cohorts, noisy analytics, and inflated context cardinality |
| One shared ID for all visitors | Everybody is treated as the same entity |
| Email address as the key | Unnecessary PII exposure and identity changes when email changes |

Use a multi-context when a decision needs both user and organization attributes. The rule and rollout must reference the intended kind. Authenticate the user and resolve their account membership server-side; never trust a request field claiming `plan=enterprise` or another account's ID.

### A Percentage Is a Cohort, Not a Per-Request Coin Flip

A standard percentage rollout deterministically buckets the configured context kind and attribute, commonly its key. With unchanged inputs and configuration, repeated evaluations select the same variation. Increasing a simple rollout expands the selected bucket range; changing identity, bucketing configuration, or variation allocation can change assignments.

Ten percent of accounts does not mean ten percent of requests, revenue, or computing load. A single account may generate most of your traffic. Small populations also do not divide into exact percentages.

Different flags bucket independently. Two flags set to 10% do not necessarily select the same people. Use a shared segment when you intentionally need the same cohort, and check other targeting differences.

Ensure every evaluated context contains the rollout's configured kind. A kind mismatch can serve the first nonzero-weight rollout variation rather than the fallback you expected; it is not a safe exclusion strategy.

## 7. Release Safely and Measure the Right Things

An effective rollout is more than increasing a percentage:

1. Deploy backward-compatible code with the new path disabled and the old path tested.
2. Verify both paths and SDK fallback behavior in automated tests.
3. Enable internal accounts, then selected beta accounts with known workloads.
4. Expand in measured stages, for example 1%, 5%, 25%, then 100% of the intended account cohort.
5. At each stage, inspect errors, latency, resource saturation, correctness, and business metrics by variation.
6. Stop or disable when predefined guardrails are breached; verify that disabling actually takes effect.
7. After an agreed observation window, remove temporary flags and the obsolete implementation.

Define the observation window and rollback thresholds before the release. A quiet five minutes at low traffic is not evidence that a complex feature is safe.

LaunchDarkly also offers progressive, guarded, and experimentation capabilities, depending on product configuration and entitlement. A manual percentage rollout is not automatically an experiment, and an automated rollout is not automatically configured to detect every failure you care about.

For an experiment, define the hypothesis, randomization unit, eligibility, exposure, conversion metrics, and analysis window. Evaluation is not necessarily user exposure: evaluating a flag in unused code can produce misleading measurement. Follow the experimentation SDK/event guidance instead of treating raw variation counts as causal evidence.

### A Kill Switch Has Limits

A flag can stop **future code-path selection once updated data arrives**. It cannot reverse a payment, cancel arbitrary in-flight work, repair corrupted data, or compensate for a disconnected instance still using old rules.

Use backward-compatible database migrations and API contracts. If the new path writes data the old path cannot read, toggling back may be unsafe. For high-risk operations, combine flags with transactional safeguards, idempotency, deployment rollback, and explicit recovery procedures.

## 8. Know What Happens During an Outage

| Situation | Typical Java server-SDK behavior |
| --- | --- |
| Cannot initialize and has no usable flag data | Returns the code-provided fallback for evaluations |
| Connection drops after successful initialization | Continues evaluating with last-known rules while reconnecting |
| Process restarts with only the default in-memory store | Previous process memory is gone; initialization/fallback policy matters again |
| Flag missing, wrong evaluation type, or invalid context | Evaluation error; fallback returned |
| Analytics event delivery fails | Flag evaluation can still work; measurement may be delayed or incomplete |

An outage after initialization does **not** necessarily switch every flag to its SDK fallback. Cached rules can remain active, including an enabled feature you are trying to disable remotely.

Choose a safe fallback per flag. `false` is appropriate for this optional pricing path, not a universal safety policy. A flag named `disable-writes` may need a different default from `enable-recommendations`. Name flags so operators can predict what the values mean.

Monitor initialization, data-source connection status, reconnect errors, configuration freshness where available, and evaluation errors. `isInitialized()` alone is not a continuous connection-health check. Consider persistent stores or Relay Proxy only for specific resilience/topology requirements; they add infrastructure and do not make disconnected updates instantaneous.

## 9. Test Without a Live LaunchDarkly Account

Do not make unit tests depend on an operator changing a shared remote flag. Use deterministic data or an application-owned flag interface, and keep a smaller set of real-environment integration checks.

The following complete Java class uses the SDK's in-memory `TestData` source. It needs the same SDK dependency but **no real SDK key and no flag-service connection**. Events are disabled for the test client.

```java
import com.launchdarkly.sdk.LDContext;
import com.launchdarkly.sdk.server.Components;
import com.launchdarkly.sdk.server.LDClient;
import com.launchdarkly.sdk.server.LDConfig;
import com.launchdarkly.sdk.server.integrations.TestData;

public class LaunchDarklyLocalCheck {
    public static void main(String[] args) throws Exception {
        TestData data = TestData.dataSource();
        data.update(data.flag("pricing-v2-enabled").variationForAll(false));

        LDConfig config = new LDConfig.Builder()
                .dataSource(data)
                .events(Components.noEvents())
                .build();

        LDContext account = LDContext.builder("account-demo")
                .kind("organization")
                .build();

        try (LDClient client = new LDClient("test-sdk-key", config)) {
            if (client.boolVariation("pricing-v2-enabled", account, true)) {
                throw new AssertionError("Expected configured false, not fallback true");
            }

            data.update(data.flag("pricing-v2-enabled").variationForAll(true));
            if (!client.boolVariation("pricing-v2-enabled", account, false)) {
                throw new AssertionError("Expected updated true");
            }

            if (client.boolVariation("missing-flag", account, false)) {
                throw new AssertionError("Expected missing-flag fallback false");
            }

            System.out.println("PASS: false, live update to true, and missing-flag fallback");
        }
    }
}
```

Notice that the first assertion deliberately uses fallback `true` while the test configuration serves `false`. This proves that a returned `false` came from the configured flag rather than accidentally passing because of the fallback.

`TestData` updates simulate received configuration changes, not internet propagation delays. This helper does not support every real targeting feature, including percentage rollouts. Test real rollout configuration separately; do not invent a local random implementation and claim it verifies LaunchDarkly's bucketing.

Also test both business implementations, missing/wrong-type flags, invalid or incomplete contexts, account isolation, and safe behavior after a partial rollout. For CI integration practices, see [GitHub Actions](../workflows/github-actions.md).

## 10. Privacy, Access, and Change Governance

Local evaluation does not mean no data leaves your service. SDKs can send evaluation analytics and context information asynchronously. Send only attributes needed for targeting and measurement, use opaque context keys, and review retention, region, consent, and organizational privacy requirements.

Server-side private attributes can participate in local matching without being included in outgoing context events. Client-side private-attribute behavior differs because remote evaluation still needs relevant inputs. The context key itself cannot be marked private. Anonymous contexts are not a blanket privacy exemption.

Restrict production flag edits with appropriate roles and approval policies. Review audit/change history during incidents. Some controls are plan-dependent; verify the actual configuration rather than assuming every change requires approval.

Keep test, preview, and production SDK keys isolated. Rotate exposed credentials and review management API tokens separately. Never store secrets in flag variation values: rules and values are distributed to SDKs, and client-exposed values can be inspected.

If flags are managed through Terraform or other automation, define the source of truth and emergency-change procedure. Otherwise, a later automation run can unintentionally overwrite an incident-time console change.

## 11. Troubleshooting and Flag Lifecycle

| Symptom | First things to check |
| --- | --- |
| Always receives fallback | Correct environment credential, initialization, flag key, value type, context validity |
| Targeted account does not receive the feature | Targeting on, prerequisites, context kind/key, actual supplied attributes |
| Console change does not affect the service | Correct project/environment, saved change, data-source connection, app-level caching |
| Two services disagree | Different keys/environments, context attributes, SDK versions, propagation timing |
| Ten percent looks inaccurate | Accounts versus traffic, sample size, stable identity, earlier rules/targets |
| UI shows feature but API rejects it | Frontend/backend decisions, authentication, authorization, entitlement policy |
| Context/event volume is unexpectedly high | Per-request random keys, high-cardinality kinds, excessive evaluations |
| Disabling did not resolve the incident | Cached configuration, in-flight work, irreversible side effects, unsafe old path |

Use `boolVariationDetail` during targeted diagnosis to inspect evaluation reasons. Avoid logging every context or full attribute payload on every request; that creates cost and privacy risks. Separate application failures from SDK connection problems and from targeting that is working exactly as configured.

### Remove Temporary Flags Deliberately

Every flag adds possible states and another decision an incident responder must understand. Two independent boolean flags permit four combinations; ten permit up to 1,024. Not all combinations deserve equal testing, but accidental interactions are real.

Once a release flag has completed its observation window:

1. Confirm the chosen behavior is correct in every relevant environment and application version.
2. Remove flag evaluation and obsolete code; deploy the simplified implementation.
3. Check for remaining callers, including older mobile clients and long-lived services.
4. Archive or delete the flag according to your lifecycle policy only when it is safe.

Deleting a flag while old code still evaluates it can activate that code's fallback and unexpectedly revert behavior. Long-lived operational flags need owners, documentation, tests, and periodic exercises rather than automatic deletion.

### Understand Cost Before Scaling

Review current pricing and your contract's usage dimensions, including contexts, SDK connections, experimentation, observability, and other enabled products where applicable. Do not assume that local server-side evaluation makes every form of usage free.

Stable identities and sensible evaluation boundaries help both correctness and usage control. Measure actual volume rather than optimizing by caching a decision forever and accidentally preventing release updates.

## Practical Checklist

- Separate deployment from release, and retain a safe recovery path.
- Choose stable context identities at the intended rollout unit.
- Know the difference between off variation, default rule, and SDK fallback.
- Share the SDK client, close it on shutdown, and monitor more than startup success.
- Keep server credentials secret and enforce authorization independently.
- Test both branches and failure cases without depending on live shared flags.
- Roll out with explicit guardrails and verify that disabling works.
- Assign ownership and remove temporary flags before they become permanent complexity.

## References

- [LaunchDarkly getting started](https://launchdarkly.com/docs/home/getting-started)
- [Java server SDK reference](https://launchdarkly.com/docs/sdk/server-side/java) and [current Java source](https://github.com/launchdarkly/java-core/tree/main/lib/sdk/server)
- [Choosing an SDK and credential type](https://launchdarkly.com/docs/sdk/concepts/client-side-server-side)
- [Server-side evaluation rules](https://launchdarkly.com/docs/sdk/concepts/flag-evaluation-rules)
- [Evaluation details and reasons](https://launchdarkly.com/docs/sdk/features/evaluation-reasons)
- [Contexts](https://launchdarkly.com/docs/home/flags/contexts) and [context configuration](https://launchdarkly.com/docs/sdk/features/context-config)
- [Percentage rollouts](https://launchdarkly.com/docs/home/releases/percentage-rollouts) and [release options](https://launchdarkly.com/docs/home/releases/releasing)
- [Test data sources](https://launchdarkly.com/docs/sdk/features/test-data-sources#java) and [Java TestData API](https://launchdarkly.github.io/java-core/lib/sdk/server/com/launchdarkly/sdk/server/integrations/TestData.html)
- [Private attributes](https://launchdarkly.com/docs/sdk/features/private-attributes) and [SDK monitoring](https://launchdarkly.com/docs/sdk/features/monitoring)
- [Shutting down SDKs](https://launchdarkly.com/docs/sdk/features/shutdown)
- [LaunchDarkly pricing](https://launchdarkly.com/pricing/)

Review current documentation and your organization's security requirements before deploying the integration or changing production targeting.