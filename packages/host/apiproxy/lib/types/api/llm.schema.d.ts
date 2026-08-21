/**
 * llm domain zod schemas (names derived from map keys: llmProvidersRequestSchema /
 * llmProvidersValueSchema / llmModelsRequestSchema / llmModelsValueSchema).
 */
/** ConfigurableProviderView row of llm.providers. */
export declare const configurableProviderViewSchema: z.ZodType<{
    provider: string | undefined;
    displayName: string | undefined;
    settingsNs: string | undefined;
    settingsPath: string[] | undefined;
    active: boolean | undefined;
    declared?: boolean;
}>;
/** llm.providers request payload. */
export declare const llmProvidersRequestSchema: z.ZodType<{}>;
/** llm.providers response value. */
export declare const llmProvidersValueSchema: z.ZodType<{
    providers: {
        provider: string | undefined;
        displayName: string | undefined;
        settingsNs: string | undefined;
        settingsPath: string[] | undefined;
        active: boolean | undefined;
        declared?: boolean;
    }[] | undefined;
}>;
/** llm.models request payload. */
export declare const llmModelsRequestSchema: z.ZodType<{}>;
/** llm.models response value. */
export declare const llmModelsValueSchema: z.ZodType<{
    groups: {
        id: string | undefined;
        name: string | undefined;
        models: {
            id: string | undefined;
            name: string | undefined;
            description?: string;
            reasoning?: {
                efforts: {
                    id: string | undefined;
                    name: string | undefined;
                    description?: string;
                }[] | undefined;
                defaultEffort?: string;
            } | undefined;
        }[] | undefined;
    }[] | undefined;
    failures: {
        id: string | undefined;
        name: string | undefined;
        message: string | undefined;
    }[] | undefined;
}>;
/** DiscoveredModelView row of llm.discoverModels. */
export declare const discoveredModelViewSchema: z.ZodType<{
    id: string | undefined;
    name?: string;
    contextWindow?: number;
    maxTokens?: number;
}>;
/** llm.discoverModels request payload. */
export declare const llmDiscoverModelsRequestSchema: z.ZodType<{
    settingsNs: string | undefined;
    provider?: string;
    baseURL?: string;
    api?: string;
    apiKey?: string;
}>;
/** llm.discoverModels response value. */
export declare const llmDiscoverModelsValueSchema: z.ZodType<{
    models: {
        id: string | undefined;
        name?: string;
        contextWindow?: number;
        maxTokens?: number;
    }[] | undefined;
}>;
//# sourceMappingURL=llm.schema.d.ts.map