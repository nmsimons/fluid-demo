# Semantic Editing with Fluid and SharedTree

Semantic Editing lets Large Language Models (LLMs) manipulate a Fluid Framework SharedTree safely at runtime. The feature layers domain guidance, runtime tooling, and schema metadata so that generated code can reason about the live collaborative state and apply edits just like a human would. This document explains how the pieces fit together and outlines the steps to add Semantic Editing to an existing Fluid + SharedTree application.

---

## Core Building Blocks

- **Domain Hints (`src/constants/domainHints.ts`)** – A single prompt string that describes your collaborative experience, available object types, important guardrails, and examples of valid code snippets. These hints are given to the LLM before every edit request so the model understands your app’s semantics.
- **Schema Metadata (`src/schema/appSchema.ts`)** – Descriptive strings on fields, plus type-safe method signatures registered through Tree-Agent helpers (`buildFunc`, `exposeMethodsSymbol`). Metadata enables automatic tool discovery, parameter validation, and rich inline docs in generated code.
- **Exposed Schema Methods** – `App`, `Items`, `Item`, `FluidTable`, and related classes expose domain operations (e.g., `createShapeItem`, `duplicateItem`, `addVote`) through Tree-Agent. Because methods are declared on the schema and exposed via `methods.expose(...)`, the agent can safely call them without reflection or `any` casts.
- **Tree-Agent Runtime (`SharedTreeSemanticAgent`)** – Wraps a `TreeView` fork together with an LLM backend. The agent processes prompts, analyzes the current tree state, synthesizes code with the default (or custom) editor, and applies mutations within a transactional sandbox branch.
- **Host UI & Branch Workflow (`AIPane`)** – Provides UX for prompting, shows responses, and controls when to merge or discard LLM edits. The pane establishes a forked `TreeView`, spins up the agent with `domainHints`, and merges the branch back into the main tree once the user accepts changes.

---

## How Semantic Editing Works at Runtime

1. **User Prompt** – A user asks for a change ("Create a blue circle"), typically through a chat UI.
2. **Context Assembly** – The app gathers the current SharedTree branch, the `domainHints` prompt, and the schema metadata. These are passed to the `SharedTreeSemanticAgent`.
3. **LLM Planning** – The agent feeds the prompt and hints to the LLM. The model uses the hints plus exposed schema methods to plan concrete operations.
4. **Code Generation & Execution** – The model returns JS/TS code snippets. Tree-Agent runs the code inside the forked branch (`TreeView.fork()`), using the editor utilities to instrument operations and surface errors.
5. **Review & Merge** – UI shows the outcome. Users can discard the branch or merge it into the main SharedTree, making the semantic edit collaborative for everyone.

---

## Integration Checklist for an Existing Fluid + SharedTree App

Follow these steps to add Semantic Editing capabilities.

### 1. Author Domain Hints

1. Create a constants file such as `src/constants/domainHints.ts`.
2. Document the collaborative scenario, available object types, required guardrails, and sample code. Emphasize constraints like synchronous execution or one-time node insertion.
3. Keep the string concise but descriptive—models rely heavily on these hints for safe behavior.

```ts
export const domainHints = `Describe your canvas, schema operations, guardrails, and examples...`;
```

### 2. Enrich the SharedTree Schema

1. Ensure your schema uses the Tree-Agent helpers:
   ```ts
   import { ExposedMethods, buildFunc, exposeMethodsSymbol } from "@fluidframework/tree-agent/alpha";
   ```
2. For each object that should be controllable by the LLM, expose its methods inside the `exposeMethodsSymbol` block. Example from `Item`:
   ```ts
   public static [exposeMethodsSymbol](methods: ExposedMethods): void {
     methods.expose(Item, "addConnection", buildFunc({ returns: z.void() }, ["fromItemId", z.string()]));
     // expose more methods...
   }
   ```
3. Add friendly metadata (`metadata.description`, custom hints) to fields. Metadata powers richer tooltips and better model understanding.
4. Prefer high-level operations (create/update/delete helpers) instead of requiring raw tree mutations—the LLM will use whatever you expose.

### 3. Wire Up the Tree-Agent Runtime

1. Choose (or build) a React/host component to drive the feature. In this repo, `AIPane` handles UI and lifecycle.
2. Fork the current `TreeView` when the pane opens:
   ```ts
   const branch = main.fork();
   setRenderView(branch);
   ```
3. Create the semantic agent:
   ```ts
   const agent = new SharedTreeSemanticAgent(model, branch, {
     domainHints,
     editor: defaultEditor,
     logger: { log: console.log },
   });
   ```
4. Provide an LLM backend. The demo uses LangChain connectors for OpenAI or Azure OpenAI, but any `SharedTreeSemanticAgent`-compatible model works.
5. Handle authentication tokens if your model endpoint requires them (see `getZumoAuthToken` usage).

### 4. Build the Prompt -> Commit Loop

1. Present a text box for user prompts.
2. On submit, call `await agent.query(prompt)`.
3. Show intermediate status ("…") while the agent runs.
4. When code execution finishes, surface the natural language response from the model.
5. Offer **Commit** and **Discard** buttons:
   - **Commit** merges the branch back into the main tree (`main.merge(branch, false)`).
   - **Discard** disposes the branch without merging.
6. Always reset or recreate the branch before the next prompt to ensure a clean sandbox.

### 5. Validate & Test

1. Run `npm run compile` to ensure schema typings stay accurate.
2. Exercise common prompts manually—verify items render as expected and branch merges succeed.
3. Add unit or integration tests (e.g., Playwright flows) for key prompts if desired.
4. Monitor console logs from the agent/editor for failures; extend `domainHints` when the model needs more guidance.

---

## Best Practices

- **Guardrails First** – Explicitly warn about one-time insertion rules, synchronous execution, or forbidden APIs inside `domainHints`.
- **Expose Only Safe Operations** – Limit `methods.expose` to vetted APIs. The agent will use anything it sees.
- **Use Branches for Safety** – Always fork a `TreeView` so LLM edits can be inspected before merging.
- **Keep Examples Current** – Update domain hints with fresh snippets whenever new item types or operations are added.
- **Monitor Tokens** – If you depend on expiring tokens (e.g., ZUMO, Azure AD), implement refresh logic like the sample `ensureZumoToken` helper in `AIPane`.
- **Fallback Models** – Configure multiple LLM options (OpenAI, Azure) to maintain availability.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| LLM code throws `Cannot insert attached node` | Domain hint missing unique-user guidance | Emphasize one-time insertion rule in hints, expose helpers that create new nodes internally |
| Generated code is empty or generic | Schema lacks exposed methods or metadata | Audit `exposeMethodsSymbol` implementations; add more descriptive metadata |
| Agent crashes with auth errors | Missing or expired model token | Refresh tokens (see `ensureZumoToken`) or configure fallback auth |
| Changes not visible to other clients | Branch never merged | Confirm Commit button merges branch into `main` view |
| Runtime hits `await` syntax error | Model ignored sync-only rule | Reinforce synchronous constraint in domain hints and examples |

---

## Summary

Semantic Editing combines descriptive domain hints, schema-level method exposure, and the Tree-Agent runtime to let LLMs act as first-class collaborators. By structuring your schema, prompts, and host UI as outlined above, you can safely add natural language editing to any Fluid + SharedTree experience.
