# AI Development Workflow Comparison

## Overview

This experiment compared two AI-assisted development approaches for building a FlyRank AI dashboard settings feature. The first implementation used a single vague prompt, while the second implementation used a detailed specification, planning phase, implementation constraints, testing requirements, and self-review process.

The goal was to evaluate how prompt quality affects correctness, maintainability, accessibility, and review effort.

## Round One: Vague Prompt

The first implementation was generated using the prompt:

"Create a React settings page for an AI dashboard."

Because the requirements were not specified, the AI made many assumptions about the product requirements and architecture.

The generated solution created multiple settings sections and reusable components, but important engineering requirements were not explicitly considered. There was no defined validation strategy, testing approach, accessibility checklist, or verification workflow.

The implementation required more manual review because the developer had to inspect whether important behaviors were missing.

## Round Two: Structured Prompt

The second implementation used a detailed engineering specification.

The AI was instructed to first create a plan, then implement the feature, write tests, execute verification, and perform a self-review.

The second approach produced a more focused architecture with reusable components including FormField, ToggleField, SliderField, SelectField, SectionCard, and StatusBanner.

The implementation included:

- Input validation
- Inline error messages
- Disabled submission for invalid forms
- Accessibility support
- TypeScript typing
- Automated tests

The AI also detected and fixed issues during verification. During testing, it identified a JSX syntax problem and validation state issues, corrected them, and reran the test suite successfully.

## Specific Differences

The structured approach improved several areas:

- The vague implementation lacked a testing strategy, while the structured version included automated tests with 5 passing cases.
- The structured version included explicit accessibility requirements such as labels, semantic HTML, and ARIA support.
- The structured version used smaller reusable components, reducing future maintenance effort.
- The structured version required less manual debugging because the AI performed verification before completion.

## AI Mistake Identified

During the structured implementation, the AI initially produced failing tests caused by incorrect selectors and form validation state handling. These issues were discovered during the verification phase and fixed before completion.

## Lessons Learned

This experiment showed that AI-generated code quality depends heavily on the quality of instructions provided. A vague prompt can produce working code, but it often requires additional review and correction.

A structured workflow with clear requirements, constraints, testing expectations, and verification steps produces more reliable results. Although writing a detailed specification takes additional time initially, it reduces debugging time and improves overall development efficiency.