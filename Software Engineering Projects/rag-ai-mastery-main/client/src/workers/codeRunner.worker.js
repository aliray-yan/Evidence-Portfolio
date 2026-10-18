function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function isDeepEqual(actual, expected) {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  if (actual && expected && typeof actual === "object" && typeof expected === "object") {
    return stableStringify(actual) === stableStringify(expected);
  }

  return actual === expected;
}

function assertResult(actual, assertion) {
  if (assertion.type === "equals") {
    return {
      passed: actual === assertion.expected,
      message: `Expected ${JSON.stringify(assertion.expected)}, received ${JSON.stringify(actual)}`
    };
  }

  if (assertion.type === "deepEqual") {
    return {
      passed: isDeepEqual(actual, assertion.expected),
      message: `Expected ${JSON.stringify(assertion.expected)}, received ${JSON.stringify(actual)}`
    };
  }

  if (assertion.type === "approx") {
    const tolerance = assertion.tolerance ?? 0.001;
    return {
      passed: Math.abs(Number(actual) - Number(assertion.expected)) <= tolerance,
      message: `Expected about ${assertion.expected}, received ${actual}`
    };
  }

  if (assertion.type === "includes") {
    return {
      passed: String(actual).toLowerCase().includes(String(assertion.expected).toLowerCase()),
      message: `Expected output to include ${JSON.stringify(assertion.expected)}`
    };
  }

  if (assertion.type === "includesAll") {
    const actualText = String(actual).toLowerCase();
    const missing = assertion.expected.filter((item) => !actualText.includes(String(item).toLowerCase()));
    return {
      passed: missing.length === 0,
      message: missing.length ? `Missing: ${missing.join(", ")}` : "All required text found"
    };
  }

  if (assertion.type === "objectIncludes") {
    const missing = Object.entries(assertion.expected).filter(([key, value]) => actual?.[key] !== value);
    return {
      passed: missing.length === 0,
      message: missing.length ? `Mismatched fields: ${missing.map(([key]) => key).join(", ")}` : "Object fields match"
    };
  }

  return { passed: false, message: `Unknown assertion type: ${assertion.type}` };
}

self.onmessage = (event) => {
  const { code, tests } = event.data;

  try {
    const functionNames = [...new Set(tests.map((test) => test.functionName))];
    const exportMap = functionNames.map((name) => `${JSON.stringify(name)}: typeof ${name} === "function" ? ${name} : undefined`);
    const factory = new Function(`"use strict";\n${code}\nreturn { ${exportMap.join(", ")} };`);
    const userExports = factory();

    const results = tests.map((test) => {
      const fn = userExports[test.functionName];
      if (typeof fn !== "function") {
        return {
          name: test.name,
          passed: false,
          message: `Function ${test.functionName} was not found.`
        };
      }

      try {
        const actual = fn(...test.args);
        const assertion = assertResult(actual, test.assert);
        return {
          name: test.name,
          passed: assertion.passed,
          message: assertion.passed ? "Passed" : assertion.message,
          actual
        };
      } catch (error) {
        return {
          name: test.name,
          passed: false,
          message: error.message
        };
      }
    });

    self.postMessage({ ok: true, results });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error.message,
      results: []
    });
  }
};
