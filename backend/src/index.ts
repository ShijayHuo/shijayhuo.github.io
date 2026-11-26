import { createAnswer } from "./handler.ts";
import { bundledKnowledge } from "./generated/knowledge.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return createAnswer(request, env, { bundle: bundledKnowledge });
  },
} satisfies ExportedHandler<Env>;
