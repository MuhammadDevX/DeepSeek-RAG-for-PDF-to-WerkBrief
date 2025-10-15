"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";
import { UploadProgress } from "@/lib/upload-utils";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface ProgressData {
  type: "progress" | "complete" | "error";
  totalDocuments?: number;
  processedDocuments?: number;
  totalProducts?: number;
  processedProducts?: number;
  currentStep?: string;
  data?: Werkbrief;
  error?: string;
}

interface DeletedRow {
  data: Werkbrief["fields"][0];
  checked: boolean;
  index: number;
}

interface DeletedBatch {
  rows: DeletedRow[];
  timestamp: number;
}

interface WerkbriefContextType {
  // Core state
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  result: Werkbrief | null;
  setResult: (result: Werkbrief | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  copied: boolean;
  setCopied: (copied: boolean) => void;
  progress: ProgressData | null;
  setProgress: (progress: ProgressData | null) => void;
  useStreaming: boolean;
  setUseStreaming: (useStreaming: boolean) => void;
  lastFileKey: string | undefined;
  setLastFileKey: (fileKey: string | undefined) => void;

  // Upload progress state
  uploadProgress: UploadProgress | null;
  setUploadProgress: (progress: UploadProgress | null) => void;
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;

  // UI state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  sortConfig: {
    key: keyof Werkbrief["fields"][0] | null;
    direction: "asc" | "desc";
  };
  setSortConfig: (
    config:
      | {
          key: keyof Werkbrief["fields"][0] | null;
          direction: "asc" | "desc";
        }
      | ((prev: {
          key: keyof Werkbrief["fields"][0] | null;
          direction: "asc" | "desc";
        }) => {
          key: keyof Werkbrief["fields"][0] | null;
          direction: "asc" | "desc";
        })
  ) => void;
  isTableExpanded: boolean;
  setIsTableExpanded: (
    expanded: boolean | ((prev: boolean) => boolean)
  ) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean | ((prev: boolean) => boolean)) => void;
  isTableLoading: boolean;
  setIsTableLoading: (loading: boolean) => void;
  bulkSelectAll: boolean;
  setBulkSelectAll: (select: boolean | ((prev: boolean) => boolean)) => void;
  isUploadSectionCollapsed: boolean;
  setIsUploadSectionCollapsed: (collapsed: boolean) => void;

  // Delete mode state
  isDeleteMode: boolean;
  setIsDeleteMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
  selectedForDeletion: boolean[];
  setSelectedForDeletion: (
    selected: boolean[] | ((prev: boolean[]) => boolean[])
  ) => void;
  deleteSelectAll: boolean;
  setDeleteSelectAll: (select: boolean | ((prev: boolean) => boolean)) => void;

  // Merge mode state
  isMergeMode: boolean;
  setIsMergeMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
  selectedForMerge: boolean[];
  setSelectedForMerge: (
    selected: boolean[] | ((prev: boolean[]) => boolean[])
  ) => void;
  mergeSelectAll: boolean;
  setMergeSelectAll: (select: boolean | ((prev: boolean) => boolean)) => void;

  // Deleted rows state
  deletedRows: DeletedBatch[];
  setDeletedRows: (
    rows: DeletedBatch[] | ((prev: DeletedBatch[]) => DeletedBatch[])
  ) => void;
  showUndoNotification: boolean;
  setShowUndoNotification: (
    show: boolean | ((prev: boolean) => boolean)
  ) => void;

  // Edited data
  editedFields: Werkbrief["fields"];
  setEditedFields: (
    fields:
      | Werkbrief["fields"]
      | ((prev: Werkbrief["fields"]) => Werkbrief["fields"])
  ) => void;
  checkedFields: boolean[];
  setCheckedFields: (
    fields: boolean[] | ((prev: boolean[]) => boolean[])
  ) => void;

  // Auto-collapse tracking
  hasAutoCollapsed: React.MutableRefObject<boolean>;

  // Reset function for clearing all data
  resetAllState: () => void;
}

const WerkbriefContext = createContext<WerkbriefContextType | undefined>(
  undefined
);

export const useWerkbrief = () => {
  const context = useContext(WerkbriefContext);
  if (context === undefined) {
    throw new Error("useWerkbrief must be used within a WerkbriefProvider");
  }
  return context;
};

interface WerkbriefProviderProps {
  children: React.ReactNode;
}

