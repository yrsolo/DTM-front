# Workbench Inspector Targets

## Foundation rule

Targets are semantic and stable, not arbitrary DOM wrappers.

At foundation stage:

- the package supports target contracts
- the app registry may stay empty/no-op
- no selection behavior is required yet

## Target principles

- target ids should stay readable and stable
- target labels should describe semantic UI regions
- parent/child relations are optional and explicit
- metadata is optional and app-owned

## Target ownership

Target ownership mapping belongs to the app integration layer, not the package.
