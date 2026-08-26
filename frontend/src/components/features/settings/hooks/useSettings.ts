import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../../../config/api";
import type { AppConfig, SheetOption } from "../../../../types";
import { getErrorMessage } from "../../../../utils/errorMessage";

interface UseSettingsReturn {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  saving: boolean;
  loading: boolean;
  loadingSheets: boolean;
  creditsSheetOptions: SheetOption[];
  paymentsSheetOptions: SheetOption[];
  handleSave: () => Promise<void>;
  openSheetsLink: () => void;
}

export function useSettings(): UseSettingsReturn {
  const [config, setConfig] = useState<AppConfig>({
    spreadsheet_id: "",
    credits_sheet: "",
    payments_sheet: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creditsSheetOptions, setCreditsSheetOptions] = useState<SheetOption[]>(
    [],
  );
  const [paymentsSheetOptions, setPaymentsSheetOptions] = useState<
    SheetOption[]
  >([]);
  const [fetchedSheetsId, setFetchedSheetsId] = useState("");

  const loadingSheets =
    config.spreadsheet_id.length > 5 &&
    config.spreadsheet_id !== fetchedSheetsId;

  useEffect(() => {
    api
      .get<Record<string, string>>("/config")
      .then(({ data }) => {
        setConfig({
          spreadsheet_id: data.spreadsheet_id || "",
          credits_sheet: data.credits_sheet || "",
          payments_sheet: data.payments_sheet || "",
        });
      })
      .catch((err) => {
        console.error("Error fetching config:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const spreadsheetId = config.spreadsheet_id;
    if (spreadsheetId && spreadsheetId.length > 5) {
      api
        .get<{ sheets: string[] }>(
          `/config/sheets?spreadsheetId=${encodeURIComponent(spreadsheetId)}`,
        )
        .then(({ data }) => {
          const options = (data.sheets || []).map((s) => ({
            value: s,
            label: s,
          }));
          setCreditsSheetOptions(options);
          setPaymentsSheetOptions(options);
          setFetchedSheetsId(spreadsheetId);
          setConfig((prev) => ({
            ...prev,
            credits_sheet: "",
            payments_sheet: "",
          }));
        })
        .catch((err) => {
          console.error("Error fetching sheets:", err);
          toast.error(
            "No se pudieron obtener las hojas. Verifica el ID e intenta de nuevo.",
          );
        });
    }
  }, [config.spreadsheet_id]);

  const handleSave = async () => {
    if (!config.spreadsheet_id.trim()) {
      toast.error("Por favor ingresa el ID de la hoja de cálculo");
      return;
    }

    if (!config.credits_sheet || !config.payments_sheet) {
      toast.error("Selecciona las hojas de créditos y pagos");
      return;
    }

    setSaving(true);
    try {
      await api.post("/config", {
        config: {
          spreadsheet_id: config.spreadsheet_id,
          credits_sheet: config.credits_sheet,
          payments_sheet: config.payments_sheet,
        },
      });
      toast.success("Configuración guardada correctamente");
    } catch (err) {
      const errorMessage =
        getErrorMessage(err, "No se pudo guardar la configuración. Verifica tu conexión e intenta de nuevo.");
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const openSheetsLink = () => {
    if (config.spreadsheet_id) {
      window.open(
        `https://docs.google.com/spreadsheets/d/${config.spreadsheet_id}`,
        "_blank",
      );
    }
  };

  return {
    config,
    setConfig,
    saving,
    loading,
    loadingSheets,
    creditsSheetOptions,
    paymentsSheetOptions,
    handleSave,
    openSheetsLink,
  };
}
