import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-sofi-text">Settings</h1>
      </header>

      <AppearanceSection />
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const options: { value: "system" | "light" | "dark"; label: string; description: string }[] = [
    { value: "system", label: "System", description: "Follow your operating system" },
    { value: "light", label: "Light", description: "Daylight mode" },
    { value: "dark", label: "Dark", description: "Sofi's default cyberpunk feel" },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-sofi-text">Appearance</h2>
        <p className="text-base text-sofi-text-muted">
          Choose how Sofi looks. System matches your OS preference automatically.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Theme preference"
        className="flex items-center gap-2 rounded-lg border border-sofi-border bg-sofi-elevated p-1"
      >
        {options.map((opt) => {
          const isActive = theme === opt.value;
          return (
            // biome-ignore lint: styled segmented control requires button container
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-base font-medium transition-colors",
                isActive
                  ? "bg-violet-primary text-white shadow-lg shadow-violet-primary/20"
                  : "text-sofi-text-muted hover:bg-sofi-border hover:text-sofi-text",
              )}
            >
              <div>{opt.label}</div>
              <div className="text-base font-normal opacity-70">{opt.description}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
