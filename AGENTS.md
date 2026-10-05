# vempain-website-frontend — Agent Guide

## Scope

This repository contains the public React/TypeScript website frontend. The
backend is maintained separately in `vempain-website-backend` and is a
Spring Boot application.

## Conventions

- Use the checked-in Yarn 4 tooling and existing scripts.
- Preserve route helpers and API contracts; JSON fields use snake_case.
- Shared authentication clients should follow the established
  `vempain-auth-frontend` patterns.
- Prefer existing components and utilities over duplicate implementations.
- Do not add TypeScript `enum`; use the repository's established constant
  object patterns.

## Validation

Run `yarn lint`, `yarn typecheck`, `yarn test`, and the production build for
changes affecting application behavior, routing, APIs, authentication, or
deployment configuration.

## Tag ACL rule

Tags are metadata, not ACL-bearing resources. Tag entities have no ACL information, so tag list, search, and mutation endpoints must not perform ACL checks on tags. ACL checks apply only to resources that explicitly carry an ACL.
