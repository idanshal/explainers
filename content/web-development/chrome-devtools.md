---
level: intermediate
---

# Chrome DevTools: A Developer's Field Guide

Chrome DevTools is a set of inspection, debugging, and profiling tools built into Chrome. It helps you understand what the browser actually loaded and ran: the live DOM, computed styles, JavaScript execution, network requests, storage, and rendering work.

This guide covers the everyday workflows and the specialized tools that are easy to miss. Panel names and layouts can change between Chrome versions, so use the Command Menu to find a tool if it is not visible.

## Open DevTools

Right-click a page element and choose **Inspect** to open DevTools with that element selected. Common keyboard shortcuts are:

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Open DevTools | `Command+Option+I` | `Control+Shift+I` |
| Open Console | `Command+Option+J` | `Control+Shift+J` |
| Inspect an element | `Command+Option+C` | `Control+Shift+C` |
| Toggle device toolbar | `Command+Shift+M` | `Control+Shift+M` |
| Open DevTools Command Menu | `Command+Shift+P` | `Control+Shift+P` |

In the Command Menu, type what you want to do, such as `show network`, `disable cache`, or `screenshot`. It is also a quick way to find panels that are hidden from the top tab bar. Shortcuts can vary by operating system and Chrome version; check **Settings > Shortcuts** if one does not work.

DevTools can be docked to the side or bottom of the browser, or moved to a separate window. A separate window is useful when comparing the page and its diagnostics side by side.

## Choose a Tool by the Symptom

| What you need to investigate | Start here |
| --- | --- |
| Layout, styling, or a specific element | Elements |
| JavaScript output or an exception | Console, then Sources |
| A missing, slow, or incorrect API response | Network |
| Cookies, browser storage, or a service worker | Application |
| A slow interaction or animation | Performance |
| A page that slows down over time | Memory |
| A mobile layout or device preference | Device toolbar and Rendering |
| A repeatable user journey | Recorder |
| A quick quality audit | Lighthouse |

## Inspect and Experiment with the Page

### Elements: DOM and CSS

The **Elements** panel shows the live DOM, not just the HTML response from the server. JavaScript can create, remove, or change nodes after the browser parses the original HTML. Select a node to inspect its styles, computed values, box model, event listeners, and accessibility details.

Useful experiments include:

- Edit a text node or attribute to test content changes.
- Toggle CSS declarations or add a rule in **Styles** to test a layout fix.
- Inspect **Computed** styles to find the final value and which rule supplied it.
- Force states such as `:hover`, `:focus`, or `:active` when debugging CSS.
- Use the element picker to select something directly in the rendered page.

