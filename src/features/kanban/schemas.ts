import { z } from "zod";

export const createBoardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  repoPath: z.string().optional(),
});
export type CreateBoardFormData = z.infer<typeof createBoardSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
});
export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
