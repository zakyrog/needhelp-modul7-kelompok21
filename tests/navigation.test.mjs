import test from "node:test";
import assert from "node:assert/strict";

import { getSafeInternalPath } from "../src/lib/navigation.js";

test("menerima path internal beserta query dan hash", () => {
  assert.equal(
    getSafeInternalPath("/katalog?q=belajar#hasil"),
    "/katalog?q=belajar#hasil",
  );
});

test("menolak URL eksternal dan protokol berbahaya", () => {
  assert.equal(getSafeInternalPath("https://example.com", "/katalog"), "/katalog");
  assert.equal(getSafeInternalPath("//example.com", "/katalog"), "/katalog");
  assert.equal(getSafeInternalPath("javascript:alert(1)", "/katalog"), "/katalog");
  assert.equal(getSafeInternalPath("/\\example.com", "/katalog"), "/katalog");
});
