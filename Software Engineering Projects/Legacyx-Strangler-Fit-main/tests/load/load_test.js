// k6 run -e TARGET=direct -e VUS=100 -e DURATION=20s load_test.js
// TARGET: "direct" | "gateway" — which URL to hit
// See README.md in this folder for the full comparison methodology and
// why "legacy" and "modern" numbers are expected to be close in this
// specific sandboxed setup.

import http from "k6/http";
import { check, sleep } from "k6";

const TARGET_URL = __ENV.TARGET_URL || "http://localhost:7000/api/customers";
const VUS = parseInt(__ENV.VUS || "100", 10);
const DURATION = __ENV.DURATION || "20s";

export const options = {
  scenarios: {
    load: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // fail the run if >1% of requests error
  },
};

export default function () {
  const res = http.get(TARGET_URL);
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
  sleep(0.05);
}
