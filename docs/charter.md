<!-- Charter revision 3; authoritative evidence: F:\GitHub Evidence\AppleDevelopmentStandards\evidence-1\ -->
# Charter packet 03 — AppleDevelopmentStandards

Status: DRAFT, read-only. Backlog IDs are draft labels, not issue numbers. See
`00-shared-conventions.md` (kept in the evidence folder above, not in this repository).

## 1. Purpose

Govern Apple-platform development and App Store delivery: signing, entitlements, privacy,
dependencies, build/release provenance, and store readiness.

> A clean result means: for the Apple surfaces this project declared and the framework could
> actually evaluate from project files and ingested evidence, the recorded evidence supports it —
> and everything that requires macOS, Xcode, Apple servers or a human reviewer remains visible as
> unevaluated.

## 2. Scope

- **Apple Developer / App Store Connect access:** team roles, least privilege, App Store Connect API
  keys (`.p8`) governance, account-holder and agent separation, two-factor/identity attestations.
- **Signing:** certificates, provisioning profiles, automatic vs manual signing, key custody,
  rotation/expiry, notarization (macOS), distribution vs development identities.
- **No signing material or credentials in source or evidence:** `.p8`, `.p12`, `.cer` private keys,
  provisioning profiles with embedded certs, API issuer/key IDs paired with keys, `match`-style
  repositories.
- **Entitlements and capabilities:** least-privilege entitlements, App Sandbox (macOS), keychain
  sharing groups, associated domains, push, background modes, App Groups.
- **Privacy:** Info.plist usage-description strings, privacy manifests (`PrivacyInfo.xcprivacy`),
  required-reason API declarations, App Tracking Transparency, third-party SDK privacy manifests and
  signatures, App Store privacy "nutrition label" consistency with behaviour.
- **Platform security:** Keychain and Data Protection classes, App Transport Security and reviewed
  exceptions, URL schemes/universal links, pasteboard and file-access handling, jailbreak/tamper
  considerations as risk statements, not requirements.
- **Build and dependency governance:** Xcode/Swift/SDK/deployment-target pinning, Swift Package
  Manager/CocoaPods/Carthage resolution files, dependency provenance, vulnerability scanning, SBOM,
  build reproducibility, Xcode Cloud / CI configuration.
- **Configuration separation:** schemes, build configurations, xcconfig, dev/test/staging/prod
  separation, debug-only code stripped from release.
- **Release delivery:** TestFlight tracks (internal/external), phased release, version/build number
  discipline (`CFBundleShortVersionString`, `CFBundleVersion`), archive/IPA provenance, App Review
  Guidelines readiness, rollback/expedited-review and post-release monitoring.
- **Platform lifecycle & compatibility:** iOS/iPadOS/macOS/watchOS/tvOS/visionOS deployment-target
  and device-matrix declarations, scene/app lifecycle, background execution, upgrade/migration (Core
  Data/SwiftData schema).

## 3. Non-goals

- **No access to any Apple account, App Store Connect, certificate, key, or profile in any form;**
  evidence is fingerprints, expiry dates, key IDs and role lists supplied by a human or ingested
  export, never material.
- **No Xcode, simulator or macOS dependency in the evaluator.** It must run on a Windows host with
  Node (this portfolio's primary environment). Anything needing a build (compile warnings,
  `codesign --verify`, archive validation, notarization status) is **ingested evidence or
  attestation**, never executed by the pack.
- Does not own UI/interaction/accessibility design rules: the HIG-based presentation rules stay in
  UIUXDesignStandards (its provenance guard already protects "Human Interface Guidelines/Apple HIG"
  tokens). Apple pack references UIUX and owns only platform-mandated behaviour (e.g. permission
  prompt mechanics, Sign in with Apple requirement).
- Does not predict App Review outcomes; it checks documented readiness, not approval.
- Does not own universal invariants (secrets, release integrity, SCM — EngineeringStandards) or how
  tests are verified (SoftwareTestingStandards); it references both.
- Not a legal/ToS interpretation (Developer Program License Agreement, tax/banking). Records only
  that required agreements were attested.
- Cross-platform frameworks (React Native, Flutter, MAUI) governed only for their Apple-native
  surface in v1.

## 4. Authoritative first-party sources (all UNVERIFIED until opened)

