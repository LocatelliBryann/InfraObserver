import "dotenv/config";

import readline from "node:readline";

import { authService } from "../config/dependencies";
import { prisma } from "../database/prisma";
import {
  parseCreateAdminArgs,
  runCreateAdmin,
} from "./create-admin.command";

// Lê as respostas linha a linha sem mostrar o que é digitado.
// Funciona digitando no terminal ou com a senha enviada por pipe.
function createHiddenPrompt() {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY),
  });
  const writable = terminal as unknown as {
    _writeToOutput: (text: string) => void;
  };
  const pendingLines: string[] = [];
  const waiting: Array<(line: string) => void> = [];

  writable._writeToOutput = () => undefined;

  terminal.on("line", (line) => {
    const next = waiting.shift();

    if (next) {
      next(line);
    } else {
      pendingLines.push(line);
    }
  });

  terminal.on("close", () => {
    for (const next of waiting.splice(0)) {
      next("");
    }
  });

  const ask = (question: string) => {
    process.stdout.write(question);

    return new Promise<string>((resolve) => {
      const done = (line: string) => {
        process.stdout.write("\n");
        resolve(line);
      };
      const buffered = pendingLines.shift();

      if (buffered === undefined) {
        waiting.push(done);
      } else {
        done(buffered);
      }
    });
  };

  return { ask, close: () => terminal.close() };
}

async function main() {
  const prompt = createHiddenPrompt();

  const exitCode = await runCreateAdmin(
    parseCreateAdminArgs(process.argv.slice(2)),
    {
      authService,
      askPassword: prompt.ask,
      print: (message) => console.log(message),
    },
  );

  prompt.close();
  await prisma.$disconnect();
  process.exit(exitCode);
}

void main();
