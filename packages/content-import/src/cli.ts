#!/usr/bin/env node
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runContentImport } from "./import.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

async function main(): Promise<void> {
  const dryRun = !flag("--apply");
  const qualificationSlug =
    argValue("--qualification") ?? "ireland/harec";

  const result = await runContentImport({
    dryRun,
    qualificationSlug,
    paths: {
      questionBank: resolve(repoRoot, "harec_question_bank_v2.json"),
      flashcards: resolve(repoRoot, "harec_flashcards_v2.json"),
      mockExams: resolve(repoRoot, "harec_mock_exams_v2.json"),
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.blockingErrors > 0) {
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.error(
      "Dry-run only. Pass --apply with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to write.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
