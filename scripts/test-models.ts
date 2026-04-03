import "dotenv/config";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

async function main() {
  const models = [
    { name: "gemini-2.0-flash", model: google("gemini-2.0-flash") },
    { name: "gemini-2.5-pro-preview-06-05", model: google("gemini-2.5-pro-preview-06-05") },
    { name: "gemini-2.5-pro", model: google("gemini-2.5-pro") },
    { name: "gemini-2.5-flash", model: google("gemini-2.5-flash") },
    { name: "gemini-1.5-pro", model: google("gemini-1.5-pro") },
    { name: "claude-3-5-haiku-latest", model: anthropic("claude-3-5-haiku-latest") },
    { name: "claude-3-5-sonnet-latest", model: anthropic("claude-3-5-sonnet-latest") },
  ];

  for (const { name, model } of models) {
    try {
      const r = await generateText({ model, prompt: "say hi in 3 words", maxOutputTokens: 20 });
      console.log(`✅ ${name}: ${r.text.substring(0, 40)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`❌ ${name}: ${msg.substring(0, 100)}`);
    }
  }
}

main().catch(console.error);
