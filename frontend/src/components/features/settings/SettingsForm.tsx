import { Select } from "antd";
import {
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Link2,
  RefreshCw,
  Save,
  Upload,
} from "lucide-react";
import type { AppConfig, SheetOption } from "../../../types";

interface SettingsFormProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  saving: boolean;
  loadingSheets: boolean;
  creditsSheetOptions: SheetOption[];
  paymentsSheetOptions: SheetOption[];
  onSave: () => Promise<void>;
  onOpenSheetsLink: () => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  note?: string;
}

export function SettingsForm({
  config,
  setConfig,
  saving,
  loadingSheets,
  creditsSheetOptions,
  paymentsSheetOptions,
  onSave,
  onOpenSheetsLink,
  disabled = false,
  title = "Integración con Google Sheets",
  description = "Configura la hoja de cálculo donde se transferirán las ventas",
  note,
}: SettingsFormProps) {
  return (
    <div className="bg-white rounded-b-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      {note && <p className="text-xs text-gray-400 mb-4">{note}</p>}

      <div className="space-y-5">
        <div>
          <label
            htmlFor="spreadsheet-id"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            ID de la Hoja de Cálculo
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={config.spreadsheet_id}
                onChange={(e) =>
                  setConfig({ ...config, spreadsheet_id: e.target.value })
                }
                placeholder="Ej: 1abc123XYZ..."
                disabled={disabled}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </div>
            {config.spreadsheet_id && (
              <button
                type="button"
                onClick={onOpenSheetsLink}
                disabled={disabled}
                className="cursor-pointer px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            El ID está en la URL de tu hoja de cálculo:
            docs.google.com/spreadsheets/d/<strong>ID_AQUI</strong>/edit
          </p>
        </div>

        <div>
          <label
            htmlFor="credits-sheet"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Hoja de Créditos (Consumidores)
          </label>
          <Select
            showSearch
            className="w-full"
            placeholder="Selecciona la hoja de créditos"
            value={config.credits_sheet || undefined}
            onChange={(value) => setConfig({ ...config, credits_sheet: value })}
            options={creditsSheetOptions}
            loading={loadingSheets}
            disabled={disabled || loadingSheets || !config.spreadsheet_id}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            suffixIcon={
              loadingSheets ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FolderOpen className="w-4 h-4 text-gray-400" />
              )
            }
          />
          {!config.spreadsheet_id && (
            <p className="mt-1.5 text-xs text-gray-400">
              Ingresa el ID de la hoja de cálculo primero
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="payments-sheet"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Hoja de Pagos (Emprendedores)
          </label>
          <Select
            showSearch
            className="w-full"
            placeholder="Selecciona la hoja de pagos"
            value={config.payments_sheet || undefined}
            onChange={(value) =>
              setConfig({ ...config, payments_sheet: value })
            }
            options={paymentsSheetOptions}
            loading={loadingSheets}
            disabled={disabled || loadingSheets || !config.spreadsheet_id}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            suffixIcon={
              loadingSheets ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FolderOpen className="w-4 h-4 text-gray-400" />
              )
            }
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={disabled || saving || loadingSheets}
          className="cursor-pointer px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Upload className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Configuración
            </>
          )}
        </button>
      </div>
    </div>
  );
}
