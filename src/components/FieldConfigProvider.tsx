import * as React from "react";
import {
  type FieldConfigState,
  getDefaultFieldConfig,
  safeLoadFieldConfig,
  saveFieldConfig,
  type ModuleKey,
  type FieldKey,
} from "@/lib/fieldConfig";

type Ctx = {
  config: FieldConfigState;
  setRule: (module: ModuleKey, field: FieldKey, patch: Partial<{ visible: boolean; required: boolean }>) => void;
  reset: () => void;
  getRule: (module: ModuleKey, field: FieldKey) => { visible: boolean; required: boolean };
};

const FieldConfigContext = React.createContext<Ctx | null>(null);

export function FieldConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<FieldConfigState>(() => {
    if (typeof window === "undefined") return getDefaultFieldConfig();
    return safeLoadFieldConfig();
  });

  React.useEffect(() => {
    saveFieldConfig(config);
  }, [config]);

  const getRule = React.useCallback(
    (module: ModuleKey, field: FieldKey) => {
      return config.modules[module]?.[field] ?? { visible: true, required: false };
    },
    [config],
  );

  const setRule = React.useCallback(
    (module: ModuleKey, field: FieldKey, patch: Partial<{ visible: boolean; required: boolean }>) => {
      setConfig((prev) => {
        const current = prev.modules[module]?.[field] ?? { visible: true, required: false };
        const nextRule = {
          ...current,
          ...patch,
          // if hidden → not required
          ...(patch.visible === false ? { required: false } : null),
        };
        return {
          ...prev,
          modules: {
            ...prev.modules,
            [module]: {
              ...prev.modules[module],
              [field]: nextRule,
            },
          },
        };
      });
    },
    [],
  );

  const reset = React.useCallback(() => {
    setConfig(getDefaultFieldConfig());
  }, []);

  return (
    <FieldConfigContext.Provider value={{ config, setRule, reset, getRule }}>
      {children}
    </FieldConfigContext.Provider>
  );
}

export function useFieldConfig() {
  const ctx = React.useContext(FieldConfigContext);
  if (!ctx) throw new Error("useFieldConfig must be used within FieldConfigProvider");
  return ctx;
}
