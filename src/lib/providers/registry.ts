import { GroqAdapter } from "./groq";
import { SimulatorAdapter } from "./simulator";
import type { ProviderAdapter } from "./types";

const simulator = new SimulatorAdapter();
const groq = new GroqAdapter();

const ADAPTERS: Record<string, ProviderAdapter> = {
    simulator,
    groq,
};

export function getProviderAdapter(providerId: string): ProviderAdapter {
    return ADAPTERS[providerId] ?? simulator;
}

export function registerProviderAdapter(adapter: ProviderAdapter): void {
    ADAPTERS[adapter.providerId] = adapter;
}
