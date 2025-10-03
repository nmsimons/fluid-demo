# Quick Reference: Running Item Interaction Tests

## Installation

```bash
# Install Playwright browsers (if not already installed)
npm run pretest
```

## Basic Commands

### Run all tests

```bash
npm test
```

### Run only interaction tests

```bash
npx playwright test ItemInteractions.test.ts
```

### Run specific test suite

```bash
# Drag tests only
npx playwright test ItemInteractions.test.ts -g "Drag Operations"

# Focus tests only
npx playwright test ItemInteractions.test.ts -g "Focus and Text"

# Rotation tests only
npx playwright test ItemInteractions.test.ts -g "Rotation Operations"

# Resize tests only
npx playwright test ItemInteractions.test.ts -g "Resize Operations"
```

### Run a single test

```bash
npx playwright test ItemInteractions.test.ts -g "should focus textarea when clicking"
```

## Interactive Modes

### UI Mode (best for development)

```bash
npx playwright test ItemInteractions.test.ts --ui
```

- Watch tests run in real-time
- Pause and step through tests
- Inspect DOM and console

### Headed Mode (watch in browser)

```bash
npx playwright test ItemInteractions.test.ts --headed
```

### Debug Mode (step-by-step)

```bash
npx playwright test ItemInteractions.test.ts --debug
```

## Debugging Failed Tests

### Generate trace for debugging

```bash
npx playwright test ItemInteractions.test.ts --trace on
```

### View trace file

```bash
npx playwright show-trace test-results/.../trace.zip
```

### View test report

```bash
npx playwright show-report
```

## Common Options

### Run tests in specific browser

```bash
npx playwright test ItemInteractions.test.ts --project=chromium
npx playwright test ItemInteractions.test.ts --project=firefox
npx playwright test ItemInteractions.test.ts --project=webkit
```

### Run tests serially (one at a time)

```bash
npx playwright test ItemInteractions.test.ts --workers=1
```

### Run with verbose output

```bash
npx playwright test ItemInteractions.test.ts --reporter=list
```

### Update snapshots (if using visual comparison)

```bash
npx playwright test ItemInteractions.test.ts --update-snapshots
```

## Test Coverage Summary

✅ **20+ tests covering:**

- Drag operations (shapes and notes)
- Rotation with handles
- Resize operations (shapes and text)
- Textarea focus and editing
- Click vs drag detection
- Multi-item interactions
- Edge cases and error handling
- Performance with multiple items

## Expected Results

All tests should pass when:

- Development server is running (`npm run dev`)
- Fluid container loads successfully
- All interaction fixes are applied:
    - Global drag cleanup mechanism
    - Lazy listener initialization
    - ContainerElement storage in drag state
    - Grid view handle restrictions

## Troubleshooting

### Tests timing out

Increase timeout in test or use `--timeout` option:

```bash
npx playwright test ItemInteractions.test.ts --timeout=60000
```

### Selectors not found

The app might not be fully loaded. Tests already include waits, but you can:

1. Check dev server is running
2. Verify canvas loads in browser manually
3. Run tests in headed mode to observe

### Position assertions failing

Coordinate system changes or zoom levels might affect assertions. Review tolerance values in tests.

### Focus tests failing

Verify the containerElement fix is applied in ItemView.tsx (storing `e.currentTarget` in drag state).

## CI/CD Integration

For continuous integration:

```bash
npm run ci:test
```

This runs tests headlessly with appropriate timeouts and retries for CI environments.
