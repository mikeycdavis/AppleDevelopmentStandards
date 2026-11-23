// DRAFT Apple release-evidence profile (APL-B07). The profile schema is NOT frozen; field names here are draft.
// It pins SoftwareTestingStandards core 0.1.0 (profile/core-pin.json), copies no core schema, and never executes a tool
// or touches an account or key: it reads supplied output only. Per the frozen criteria, for v1 criteria 3 and 5 are
// validated by fixture evidence only; real tool-output validation is outstanding and tracked separately.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const NS = "apple";
const HEX64 = /^[0-9A-Fa-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Criterion 1: the pinned core schema must exist and match the pinned sha256 (LF-normalised). Never absent-is-ok.
export function verifyPin(pin, schemaPath) {
  const errors = [];
  if (!isObj(pin) || typeof pin.schemaSha256LfNormalised !== "string") return { ok: false, errors: ["pin file is malformed"] };
  let text;
  try { text = readFileSync(schemaPath, "utf8"); } catch { return { ok: false, errors: ["pinned core schema file is missing: " + schemaPath] }; }
  const sha = createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
  if (sha !== pin.schemaSha256LfNormalised) errors.push("core schema hash differs from the pin: " + sha);
  return { ok: errors.length === 0, errors };
}

// Criterion 3: parsers read supplied output {tool, exitCode, output}. Unrecognised output is not-evaluated, never ok.
export function parseIngested(e) {
  if (!isObj(e) || typeof e.output !== "string" || !Number.isInteger(e.exitCode)) return { status: "not-evaluated", why: "ingested entry needs tool, integer exitCode and string output" };
  const out = e.output;
  if (e.tool === "codesign") {
    if (e.exitCode !== 0 || /not signed at all|invalid signature|a sealed resource is missing or invalid|code object is not signed/i.test(out)) return { status: "failed" };
    return /valid on disk|satisfies its Designated Requirement/i.test(out) ? { status: "ok" } : { status: "not-evaluated", why: "codesign output not recognised" };
  }
  if (e.tool === "xcodebuild-archive") {
    if (/\*\* ARCHIVE FAILED \*\*/.test(out) || e.exitCode !== 0) return { status: "failed" };
    return /\*\* ARCHIVE SUCCEEDED \*\*/.test(out) ? { status: "ok" } : { status: "not-evaluated", why: "xcodebuild output not recognised" };
  }
  if (e.tool === "notarytool") {
    const m = /status:\s*(\w[\w ]*)/i.exec(out);
    const s = m && m[1].trim().toLowerCase();
    if (s === "accepted" && e.exitCode === 0) return { status: "ok" };
    if (s === "invalid" || s === "rejected" || e.exitCode !== 0) return { status: "failed" };
    return { status: "not-evaluated", why: "notarization status is not final or not recognised" };
  }
  return { status: "not-evaluated", why: "unknown tool " + String(e.tool) };
}

const SIGNING = { mode: ["automatic", "manual"] };
const KEYS = { [NS]: ["coreVersion", "codeSigning", "storeDistribution", "ingested"], codeSigning: ["mode", "certificateFingerprint", "certificateNotAfter", "provisioningProfileTeamId", "provisioningProfileNotAfter"], storeDistribution: ["testFlightBuild", "appStoreVersion"], entry: ["tool", "exitCode", "output", "claimedStatus"] };
const unknownKeys = (o, allowed, path, errors) => { for (const k of Object.keys(o)) if (!allowed.includes(k)) errors.push("unknown " + path + " field: " + k); };

// Evaluates only the Apple namespace. Core rules are judged by the pinned core evaluator (see evaluateProfile).
export function evaluateNamespace(record, now) {
  const errors = [], notEvaluated = [];
  const p = record[NS];
  if (p === undefined) return { errors, notEvaluated: ["apple profile absent"] };
  if (!isObj(p)) return { errors: ["apple must be an object"], notEvaluated };
  unknownKeys(p, KEYS[NS], "apple", errors);
  if (p.coreVersion !== "0.1.0") errors.push("apple.coreVersion must equal the pinned core version 0.1.0");
  const s = p.codeSigning;
  if (s === undefined) notEvaluated.push("apple.codeSigning absent");
  else if (!isObj(s)) errors.push("apple.codeSigning must be an object");
  else {
    unknownKeys(s, KEYS.codeSigning, "apple.codeSigning", errors);
    if (!SIGNING.mode.includes(s.mode)) errors.push("apple.codeSigning.mode must be automatic or manual");
    if (s.certificateFingerprint !== undefined && !(typeof s.certificateFingerprint === "string" && HEX64.test(s.certificateFingerprint))) errors.push("apple.codeSigning.certificateFingerprint must be a sha256 hex fingerprint");
    for (const f of ["certificateNotAfter", "provisioningProfileNotAfter"]) {
      if (s[f] === undefined) { notEvaluated.push("apple.codeSigning." + f + " absent"); continue; }
      if (typeof s[f] !== "string" || !DATE.test(s[f]) || Number.isNaN(Date.parse(s[f]))) { errors.push("apple.codeSigning." + f + " must be an ISO date"); continue; }
      if (!(now instanceof Date)) notEvaluated.push("apple.codeSigning." + f + " expiry not evaluated: no clock supplied");
      else if (Date.parse(s[f]) <= now.getTime()) errors.push("apple.codeSigning." + f + " is expired");
    }
  }
  if (p.storeDistribution !== undefined) { if (!isObj(p.storeDistribution)) errors.push("apple.storeDistribution must be an object"); else unknownKeys(p.storeDistribution, KEYS.storeDistribution, "apple.storeDistribution", errors); }
  if (p.ingested === undefined) notEvaluated.push("apple.ingested absent");
  else if (!Array.isArray(p.ingested)) errors.push("apple.ingested must be an array");
  else for (const [i, e] of p.ingested.entries()) {
    if (isObj(e)) unknownKeys(e, KEYS.entry, "apple.ingested[" + i + "]", errors);
    const r = parseIngested(e);
    if (r.status === "failed") errors.push("apple.ingested[" + i + "] reports a failed " + e.tool + " result");
    else if (r.status === "not-evaluated") notEvaluated.push("apple.ingested[" + i + "]: " + r.why);
    if (isObj(e) && e.claimedStatus !== undefined && e.claimedStatus !== r.status) errors.push("apple.ingested[" + i + "] claimedStatus contradicts the parsed output");
  }
  return { errors, notEvaluated };
}

// Criterion 5: the core verdict comes from the pinned core evaluator (injected, never reimplemented here). The profile
// can only make the outcome stricter; a core reject or not-evaluated is never upgraded.
export function evaluateProfile(record, coreEvaluate, now) {
  const core = coreEvaluate(record);
  if (core.verdict === "reject") return core; // never read a record the core refused (it may be hostile, e.g. accessors)
  const own = evaluateNamespace(record && typeof record === "object" ? record : {}, now);
  const errors = [...core.errors, ...own.errors.map((e) => "apple: " + e)];
  const notEvaluated = [...core.notEvaluated, ...own.notEvaluated.map((e) => "apple: " + e)];
  const verdict = errors.length ? "reject" : notEvaluated.length ? "not-evaluated" : "pass";
  return { verdict, errors, notEvaluated };
}
