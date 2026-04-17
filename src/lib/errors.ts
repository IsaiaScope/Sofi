export interface AppError {
  code: number;
  message: string;
}

export const ErrorCode = {
  VALIDATION: 400,
  AUTH: 401,
  NOT_FOUND: 404,
  INTERNAL: 500,
} as const;

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as AppError).code === "number" &&
    typeof (error as AppError).message === "string"
  );
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return {
    code: ErrorCode.INTERNAL,
    message: typeof error === "string" ? error : "An unexpected error occurred",
  };
}
