"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (itemId: string) => void; // Pass the item ID to parent
}

export function AddItemToKnowledgebaseModal({
  isOpen,
  onClose,
  onSuccess,
}: AddItemModalProps) {
  const [itemName, setItemName] = useState("");
  const [goederenOmschrijving, setGoederenOmschrijving] = useState("");
  const [goederenCode, setGoederenCode] = useState("");
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/add-to-knowledgebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemName: itemName.trim(),
          goederenOmschrijving: goederenOmschrijving.trim(),
          goederenCode: goederenCode.trim(),
          category: category.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        const addedItemId = data.id;

        setItemName("");
        setGoederenOmschrijving("");
        setGoederenCode("");
        setCategory("");

        setTimeout(() => {
          setSuccess(false);
          if (addedItemId) {
            onSuccess?.(addedItemId); // Pass the ID to parent
          }
          onClose();
        }, 2000);
      } else {
        setError(data.error || "Failed to add item to knowledge base");
      }
    } catch (error) {
      console.error("Add item error:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setItemName("");
      setGoederenOmschrijving("");
      setGoederenCode("");
      setCategory("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Item to Knowledge Base"
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="item-name">
            Item Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="item-name"
            type="text"
            placeholder="Enter item name..."
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goederen-omschrijving">
            Goederen Omschrijving <span className="text-red-500">*</span>
          </Label>
          <Input
            id="goederen-omschrijving"
            type="text"
            placeholder="Enter goederen omschrijving..."
            value={goederenOmschrijving}
            onChange={(e) => setGoederenOmschrijving(e.target.value)}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goederen-code">
            Goederen Code (HS Code) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="goederen-code"
            type="text"
            placeholder="Enter goederen code..."
            value={goederenCode}
            onChange={(e) => setGoederenCode(e.target.value)}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category (Optional)</Label>
          <Input
            id="category"
            type="text"
            placeholder="Enter category..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
            className="w-full"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Item successfully added to knowledge base!
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            disabled={
              isLoading ||
              !itemName.trim() ||
              !goederenOmschrijving.trim() ||
              !goederenCode.trim()
            }
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add to Knowledge Base
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
