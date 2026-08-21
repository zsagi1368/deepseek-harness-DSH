/**
 * Shared LLM constants used across adapters and agents.
 * Centralizing these prevents drift between adapter-specific defaults.
 *
 * @module @deepseek-ai/dsh-llm/constants
 */
/**
 * Default context window size in tokens.
 *
 * This is a conservative baseline. Adapters that know their model's actual
 * capacity (e.g. DeepSeek v4 flash = 1M, v4 pro = 672K) should override
 * this via the `contextWindow` field on `LlmResolvedModelInfo`.
 *
 * The agent loop reads the resolved model's contextWindow first; this value
 * is only used as a fallback when no catalog entry exists.
 */
export const DEFAULT_CONTEXT_WINDOW = 1_000_000;
//# sourceMappingURL=constants.js.map