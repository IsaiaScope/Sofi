import { useEffect } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { AppError } from "@/lib/errors";
import { translateErrorKind } from "@/lib/i18n/error-codes";

/**
 * Mirror `AppError.fieldErrors` into react-hook-form's per-field error state.
 *
 * Called in an effect so the banner + field highlights update in the same
 * render as the mutation's error transition. The semantic code is translated
 * via `translateErrorKind` so the user sees the locale-appropriate message on
 * the field itself, not the English one Django returned.
 *
 * Unknown field names (fields that exist in `fieldErrors` but not in the form)
 * are ignored — they'll still show up in the banner's `detail` fallback.
 */
export function useServerFieldErrors<TForm extends FieldValues>(
  form: UseFormReturn<TForm>,
  error: AppError | null | undefined,
  /**
   * Optional map from server field name → form field name. Only needed when
   * they differ (e.g. Django sends `password1` but the form uses `password`).
   */
  fieldMap?: Partial<Record<string, Path<TForm>>>,
): void {
  useEffect(() => {
    if (!error?.fieldErrors) return;
    for (const [serverField, codes] of Object.entries(error.fieldErrors)) {
      const formField = (fieldMap?.[serverField] ?? serverField) as Path<TForm>;
      const firstCode = codes[0];
      if (!firstCode) continue;
      const message = translateErrorKind(firstCode) ?? error.message;
      form.setError(formField, { type: "server", message });
    }
  }, [error, form, fieldMap]);
}