> Status note: this section is the pre-verification charter text. The source ledger in the evidence folder (hashed in `docs/evidence-index.md`) records which sources were later opened (tool-extracted, not human-reviewed) and governs; "unverified" below is superseded per source by the ledger.

| Source | Role |
| --- | --- |
| Cited by Mike, not yet opened by me: App Store Connect API key guidance (`developer.apple.com/documentation/AppStoreConnectAPI/creating-api-keys-for-app-store-connect-api`), privacy manifest files and required-reason APIs (`.../bundleresources/privacy-manifest-files`, `.../BundleResources/describing-use-of-required-reason-api`), Keychain Services (`.../security/keychain-services/`) | Key custody, privacy, keychain controls |
| Apple Developer Documentation (Xcode, Swift, platform frameworks) | API and build semantics |
| Apple Human Interface Guidelines | Referenced for UI; owned by UIUXDesignStandards |
| App Review Guidelines | Store policy; changes frequently, requires dated review |
| Apple Developer Program License Agreement and App Store Connect help | Account/role/agreement facts |
| Apple Platform Security guide | Keychain, Data Protection, code signing, sandbox concepts |
| Apple documentation: privacy manifests, required reason APIs, App Tracking Transparency | Privacy controls |
| Apple documentation: code signing, notarization, provisioning, App Store Connect API | Signing and API key governance |
| Apple documentation: TestFlight, phased release | Release controls |
| Swift.org: Swift API Design Guidelines, Swift Evolution, Swift Package Manager docs | Language and dependency semantics |
| WWDC session transcripts (first-party video notes) | Provenance only, never normative |
| Internal: EngineeringStandards 16, 46, 49, 50; UIUXDesignStandards Standard 2/ADR 0006 pattern | Boundary partners |

## 5. Proposed hierarchy

Layout per conventions §2. Proposed ~30 standards:

| # | Standard | Group |
| --- | --- | --- |
| 01 | Boundary with EngineeringStandards, UIUXDesignStandards, SoftwareTesting, AndroidDevelopment | Foundations |
| 02 | Apple applicability (Xcode project, Package.swift, Info.plist, fastlane) and declared targets | Foundations |
| 03 | Evidence surfaces: project-file static, ingested tool output, attested | Foundations |
| 04 | Apple Developer / App Store Connect roles and least privilege | Access |
| 05 | App Store Connect API key governance (`.p8`) | Access |
| 06 | Certificates, identifiers, entitlements, provisioning profiles, signing: ownership, custody, expiry, rotation, revocation | Signing |
| 07 | No signing material or credentials in source or evidence | Signing |
| 08 | Notarization and Gatekeeper (macOS distribution) | Signing |
| 09 | Entitlements and capabilities least privilege | Platform security |
| 10 | Keychain, Data Protection, and local storage | Platform security |
| 11 | App Transport Security and reviewed exceptions | Platform security |
| 12 | URL schemes, universal links, associated domains | Platform security |
| 13 | Usage descriptions and permission requests | Privacy |
| 14 | Privacy manifest and required-reason APIs | Privacy |
| 15 | Third-party SDKs: privacy manifests, signatures, data collection | Privacy |
| 16 | App Store privacy label consistency | Privacy |
| 17 | Toolchain pinning: Xcode, Swift, SDK, deployment targets | Build |
| 18 | Dependency provenance: SPM/CocoaPods resolution, scanning, SBOM | Build |
| 19 | Schemes, configurations, environment separation | Build |
| 20 | Release build hygiene: debug code, logging, symbols, bitcode-era leftovers | Build |
| 21 | Version and build number discipline; archive provenance | Release |
| 22 | TestFlight groups, tester access, build expiry, feedback handling, promotion gates, and phased release | Release |
| 23 | App Review readiness (guidelines checklist, review notes, demo account handling) | Release |
| 24 | Post-release monitoring, crash reporting, rollback/expedite path | Release |
| 25 | Test evidence for Apple targets: XCTest, UI testing, accessibility, performance, energy, crash, offline, upgrade (procedure cites SoftwareTestingStandards); device/OS/form-factor/locale compatibility matrix | Compatibility |
| 26 | Data migration and upgrade (Core Data/SwiftData) | Compatibility |
| 27 | Source currency: annual OS/Review Guideline/SDK-minimum review cadence | Currency |
| 28 | AI-agent operation on Apple accounts: propose-vs-execute, no custody | AI |
| 29 | Policy, applicability, exceptions | Framework |
| 30 | Evidence, assurance, compliance output | Framework |

