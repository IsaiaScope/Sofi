import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { agentsQueryOptions } from "@/features/agents/queries/options";
import { cn } from "@/lib/cn";
import { LaunchAgentTaskError, useLaunchAgentTask } from "../queries/use-launch-agent-task";
import { type CreateTaskFormData, createTaskSchema } from "../schemas";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  columnId: string;
  boardId: string;
  repoPath: string;
  onLaunched?: () => void;
}

export function CreateTaskDialog({
  open,
  onClose,
  columnId,
  boardId,
  repoPath,
  onLaunched,
}: CreateTaskDialogProps) {
  const { t } = useTranslation("kanban");
  const agentsQuery = useQuery(agentsQueryOptions);
  const launchMutation = useLaunchAgentTask();

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: "", description: "", agent_type: undefined },
  });

  useEffect(() => {
    if (open) {
      form.reset({ title: "", description: "", agent_type: undefined });
    }
  }, [open, form]);

  const agents = agentsQuery.data ?? [];
  const selectedAgent = form.watch("agent_type");
  const missingRepoPath = !repoPath;

  const onSubmit = form.handleSubmit(async (data) => {
    if (missingRepoPath) return;
    try {
      await launchMutation.mutateAsync({
        columnId,
        boardId,
        repoPath,
        title: data.title,
        description: data.description,
        agent_type: data.agent_type,
        agents,
      });
      onLaunched?.();
      onClose();
    } catch (err) {
      const phase = err instanceof LaunchAgentTaskError ? err.phase : "task";
      toast.error(t(`launchErrors.${phase}` as const));
    }
  });

  return (
    <Dialog open={open} onClose={onClose} title={t("createDialog.title")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field error={form.formState.errors.title?.message}>
          <FieldLabel>{t("createDialog.titleField")}</FieldLabel>
          <Input
            {...form.register("title")}
            placeholder={t("createDialog.titlePlaceholder")}
            autoFocus
          />
        </Field>

        <Field error={form.formState.errors.description?.message}>
          <FieldLabel>{t("createDialog.descriptionField")}</FieldLabel>
          <Textarea
            rows={5}
            {...form.register("description")}
            placeholder={t("createDialog.descriptionPlaceholder")}
          />
        </Field>

        <Field error={form.formState.errors.agent_type?.message}>
          <FieldLabel>{t("createDialog.agentField")}</FieldLabel>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={t("createDialog.agentField")}
          >
            {agents.map(({ config, available }) => {
              const isSelected = selectedAgent === config.agent_type;
              return (
                <Button
                  key={config.agent_type}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  variant={isSelected ? "primary" : "ghost"}
                  size="sm"
                  disabled={!available}
                  onClick={() =>
                    form.setValue("agent_type", config.agent_type, {
                      shouldValidate: true,
                    })
                  }
                  className={cn("rounded-full", !isSelected && "bg-white/5")}
                >
                  {config.display_name}
                  {!available && (
                    <span className="ml-2 text-sofi-text-dim">
                      ({t("createDialog.agentUnavailable")})
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </Field>

        {missingRepoPath && (
          <p
            role="alert"
            className="rounded-lg border border-sofi-red/40 bg-sofi-red/10 px-3 py-2 text-base text-sofi-red"
          >
            {t("createDialog.repoPathMissing")}
          </p>
        )}

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-sofi-border pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("createDialog.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={missingRepoPath || launchMutation.isPending}
          >
            {launchMutation.isPending ? t("createDialog.launching") : t("createDialog.create")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