export const WerkbriefProvider: React.FC<WerkbriefProviderProps> = ({
  children,
}) => {
  // Ref to track if we've already auto-collapsed the upload section
  const hasAutoCollapsed = useRef(false);

  // Core state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Werkbrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [lastFileKey, setLastFileKey] = useState<string | undefined>(undefined);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);

  // UI state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Werkbrief["fields"][0] | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const [bulkSelectAll, setBulkSelectAll] = useState<boolean>(false);
  const [isUploadSectionCollapsed, setIsUploadSectionCollapsed] =
    useState<boolean>(false);

  // Delete mode state
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<boolean[]>([]);
  const [deleteSelectAll, setDeleteSelectAll] = useState<boolean>(false);

  // Merge mode state
  const [isMergeMode, setIsMergeMode] = useState<boolean>(false);
  const [selectedForMerge, setSelectedForMerge] = useState<boolean[]>([]);
  const [mergeSelectAll, setMergeSelectAll] = useState<boolean>(false);

  // Deleted rows state
  const [deletedRows, setDeletedRows] = useState<DeletedBatch[]>([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

  // Edited data
  const [editedFields, setEditedFields] = useState<Werkbrief["fields"]>([]);
  const [checkedFields, setCheckedFields] = useState<boolean[]>([]);

  // Reset function for clearing all data
  const resetAllState = useCallback(() => {
    setPdfFile(null);
    setLoading(false);
    setResult(null);
    setError(null);
    setCopied(false);
    setProgress(null);
    setUseStreaming(true);
    setLastFileKey(undefined);
    setUploadProgress(null);
    setIsUploading(false);
    setSearchTerm("");
    setCurrentPage(1);
    setItemsPerPage(50);
    setSortConfig({ key: null, direction: "asc" });
    setIsTableExpanded(false);
    setShowFilters(true);
    setIsTableLoading(false);
    setBulkSelectAll(false);
    setIsUploadSectionCollapsed(false);
    setIsDeleteMode(false);
    setSelectedForDeletion([]);
    setDeleteSelectAll(false);
    setIsMergeMode(false);
    setSelectedForMerge([]);
    setMergeSelectAll(false);
    setDeletedRows([]);
    setShowUndoNotification(false);
    setEditedFields([]);
    setCheckedFields([]);
    hasAutoCollapsed.current = false;
  }, []);

  const contextValue = useMemo(
    () => ({
      // Core state
      pdfFile,
      setPdfFile,
      loading,
      setLoading,
      result,
      setResult,
      error,
      setError,
      copied,
      setCopied,
      progress,
      setProgress,
      useStreaming,
      setUseStreaming,
      lastFileKey,
      setLastFileKey,

      // Upload progress state
      uploadProgress,
      setUploadProgress,
      isUploading,
      setIsUploading,

      // UI state
      searchTerm,
      setSearchTerm,
      currentPage,
      setCurrentPage,
      itemsPerPage,
      setItemsPerPage,
      sortConfig,
      setSortConfig,
      isTableExpanded,
      setIsTableExpanded,
      showFilters,
      setShowFilters,
      isTableLoading,
      setIsTableLoading,
      bulkSelectAll,
      setBulkSelectAll,
      isUploadSectionCollapsed,
      setIsUploadSectionCollapsed,

      // Delete mode state
      isDeleteMode,
      setIsDeleteMode,
      selectedForDeletion,
      setSelectedForDeletion,
      deleteSelectAll,
      setDeleteSelectAll,

      // Merge mode state
      isMergeMode,
      setIsMergeMode,
      selectedForMerge,
      setSelectedForMerge,
      mergeSelectAll,
      setMergeSelectAll,

      // Deleted rows state
      deletedRows,
      setDeletedRows,
      showUndoNotification,
      setShowUndoNotification,

      // Edited data
      editedFields,
      setEditedFields,
      checkedFields,
      setCheckedFields,

      // Auto-collapse tracking
      hasAutoCollapsed,

      // Reset function
      resetAllState,
    }),
    [
      pdfFile,
      loading,
      result,
      error,
      copied,
      progress,
      useStreaming,
      lastFileKey,
      uploadProgress,
      isUploading,
      searchTerm,
      currentPage,
      itemsPerPage,
      sortConfig,
      isTableExpanded,
      showFilters,
      isTableLoading,
      bulkSelectAll,
      isUploadSectionCollapsed,
      isDeleteMode,
      selectedForDeletion,
      deleteSelectAll,
      isMergeMode,
      selectedForMerge,
      mergeSelectAll,
      deletedRows,
      showUndoNotification,
      editedFields,
      checkedFields,
      resetAllState,
    ]
  );

  return (
    <WerkbriefContext.Provider value={contextValue}>
      {children}
    </WerkbriefContext.Provider>
  );
};
