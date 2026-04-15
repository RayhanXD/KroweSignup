const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBool(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

export const FEATURE_FLAGS = {
  granolaImports: parseBool(process.env.FEATURE_GRANOLA_IMPORTS, false),
} as const;

export function ensureGranolaImportsEnabled(): void {
  if (!FEATURE_FLAGS.granolaImports) {
    throw new Error("Granola imports feature is disabled");
  }
}
