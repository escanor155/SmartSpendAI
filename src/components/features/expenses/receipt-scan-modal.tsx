"use client";

import React, { useState, useCallback } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, UploadCloud, X } from "lucide-react";
import { scanReceipt, type ScanReceiptOutput } from "@/ai/flows/scan-receipt";
import type { Expense, ScannedItem } from "@/types";
import { format } from 'date-fns';
import Image from 'next/image';

interface ReceiptScanModalProps {
  onReceiptScanned: (expenses: Expense[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptScanModal({ onReceiptScanned, onOpenChange }: ReceiptScanModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanReceiptOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setScanResult(null);
      setError(null);
    }
  };

  const convertFileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const receiptDataUri = await convertFileToDataUri(selectedFile);
      const result = await scanReceipt({ receiptDataUri });
      setScanResult(result);
    } catch (err) {
      console.error("Error scanning receipt:", err);
      setError("Failed to scan receipt. Please try again or enter manually.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmScan = () => {
    if (!scanResult) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const expenses: Expense[] = scanResult.items.map((item: ScannedItem, index: number) => ({
      id: `scanned-${Date.now()}-${index}`,
      name: item.name,
      price: item.price,
      category: "Uncategorized", // User can categorize later or AI can suggest
      date: today,
      storeName: scanResult.storeName,
      brand: item.brand,
      receiptImageUrl: previewUrl || undefined, // Storing preview for potential display
    }));
    onReceiptScanned(expenses);
  };
  
  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setError(null);
    const fileInput = document.getElementById('receipt-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = ""; // Reset file input
    }
  };


  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Scan Receipt</DialogTitle>
        <DialogDescription>Upload an image of your receipt to automatically extract expense details.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {!scanResult && (
          <div className="space-y-2">
            <Label htmlFor="receipt-upload">Upload Receipt Image</Label>
            <div className="flex items-center gap-2">
                 <Input id="receipt-upload" type="file" accept="image/*" onChange={handleFileChange} className="flex-grow"/>
                 {selectedFile && (
                    <Button variant="ghost" size="icon" onClick={clearSelection} aria-label="Clear selection">
                        <X className="h-4 w-4" />
                    </Button>
                 )}
            </div>

            {previewUrl && (
              <div className="mt-2 border rounded-md p-2 flex justify-center items-center max-h-60 overflow-hidden">
                <Image src={previewUrl} alt="Receipt preview" width={200} height={200} style={{ objectFit: 'contain' }} data-ai-hint="receipt bill" />
              </div>
            )}
          </div>
        )}

        {isScanning && (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
            <p className="text-lg">Scanning receipt...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Scan Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {scanResult && (
          <div className="space-y-4">
            <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
               <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
               <AlertTitle className="text-green-700 dark:text-green-300">Scan Successful!</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                Review the extracted details below.
              </AlertDescription>
            </Alert>
            <div className="max-h-60 overflow-y-auto rounded-md border p-4 space-y-2 text-sm">
              <p><strong>Store:</strong> {scanResult.storeName}</p>
              <p><strong>Total:</strong> ${scanResult.total.toFixed(2)}</p>
              <strong>Items:</strong>
              <ul>
                {scanResult.items.map((item, index) => (
                  <li key={index}>- {item.name} (${item.price.toFixed(2)}) {item.brand && `[${item.brand}]`}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        {!scanResult && (
          <Button onClick={handleScan} disabled={!selectedFile || isScanning}>
            {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Scan Receipt
          </Button>
        )}
        {scanResult && (
          <Button onClick={handleConfirmScan} className="bg-primary hover:bg-primary/80">
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirm and Add Expenses
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
