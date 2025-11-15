"use client";

import * as React from "react";
import { Modal } from "./ui/modal";

interface TrackingNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (trackingNumber: string, split: number) => void;
}

export function TrackingNumberModal({
  isOpen,
  onClose,
  onConfirm,
}: TrackingNumberModalProps) {
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [split, setSplit] = React.useState("1");

  const handleConfirm = () => {
    if (trackingNumber.trim()) {
      onConfirm(trackingNumber.trim(), parseInt(split) || 1);
      // Reset fields after confirm
      setTrackingNumber("");
      setSplit("1");
    }
  };

  const handleClose = () => {
    // Reset fields on close
    setTrackingNumber("");
    setSplit("1");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enter Tracking Information"
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="trackingNumber"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Tracking Number <span className="text-red-500">*</span>
          </label>
          <input
            id="trackingNumber"
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter AWB tracking number"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="split"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Split Number <span className="text-red-500">*</span>
          </label>
          <input
            id="split"
            type="number"
            min="1"
            value={split}
            onChange={(e) => setSplit(e.target.value)}
            placeholder="Enter split number"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Split number represents the batch and increments for each tab
          </p>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!trackingNumber.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}
