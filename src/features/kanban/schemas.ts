import { z } from "zod";
import { AGENT_TYPES } from "@/lib/constants";

export const createBoardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  repoPath: z.string().optional(),
});
export type CreateBoardFormData = z.infer<typeof createBoardSchema>;

const AGENT_TYPE_VALUES = Object.values(AGENT_TYPES) as [string, ...string[]];

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Describe the task in at least 10 characters"),
  agent_type: z.enum(AGENT_TYPE_VALUES, { required_error: "Pick an agent" }),
});
export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
