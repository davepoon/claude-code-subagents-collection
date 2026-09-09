---
name: anti-ui-slop
category: design
description: Stop coding agents from shipping generic UI. Use UIZZE's 800,000+ real web and iOS screens to build product-specific interfaces, define a design contract, cover required states, and run a hard finish gate. Use for web or iOS UI design, implementation, redesign, critique, and pre-ship review in Codex, Claude Code, Cursor, Copilot, and other coding agents.
---

# Stop Making UI Slop

Build product-specific interfaces with UIZZE's free anti-ui-slop workflow. Use the product brief, existing components, and design system to make the screen's hierarchy, content, controls, and states intentional.

## When to Use This Skill

Use it to design, implement, redesign, critique, or finish a web or iOS interface, especially when a first draft feels generic or omits important states.

## How to Use

1. Read the target screen, product context, and existing design system. Identify the primary user, action, content, and constraints.
2. Reuse the project's components, tokens, typography, and interaction conventions. For a substantial redesign, write a short design contract; keep a small fix small.
3. Use product-specific labels and real data requirements. Do not invent metrics, activity, testimonials, or controls to fill a layout.
4. Implement the required loading, empty, error, success, disabled, and permission states. Make the primary action and recovery paths clear.
5. When the environment supports it, render the result and fix observable clipping, overlap, inert interactions, and responsive problems. Run the project's relevant checks and summarize what changed.

The workflow works without an account, token, script, or MCP connection. Continue from repository evidence when external references are unavailable.

## Example

```text
Use anti-ui-slop on our billing settings page. Make the current plan,
payment method, and invoice history easy to scan. Reuse our components
and tokens. Cover no invoices, payment failure, and read-only access.
Inspect desktop and mobile output and fix visible breakage.
```

For a focused review, identify the three most useful changes first and implement them within the requested scope.

## Optional UIZZE References

The separate paid [UIZZE MCP](https://github.com/uizze/uizze/tree/main/integrations/mcp) offers focused reference search across 800,000+ real web and iOS screens. It exposes exactly two tools:

- `find_ui_references` finds or inspects up to three full-screen references.
- `find_ui_materials` finds up to three hosted fonts, icons, animated icons, or explicitly requested packs.

Use those tools only when the host provides an authenticated connection and a concrete visual question would benefit from evidence. If retrieval returns nothing, continue from the project. Never claim a tool result that the host did not return.

Adapt useful decisions about hierarchy, density, controls, and states to the product's own design system. Preserve its identity and content.

## Canonical Package and More Examples

This catalog entry is a standalone workflow. Install the complete current skill, including its focused playbooks, with:

```bash
npx skills add https://uizze.com --skill anti-ui-slop
```

[Canonical source](https://github.com/uizze/uizze/tree/main/skills/anti-ui-slop) · [Practical workflows](https://github.com/uizze/uizze/blob/main/examples/agent-workflows.md) · [UIZZE](https://uizze.com)
