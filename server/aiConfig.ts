/** Direct provider keys must never be sent to the Replit proxy. */
export function openAIOptions(env: NodeJS.ProcessEnv = process.env) {
  if (env.OPENAI_API_KEY) return { apiKey: env.OPENAI_API_KEY };
  if (env.RAILWAY_PROJECT_ID) throw new Error("OPENAI_API_KEY is required on Railway");
  return { apiKey: env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: env.AI_INTEGRATIONS_OPENAI_BASE_URL };
}

export function geminiOptions(env: NodeJS.ProcessEnv = process.env) {
  if (env.GEMINI_API_KEY) return { apiKey: env.GEMINI_API_KEY };
  if (env.RAILWAY_PROJECT_ID) throw new Error("GEMINI_API_KEY is required on Railway");
  return {
    apiKey: env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: { apiVersion: "", baseUrl: env.AI_INTEGRATIONS_GEMINI_BASE_URL },
  };
}
