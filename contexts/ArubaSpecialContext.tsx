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
import { ArubaSpecialSchema } from "@/lib/ai/schema";
import { UploadProgress } from "@/lib/upload-utils";

type ArubaSpecial = z.infer<typeof ArubaSpecialSchema>;
type ArubaField = ArubaSpecial["groups"][0]["fields"][0];

interface ProgressData {
  type: "progress" | "complete" | "error";
  currentStep?: string;
  totalPDFs?: number;
  processedPDFs?: number;
  currentPDF?: string;
  totalProducts?: number;
  processedProducts?: number;
  data?: ArubaSpecial;
  error?: string;
}

interface DeletedRow {
  data: ArubaField;
  checked: boolean;
  globalIndex: number;
  groupIndex: number;
  clientName: string;
}

interface DeletedBatch {
  rows: DeletedRow[];
  timestamp: number;
}

interface ArubaSpecialContextType {
  // Core state
  pdfFiles: File[];
  setPdfFiles: (files: File[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  result: ArubaSpecial | null;
  setResult: (result: ArubaSpecial | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  copied: boolean;
  setCopied: (copied: boolean) => void;
  progress: ProgressData | null;
  setProgress: (progress: ProgressData | null) => void;
  useStreaming: boolean;
  setUseStreaming: (useStreaming: boolean) => void;
  lastFileKeys: string[];
  setLastFileKeys: (fileKeys: string[]) => void;

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
    key: keyof ArubaField | null;
    direction: "asc" | "desc";
  };
  setSortConfig: (
    config:
      | {
          key: keyof ArubaField | null;
          direction: "asc" | "desc";
        }
      | ((prev: {
          key: keyof ArubaField | null;
          direction: "asc" | "desc";
        }) => {
          key: keyof ArubaField | null;
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

  // Collapse/Expand groups
  collapsedGroups: Set<string>;
  setCollapsedGroups: (
    groups: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void;
  toggleGroupCollapse: (clientName: string) => void;

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
  editedGroups: ArubaSpecial["groups"];
  setEditedGroups: (
    groups:
      | ArubaSpecial["groups"]
      | ((prev: ArubaSpecial["groups"]) => ArubaSpecial["groups"])
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

const ArubaSpecialContext = createContext<ArubaSpecialContextType | undefined>(
  undefined
);

export const useArubaSpecial = () => {
  const context = useContext(ArubaSpecialContext);
  if (context === undefined) {
    throw new Error(
      "useArubaSpecial must be used within an ArubaSpecialProvider"
    );
  }
  return context;
};

interface ArubaSpecialProviderProps {
  children: React.ReactNode;
}

export const ArubaSpecialProvider: React.FC<ArubaSpecialProviderProps> = ({
  children,
}) => {
  const hasAutoCollapsed = useRef(false);

  // Core state
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ArubaSpecial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [lastFileKeys, setLastFileKeys] = useState<string[]>([]);

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
    key: keyof ArubaField | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [bulkSelectAll, setBulkSelectAll] = useState(false);
  const [isUploadSectionCollapsed, setIsUploadSectionCollapsed] =
    useState(false);

  // Collapse/Expand groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  const toggleGroupCollapse = useCallback((clientName: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
  }, []);

  // Delete mode state
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<boolean[]>([]);
  const [deleteSelectAll, setDeleteSelectAll] = useState(false);

  // Merge mode state
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<boolean[]>([]);
  const [mergeSelectAll, setMergeSelectAll] = useState(false);

  // Deleted rows state
  const [deletedRows, setDeletedRows] = useState<DeletedBatch[]>([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

  // Edited data
  const [editedGroups, setEditedGroups] = useState<ArubaSpecial["groups"]>([]);
  const [checkedFields, setCheckedFields] = useState<boolean[]>([]);

  // Initialize edited groups and checked fields when result changes
  React.useEffect(() => {
    if (result) {
      setEditedGroups(result.groups);
      const totalFields = result.groups.reduce(
        (sum, group) => sum + group.fields.length,
        0
      );
      setCheckedFields(new Array(totalFields).fill(true));
      setSelectedForDeletion(new Array(totalFields).fill(false));
      setSelectedForMerge(new Array(totalFields).fill(false));
    }
  }, [result]);

  const resetAllState = useCallback(() => {
    setPdfFiles([]);
    setLoading(false);
    setResult(null);
    setError(null);
    setCopied(false);
    setProgress(null);
    setLastFileKeys([]);
    setUploadProgress(null);
    setIsUploading(false);
    setSearchTerm("");
    setCurrentPage(1);
    setSortConfig({ key: null, direction: "asc" });
    setIsTableExpanded(false);
    setShowFilters(false);
    setIsTableLoading(false);
    setBulkSelectAll(false);
    setIsUploadSectionCollapsed(false);
    setCollapsedGroups(new Set());
    setIsDeleteMode(false);
    setSelectedForDeletion([]);
    setDeleteSelectAll(false);
    setIsMergeMode(false);
    setSelectedForMerge([]);
    setMergeSelectAll(false);
    setDeletedRows([]);
    setShowUndoNotification(false);
    setEditedGroups([]);
    setCheckedFields([]);
    hasAutoCollapsed.current = false;
  }, []);

  const value = useMemo(
    () => ({
      pdfFiles,
      setPdfFiles,
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
      lastFileKeys,
      setLastFileKeys,
      uploadProgress,
      setUploadProgress,
      isUploading,
      setIsUploading,
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
      collapsedGroups,
      setCollapsedGroups,
      toggleGroupCollapse,
      isDeleteMode,
      setIsDeleteMode,
      selectedForDeletion,
      setSelectedForDeletion,
      deleteSelectAll,
      setDeleteSelectAll,
      isMergeMode,
      setIsMergeMode,
      selectedForMerge,
      setSelectedForMerge,
      mergeSelectAll,
      setMergeSelectAll,
      deletedRows,
      setDeletedRows,
      showUndoNotification,
      setShowUndoNotification,
      editedGroups,
      setEditedGroups,
      checkedFields,
      setCheckedFields,
      hasAutoCollapsed,
      resetAllState,
    }),
    [
      pdfFiles,
      loading,
      result,
      error,
      copied,
      progress,
      useStreaming,
      lastFileKeys,
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
      collapsedGroups,
      toggleGroupCollapse,
      isDeleteMode,
      selectedForDeletion,
      deleteSelectAll,
      isMergeMode,
      selectedForMerge,
      mergeSelectAll,
      deletedRows,
      showUndoNotification,
      editedGroups,
      checkedFields,
      resetAllState,
    ]
  );

  return (
    <ArubaSpecialContext.Provider value={value}>
      {children}
    </ArubaSpecialContext.Provider>
  );
};