These edits change the current page in the browser; they do not normally modify your source files or the server. Use [Local Overrides](https://developer.chrome.com/docs/devtools/overrides/) or [Workspaces](https://developer.chrome.com/docs/devtools/workspaces/) when you need changes to survive reloads or be saved locally.

### Console: Messages and JavaScript

The **Console** displays messages from the page and lets you run JavaScript in the inspected page's context. It is useful for checking assumptions without changing application code:

```js
document.querySelectorAll('button').length
console.table(performance.getEntriesByType('resource'))
```

Filter by message level or text, expand an error to see its stack trace, and use the source link to jump to the relevant code. If a command refers to an element selected in Elements, the Console exposes it as `$0`; `$1` is the previously selected element. These are DevTools conveniences, not standard browser APIs.

The Console evaluates code with access to the page. Only paste commands you understand and trust. Treat copied logs, request headers, and storage values as potentially sensitive before sharing them.

### Sources: Debug JavaScript

Use the **Sources** panel to find loaded files and pause execution. A basic debugging loop is:

1. Reproduce the problem consistently.
2. Find a likely function or use an event-listener breakpoint to catch the relevant event.
3. Set a line breakpoint, then reproduce the action.
4. Inspect the call stack, scope, and watched expressions while execution is paused.
5. Step over, into, or out of calls to see how values change.

Conditional breakpoints pause only when an expression is true. Exception breakpoints pause when code throws, and DOM breakpoints pause when a selected node changes. These can be more targeted than adding many log statements.

When a project bundles or transforms code, source maps can map the running code back to the original files. If the mapping is missing or stale, check the build's source-map output and the source-map URL in the loaded file. Browser extensions can also add scripts and listeners; try a clean profile or Incognito window when their activity obscures your own.

The Console drawer can stay open alongside another panel. Press `Escape` while DevTools is focused to toggle it.

## Trace Requests and Responses

The **Network** panel records requests while it is open. Reload the page or repeat the interaction that triggers the request. Each row represents a resource; inspect its status, type, initiator, transferred size, timing, headers, payload, preview, and response.

For a failed API call:

1. Select the **Fetch/XHR** filter and reproduce the request.
2. Check the status code, request URL, method, and query parameters.
3. Inspect **Payload** and **Response** to compare what was sent with what came back.
4. Inspect request and response headers, then use **Initiator** and **Timing** to understand what triggered the request and where time was spent.
5. Check the Console for related CORS, JavaScript, or mixed-content errors.

Two options often explain confusing results:

- **Preserve log** keeps requests across navigations, which helps with redirects and page transitions.
- **Disable cache** bypasses the browser cache while DevTools is open. Turn it off when you want to test normal cached behavior.

Use throttling to approximate a slow network, and request blocking to see how the page behaves when a resource is unavailable. These are useful experiments, not exact reproductions of every user's connection or device. A copied request or HAR file can contain cookies, authorization headers, personal data, and internal URLs; sanitize it before sharing.

## Inspect Storage and Application State

The **Application** panel helps diagnose state that is not visible in the DOM:

- Inspect and edit cookies, local storage, session storage, and IndexedDB.
- Inspect Cache Storage and service worker registration and status.
- Check the web app manifest and, where relevant, installability information.
- Clear site data when you need to reproduce a first-visit state.

Clearing storage can sign you out, delete local app data, or reset a test setup. A service worker may serve cached content or intercept requests, so check its registration when the page behaves differently from the Network panel's apparent response. Prefer unregistering or clearing data only in a local or test context where that reset is intended.

## Test Viewports, Rendering, and Accessibility

### Device Toolbar

The **Device toolbar** lets you resize the viewport, choose device presets, change orientation, and simulate network or CPU throttling. Use responsive sizing to test the actual breakpoints in your CSS rather than checking only a few preset devices. The Sensors tool can emulate values such as geolocation and device orientation.

Device mode is an approximation: it does not run your code on a real phone or reproduce every hardware, browser, or input difference. Confirm important behavior on real devices when it matters.

### Rendering and Accessibility

The **Rendering** tools can emulate media preferences such as dark mode, reduced motion, forced colors, and print styles. They can also show overlays such as paint flashing and layout-shift regions, which help identify unnecessary rendering work.

In **Elements > Accessibility**, inspect the accessibility tree, computed accessibility properties, and ARIA attributes for a selected node. **Lighthouse** can identify some automated accessibility issues, such as missing labels or low contrast. Neither a tree inspection nor an automated audit replaces keyboard testing and testing with assistive technology.

## Measure Performance and Memory

### Performance

Use **Performance** when you need to understand runtime work: record while reproducing a slow interaction, then inspect the main-thread flame chart, rendering activity, screenshots, and long tasks. Start with a specific symptom and a short recording; an unfiltered trace can contain a lot of unrelated detail. CPU and network throttling can help expose problems hidden by a fast development machine.

For a quick audit across categories such as performance, accessibility, best practices, and SEO, use **Lighthouse**. For detailed diagnosis of a performance issue, use **Performance**. Audit scores vary with machine load, browser state, extensions, and network conditions, so compare runs under consistent conditions and do not treat a single score as a production guarantee.

### Memory

Use **Memory** when a page becomes slower over time, retains removed UI, or grows its memory use unexpectedly. Heap snapshots can show which objects remain reachable; allocation profiles can help locate code creating objects. Compare snapshots or profiles before and after repeating the suspected action, and inspect retaining references rather than assuming that a high one-time heap reading is a leak.

## Save Experiments and Repeat User Flows

DevTools offers several ways to keep experiments local, with different purposes:

- **Workspaces** map loaded files to a local project folder so supported edits in Sources can be saved to source files. Grant folder access only to a folder you intend to use.
- **Local Overrides** save modified responses or headers in a local overrides folder and serve them on reload. Overrides are useful for mocking API responses or testing headers without changing a server. They disable the cache while enabled and do not change production files.
- **Recorder** captures a browser user flow so you can replay it and, in supported workflows, measure its performance. Review and stabilize selectors before relying on a recording; a recording is a debugging aid, not a substitute for maintainable automated tests.
- **Snippets** save small JavaScript scripts that you can run in the context of the current page.

## Other Useful Tools

- **Coverage** identifies JavaScript and CSS that were unused during a recorded interaction. It does not prove that code is unnecessary for other routes or states.
- **Security** summarizes certificate, HTTPS, and mixed-content issues for the inspected page.
- **Animations** helps inspect and adjust CSS animations and transitions.
- **Command Menu** searches DevTools actions and is often faster than remembering which panel contains a feature.
- **Remote debugging** lets you inspect a page running on a connected Android device from desktop Chrome. It is the next step when desktop emulation is not enough.

## A Practical Debugging Sequence

When a feature fails, begin with a small, repeatable reproduction and keep DevTools open during it. Check the Console for exceptions, inspect the relevant request in Network, and examine the live DOM and computed styles in Elements. If the cause is still unclear, pause at the relevant JavaScript with Sources. Check Application for stale storage or service-worker behavior, and use Performance or Memory only when the symptom points to runtime cost or retained objects.

This sequence keeps observations tied to the same user action and helps separate a rendering issue from a JavaScript error, a failed request, or stale client state.

## Official References

- [Chrome DevTools overview](https://developer.chrome.com/docs/devtools/)
- [Elements and DOM](https://developer.chrome.com/docs/devtools/dom/)
- [Console](https://developer.chrome.com/docs/devtools/console/)
- [JavaScript debugging](https://developer.chrome.com/docs/devtools/javascript/)
- [Network panel](https://developer.chrome.com/docs/devtools/network/)
- [Application panel](https://developer.chrome.com/docs/devtools/application/)
- [Performance panel](https://developer.chrome.com/docs/devtools/performance/)
- [Memory problems](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Device mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Accessibility features](https://developer.chrome.com/docs/devtools/accessibility/reference/)