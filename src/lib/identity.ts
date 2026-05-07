export type IdentityProvider = "none" | "sim-secure" | "keyra";

export type IdentityPayload = {
  identityProvider: IdentityProvider;
  identityToken?: string;
};

export function buildIdentityPayload(provider: IdentityProvider): IdentityPayload {
  if (provider === "none") return { identityProvider: provider };
  // Hook point for future SIM Secure / KEYRA verifiers.
  return { identityProvider: provider, identityToken: `mock-${provider}-token` };
}
