export function redactSecrets(text: string, secrets: Array<string | undefined>): string {
  let output = text;
  for (const secret of secrets) {
    if (!secret || secret.length < 8) continue;
    output = output.split(secret).join("[redacted]");
  }
  return output;
}

export function secretValues(env: NodeJS.ProcessEnv = process.env): string[] {
  return [
    env.EMBEDDING_API_KEY,
    env.BAILIAN_EMBEDDING_API_KEY,
    env.CHAT_API_KEY,
    env.BAILIAN_CHAT_API_KEY,
    env.QUOTA_HMAC_KEY,
  ].filter((value): value is string => Boolean(value && value.length >= 8));
}
