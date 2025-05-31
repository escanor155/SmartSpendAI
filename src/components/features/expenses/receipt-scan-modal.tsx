
"use client";

import React, { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, UploadCloud, X, Sparkles } from "lucide-react";
import { scanReceipt, type ScanReceiptOutput } from "@/ai/flows/scan-receipt";
import type { ScannedItem } from "@/types"; // Expense type removed, direct save
import { format } from 'date-fns';
import Image from 'next/image';
import { useCurrency } from "@/contexts/currency-context";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ReceiptScanModalProps {
  onOpenChange: (open: boolean) => void;
}

export function ReceiptScanModal({ onOpenChange }: ReceiptScanModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanReceiptOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { selectedCurrency } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();

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
      toast({ variant: "destructive", title: "Scan Error", description: "The AI failed to process the receipt image."});
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmScan = async () => {
    if (!scanResult || !user) {
      if (!user) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "You need to be logged in to save expenses."});
      }
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const expensesToSave = scanResult.items.map((item: ScannedItem) => ({
      userId: user.uid,
      name: item.name,
      price: item.price,
      category: item.category || "Uncategorized",
      date: today,
      storeName: scanResult.storeName,
      brand: item.brand || '', // Ensure brand is not undefined
      receiptImageUrl: previewUrl || undefined, 
      createdAt: serverTimestamp()
    }));

    try {
      const expensesCollectionRef = collection(db, "expenses");
      for (const expense of expensesToSave) {
        await addDoc(expensesCollectionRef, expense);
      }
      toast({ title: "Success", description: `${expensesToSave.length} expenses added from receipt.`});
      onOpenChange(false); // Close modal after confirming
    } catch (e) {
        console.error("Error saving scanned expenses:", e);
        toast({variant: "destructive", title: "Database Error", description: "Could not save scanned expenses."});
    }
  };
  
  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setError(null);
    const fileInput = document.getElementById('receipt-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = ""; 
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Scan Receipt</DialogTitle>
        <DialogDescription>Upload an image of your receipt to automatically extract expense details and categories.</DialogDescription>
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

        {error && !isScanning && ( // Only show manual error if not currently scanning
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
                Review the extracted details below. Categories are AI-suggested.
              </AlertDescription>
            </Alert>
            <div className="max-h-60 overflow-y-auto rounded-md border p-4 space-y-2 text-sm">
              <p><strong>Store:</strong> {scanResult.storeName}</p>
              <p><strong>Total:</strong> {selectedCurrency.symbol}{scanResult.total.toFixed(2)}</p>
              <strong>Items:</strong>
              <ul>
                {scanResult.items.map((item, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>
                      - {item.name} ({selectedCurrency.symbol}{item.price.toFixed(2)}) 
                      {item.brand && ` [${item.brand}]`}
                    </span>
                    <Badge variant={item.category === "Uncategorized" ? "outline" : "secondary"} className="ml-2">
                       {item.category === "Uncategorized" ? null : <Sparkles className="mr-1 h-3 w-3 text-primary" />}
                       {item.category}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => { clearSelection(); onOpenChange(false); }}>Cancel</Button>
        {!scanResult && (
          <Button onClick={handleScan} disabled={!selectedFile || isScanning}>
            {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Scan Receipt
          </Button>
        )}
        {scanResult && (
          <Button onClick={handleConfirmScan} className="bg-primary hover:bg-primary/80" disabled={!user}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirm and Add Expenses
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