Rule-ID domains (proposed): `appleaccess`, `applesign`, `appleent`, `appleprivacy`, `applebuild`,
`applerelease`.

Applicability: `.xcodeproj/.xcworkspace`, `Package.swift` with Apple platforms, `Info.plist`,
`*.entitlements`, `fastlane/`, Xcode Cloud config. Declared `no-apple` is a declaration, not a
finding.

## 6. Initial threat model

| ID | Failure | Detection posture |
| --- | --- | --- |
| T1 | `.p8`/`.p12`/private key/profile committed or placed in evidence | Static scan (filename + PEM header), never echoes content |
| T2 | Signing identity single-person key custody; expiry unnoticed | Attested custody + expiry ledger; static expiry checks on declared dates |
| T3 | Over-broad entitlements or capabilities beyond feature need | Static entitlement diff vs declared justification |
| T4 | ATS globally disabled or unreviewed exceptions | Info.plist static check |
| T5 | Missing/incorrect privacy manifest or usage strings → rejection or misdeclared data | Static plist/manifest check `partial`; label consistency attested |
| T6 | Third-party SDK collects data undisclosed | SDK inventory vs manifest; behaviour not provable statically |
| T7 | Unpinned toolchain/dependencies; non-reproducible archive | Resolution file + toolchain declaration check |
| T8 | Debug/test endpoints or credentials shipped in release config | Configuration check + release-build attestation |
| T9 | Version/build number regression, uploaded archive not matching tagged source | Provenance record check |
| T10 | Rollout without TestFlight/phased release, no halt/expedite plan | Release-plan attestation |
| T11 | Evaluator claims signing/notarization validity it cannot verify on Windows | Those checks are ingestion-only; `not-evaluated` by default |
| T12 | Pack restating HIG presentation rules and drifting from UIUX | Boundary meta-test |

## 7. First backlog (draft labels; 15 items)

| Draft ID | Title | Notes |
| --- | --- | --- |
| APL-B01 | Repo skeleton, vendored core provenance, rule-ID domains | |
| APL-B02 | Boundary standard vs Eng / UIUX (HIG) / Testing / Android | Meta-test |
| APL-B03 | Open and record external sources and dated review cadence | Resolves UNVERIFIED |
| APL-B04 | Decide evaluation-host constraint (Windows/Node, no Xcode) and ingestion list | Architectural ADR |
| APL-B05 | Apple applicability classifier | |
| APL-B06 | Policy schema, template, declared targets/platforms | |
| APL-B07 | Pin a version of the SoftwareTestingStandards core release-evidence schema; define the Apple profile (certificates, profiles, TestFlight, App Store fields) and ingestion of `codesign`/`xcodebuild`/notarization outputs | Never executes tools; no duplicated core schema; depends on SWT-B04 |
| APL-B08 | Signing and credential standards 05–07 + secret-file detectors | Output must never echo material |
| APL-B09 | Entitlements/ATS/plist parser and standards 09–12 | Zero-dependency plist parser |
| APL-B10 | Privacy standards 13–16 and privacy-manifest detectors | |
| APL-B11 | Toolchain/dependency standards 17–18 (SPM/CocoaPods) | |
| APL-B12 | Release standards 21–24 + attestation model | |
| APL-B13 | Fixtures: compliant, key-in-repo, ATS-off, missing privacy manifest, unpinned deps | |
| APL-B14 | StandardsEnforcer adapter entry | Cross-repo |
| APL-B15 | Adversarial fixtures proving each rule class; real-project adoption recorded as a later milestone | No qualifying real Apple workload under F:\Repos; no adoption evidence invented |

## 8. Applied decisions and open questions

Applied (Mike, on or before 2026-11-19 19:36 PST (2026-11-20T03:36Z)): v1 validated by adversarial fixtures only (no qualifying real workload under F:\Repos); pins the SoftwareTestingStandards core release-evidence schema and extends it with a platform profile.


1. ~~Real Apple project to dogfood against?~~ Settled by the applied decision above: fixture-only validation.
2. macOS notarization and Mac App Store in v1, or iOS/iPadOS only? Recommendation: iOS/iPadOS +
   shared Swift packages first.
3. How are Developer Program agreements/tax/banking handled? Recommendation: attestation only.
