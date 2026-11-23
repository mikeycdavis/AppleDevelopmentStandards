import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyPin, parseIngested, evaluateProfile, evaluateNamespace } from "../experimental/apple-profile.mjs";

const pin = JSON.parse(readFileSync(new URL("../profile/core-pin.json", import.meta.url), "utf8"));
// The pinned core checkout is required by the core-dependent tests. Absence fails loudly; it never skips.
const CORE_DIR = resolve(process.env.SWT_CORE_DIR ?? new URL("../../SoftwareTestingStandards", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const schemaPath = join(CORE_DIR, pin.schemaPath);
const needCore = () => assert.ok(verifyPin(pin, schemaPath).ok, "pinned SoftwareTestingStandards core checkout not found or schema hash differs; set SWT_CORE_DIR");
const { evaluate } = await import(pathToFileURL(join(CORE_DIR, "experimental/check-release-evidence.mjs")).href).catch(() => ({ evaluate: () => { throw new Error("core checker unavailable; set SWT_CORE_DIR"); } }));
const NOW = new Date("2026-11-23T00:00:00Z");
const FP = "a".repeat(64);
const good = () => ({
  artifact: { digest: "sha256:aa" }, source: { dirty: false }, tests: [{ id: "t1" }],
  testRuns: [{ testId: "t1", evidenceKind: "automated", artifactDigest: "sha256:aa", command: "xcodebuild test", exitCode: 0 }],
  signing: { status: "ingested" }, stage: "production",
  apple: { coreVersion: "0.1.0", codeSigning: { mode: "manual", certificateFingerprint: FP, certificateNotAfter: "2027-06-01", provisioningProfileNotAfter: "2027-06-01" },
    ingested: [{ tool: "codesign", exitCode: 0, output: "App.app: valid on disk\nApp.app: satisfies its Designated Requirement" }] },
});
const run = (r, now = NOW) => evaluateProfile(r, evaluate, now);

test("pin records core 0.1.0, source commit and schema hash", () => {
  assert.equal(pin.coreVersion, "0.1.0");
  assert.equal(pin.sourceCommit, "67f0783c1c1d88ae7f9ad7f3992f6d3fad965d0c");
  assert.equal(pin.schemaSha256LfNormalised, "a8be81341477d21507812a59563514e474b1fe89e2a9e0fef7c9cf224594130a");
});
test("criterion 1: the pinned schema matches; a missing file or a differing hash fails", () => {
  needCore();
  const dir = mkdtempSync(join(tmpdir(), "apl-pin-"));
  assert.equal(verifyPin(pin, join(dir, "absent.json")).ok, false);
  const p = join(dir, "s.json"); writeFileSync(p, readFileSync(schemaPath, "utf8") + " ");
  assert.match(verifyPin(pin, p).errors[0], /differs from the pin/);
  assert.equal(verifyPin({}, schemaPath).ok, false);
});
test("criterion 1: this repository holds no copy of the core schema", () => {
  const walk = (d) => readdirSync(d).flatMap((n) => { if (n === ".git" || n === "node_modules") return []; const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  assert.deepEqual(walk(resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))).filter((p) => /release-evidence\.core.*schema/.test(p)), []);
});
test("a valid record passes; the profile only adds fields", () => { needCore(); assert.equal(run(good()).verdict, "pass"); });
test("criterion 2: a profile field that redefines a core field is rejected", () => {
  needCore(); const r = good(); r.apple.stage = "internal";
  assert.equal(run(r).verdict, "reject");
  assert.ok(run(r).errors.some((e) => /redefines a core field/.test(e)));
});
test("criterion 4: absence is never a pass", () => {
  needCore();
  const a = good(); delete a.apple; assert.equal(run(a).verdict, "not-evaluated");
  const b = good(); delete b.apple.ingested; assert.equal(run(b).verdict, "not-evaluated");
  assert.equal(run(good(), null).verdict, "not-evaluated"); // no clock, expiry not evaluated
  const c = good(); delete c.apple.codeSigning; assert.equal(run(c).verdict, "not-evaluated");
});
test("criterion 4: failed ingested results reject; unrecognised output is not-evaluated", () => {
  needCore();
  const f = good(); f.apple.ingested = [{ tool: "codesign", exitCode: 1, output: "App.app: code object is not signed at all" }];
  assert.equal(run(f).verdict, "reject");
  const u = good(); u.apple.ingested = [{ tool: "codesign", exitCode: 0, output: "something else" }];
  assert.equal(run(u).verdict, "not-evaluated");
  const l = good(); l.apple.ingested = [{ tool: "codesign", exitCode: 0, output: "valid on disk", claimedStatus: "failed" }];
  assert.ok(run(l).errors.some((e) => /contradicts/.test(e)));
});
test("criterion 4: core signing.status failed rejects", () => { needCore(); const r = good(); r.signing.status = "failed"; assert.equal(run(r).verdict, "reject"); });
test("criterion 3: ingestion parsers", () => {
  assert.equal(parseIngested({ tool: "xcodebuild-archive", exitCode: 0, output: "** ARCHIVE SUCCEEDED **" }).status, "ok");
  assert.equal(parseIngested({ tool: "xcodebuild-archive", exitCode: 65, output: "** ARCHIVE FAILED **" }).status, "failed");
  assert.equal(parseIngested({ tool: "xcodebuild-archive", exitCode: 0, output: "" }).status, "not-evaluated");
  assert.equal(parseIngested({ tool: "notarytool", exitCode: 0, output: "  status: Accepted" }).status, "ok");
  assert.equal(parseIngested({ tool: "notarytool", exitCode: 0, output: "status: Invalid" }).status, "failed");
  assert.equal(parseIngested({ tool: "notarytool", exitCode: 0, output: "status: In Progress" }).status, "not-evaluated");
  assert.equal(parseIngested({ tool: "mystery", exitCode: 0, output: "ok" }).status, "not-evaluated");
  assert.equal(parseIngested({ tool: "codesign", exitCode: "0", output: "valid on disk" }).status, "not-evaluated");
  assert.equal(parseIngested(null).status, "not-evaluated");
});
test("criterion 6: expired certificates, bad fingerprints and unknown fields reject", () => {
  const e = (mut) => { const r = good(); mut(r.apple); return evaluateNamespace(r, NOW).errors; };
  assert.ok(e((a) => { a.codeSigning.certificateNotAfter = "2025-01-01"; }).some((x) => /expired/.test(x)));
  assert.ok(e((a) => { a.codeSigning.certificateFingerprint = "zz"; }).length > 0);
  assert.ok(e((a) => { a.extra = 1; }).some((x) => /unknown apple field/.test(x)));
  assert.ok(e((a) => { a.coreVersion = "0.2.0"; }).length > 0);
});
test("criterion 6: secret material in evidence is rejected without being echoed", () => {
  needCore();
  const r = good(); r.apple.ingested[0].output = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----";
  const v = run(r);
  assert.equal(v.verdict, "reject");
  assert.ok(!JSON.stringify(v).includes("MIIEvQ"));
});
test("a hostile record is not read by the profile: accessors are never invoked", () => {
  needCore(); let calls = 0; const r = good();
  Object.defineProperty(r.apple, "codeSigning", { enumerable: true, get() { calls++; return {}; } });
  assert.equal(run(r).verdict, "reject"); assert.equal(calls, 0);
});
