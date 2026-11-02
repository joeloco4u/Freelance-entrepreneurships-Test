import { CreditCard, FileSpreadsheet, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../login/hooks/useAuth";
import { useSettings } from "./hooks/useSettings";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { SettingsForm } from "./SettingsForm";
import { SettingsHelper } from "./SettingsHelper";
import { SettingsSkeleton } from "./SettingsSkeleton";
import PaymentDataForm from "./PaymentDataForm";

export default function Settings() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["IT", "ADMIN"]);
  const [activeTab, setActiveTab] = useState("general");

  const {
    config,
    setConfig,
    saving,
    loading,
    loadingSheets,
    creditsSheetOptions,
    paymentsSheetOptions,
    handleSave,
    openSheetsLink,
  } = useSettings();

  const tabs = [
    {
      key: "general",
      label: "Configuración General",
      icon: SettingsIcon,
      content: <PasswordChangeForm />,
    },
    {
      key: "payment",
      label: "Datos de Pago",
      icon: CreditCard,
      content: <PaymentDataForm />,
    },
    ...(isAdmin
      ? [
          {
            key: "sheets",
            label: "Hoja de Administración",
            icon: FileSpreadsheet,
            content: (
              <>
                <SettingsForm
                  config={config}
                  setConfig={setConfig}
                  saving={saving}
                  loadingSheets={loadingSheets}
                  creditsSheetOptions={creditsSheetOptions}
                  paymentsSheetOptions={paymentsSheetOptions}
                  onSave={handleSave}
                  onOpenSheetsLink={openSheetsLink}
                />
                <SettingsHelper />
                <div className="border-t border-gray-100">
                  <div className="px-6 pt-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wide">
                      Grano de Oro
                    </span>
                  </div>
                  <SettingsForm
                    disabled
                    config={{
                      spreadsheet_id: "",
                      credits_sheet: "",
                      payments_sheet: "",
                    }}
                    setConfig={() => undefined}
                    saving={false}
                    loadingSheets={false}
                    creditsSheetOptions={[]}
                    paymentsSheetOptions={[]}
                    onSave={async () => undefined}
                    onOpenSheetsLink={() => undefined}
                    title="Sede Grano de Oro"
                    note="Configuración pendiente de aprobación por Administración."
                  />
                </div>
              </>
            ),
          },
        ]
      : []),
  ];

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="pb-20">
      <div className="flex gap-1 -mb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`group flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer rounded-t-xl border-b-2 ${
                isActive
                  ? "bg-white text-primary border-primary shadow-[0_0_12px_rgba(25,106,227,0.3)] relative z-10"
                  : "text-gray-500 hover:text-primary border-transparent hover:border-primary/30 hover:shadow-[0_0_8px_rgba(25,106,227,0.15)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-b-2xl shadow-sm">
        {tabs.find((tab) => tab.key === activeTab)?.content}
      </div>
    </div>
  );
}
