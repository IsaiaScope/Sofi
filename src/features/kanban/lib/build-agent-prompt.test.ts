import { describe, expect, it } from "vitest";
import {
  buildAgentCommand,
  buildAgentPrompt,
  escapeForShellDoubleQuotes,
} from "./build-agent-prompt";

describe("buildAgentPrompt", () => {
  it("includes title and description", () => {
    const out = buildAgentPrompt({ title: "Fix login", description: "Auth redirect loop" });
    expect(out).toContain("Task: Fix login");
    expect(out).toContain("Auth redirect loop");
  });

  it("includes branch line when provided", () => {
    const out = buildAgentPrompt({
      title: "T",
      description: "D",
      branch_name: "sofi/task/abc",
    });
    expect(out).toContain("Branch: sofi/task/abc");
  });

  it("omits branch line when missing", () => {
    const out = buildAgentPrompt({ title: "T", description: "D" });
    expect(out).not.toContain("Branch:");
  });
});

describe("escapeForShellDoubleQuotes", () => {
  it("escapes backticks", () => {
    expect(escapeForShellDoubleQuotes("hi `rm -rf`")).toBe("hi \\`rm -rf\\`");
  });

  it("escapes dollar signs", () => {
    expect(escapeForShellDoubleQuotes("$HOME/foo")).toBe("\\$HOME/foo");
  });

  it("escapes double quotes", () => {
    expect(escapeForShellDoubleQuotes('say "hi"')).toBe('say \\"hi\\"');
  });

  it("escapes backslashes", () => {
    expect(escapeForShellDoubleQuotes("a\\b")).toBe("a\\\\b");
  });

  it("leaves safe characters alone", () => {
    expect(escapeForShellDoubleQuotes("hello world 123")).toBe("hello world 123");
  });
});

describe("buildAgentCommand", () => {
  it("wraps prompt in double quotes with escapes", () => {
    expect(buildAgentCommand("claude", 'test "$VAR"')).toBe('claude "test \\"\\$VAR\\""');
  });
});
