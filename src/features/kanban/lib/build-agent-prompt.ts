interface BuildAgentPromptInput {
  title: string;
  description: string;
  branch_name?: string;
}

export function buildAgentPrompt({
  title,
  description,
  branch_name,
}: BuildAgentPromptInput): string {
  const branchLine = branch_name ? `Branch: ${branch_name}\n\n` : "";
  return `Task: ${title}\n\n${branchLine}${description}`;
}

// Quotes a string for safe use inside a POSIX double-quoted argument.
// Escapes the four characters that retain special meaning inside "...":
// backslash, backtick, dollar, and double-quote.
export function escapeForShellDoubleQuotes(value: string): string {
  return value.replace(/([\\`$"])/g, "\\$1");
}

export function buildAgentCommand(agentCommand: string, prompt: string): string {
  return `${agentCommand} "${escapeForShellDoubleQuotes(prompt)}"`;
}
