import React from "react";
import { Progress } from "../../../components/ui/progress";
import { FileText, Cog, CheckCircle2 } from "lucide-react";

interface ProgressData {
  type: "progress" | "complete" | "error";
  currentStep?: string;
  totalPDFs?: number;
  processedPDFs?: number;
  currentPDF?: string;
  totalProducts?: number;
  processedProducts?: number;
  error?: string;
}

interface ArubaProgressProps {
  progress: ProgressData;
  isVisible: boolean;
}

export function ArubaProgress({ progress, isVisible }: ArubaProgressProps) {
  if (!isVisible) return null;

  const getProgressPercentage = () => {
    if (progress.type === "complete") return 100;
    if (progress.type === "error") return 0;

    if (progress.totalPDFs && progress.processedPDFs !== undefined) {
      return Math.round((progress.processedPDFs / progress.totalPDFs) * 100);
    }

    return 0;
  };

  const getProcessingStats = () => {
    if (progress.type === "complete") {
      return {
        pdfs: `${progress.totalPDFs || 0}/${progress.totalPDFs || 0}`,
        percentage: 100,
      };
    }

    const processed = progress.processedPDFs || 0;
    const total = progress.totalPDFs || 0;

    return {
      pdfs: `${processed}/${total}`,
      percentage: total > 0 ? Math.round((processed / total) * 100) : 0,
    };
  };

  const getStatusIcon = () => {
    switch (progress.type) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "error":
        return <FileText className="w-5 h-5 text-red-600" />;
      default:
        return <Cog className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.type) {
      case "complete":
        return "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800";
      case "error":
        return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800";
      default:
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800";
    }
  };

  return (
    <div
      className={`w-full p-6 rounded-lg border ${getStatusColor()} transition-all duration-300`}
    >
      <div className="space-y-4">
        {/* Header with icon and status */}
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="font-medium text-sm">
              {progress.type === "complete"
                ? "Processing Complete!"
                : progress.type === "error"
                ? "Processing Error"
                : "Processing Aruba Invoices"}
            </h3>
            {progress.currentStep && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {progress.currentStep}
              </p>
            )}
            {progress.currentPDF && progress.type === "progress" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Current: {progress.currentPDF}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progress.type !== "error" && (
          <div className="space-y-2">
            <Progress value={getProgressPercentage()} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {progress.processedPDFs !== undefined && progress.totalPDFs
                  ? `PDF ${Math.min(
                      progress.processedPDFs + 1,
                      progress.totalPDFs
                    )} of ${progress.totalPDFs}`
                  : "Initializing..."}
              </span>
              <span>{getProcessingStats().percentage}%</span>
            </div>
          </div>
        )}

        {/* PDF/Product counters */}
        {(progress.totalPDFs || progress.totalProducts) && (
          <div className="flex gap-4 text-sm">
            {progress.totalPDFs && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border">
                <FileText className="w-3 h-3" />
                <span>
                  PDFs: {progress.processedPDFs || 0}/{progress.totalPDFs}
                </span>
              </div>
            )}
            {progress.totalProducts && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border">
                <Cog className="w-3 h-3" />
                <span>
                  Products: {progress.processedProducts || 0}/
                  {progress.totalProducts}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {progress.type === "error" && progress.error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
            {progress.error}
          </div>
        )}
      </div>
    </div>
  );
}
