
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useMemo } from 'react';
import { currencies, defaultCurrency, type Currency } from '@/config/currencies';

interface CurrencyContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currencyCode: string) => void;
  availableCurrencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(defaultCurrency);

  const setSelectedCurrencyState = (currencyCode: string) => {
    const newCurrency = currencies.find(c => c.code === currencyCode) || defaultCurrency;
    setCurrentCurrency(newCurrency);
  };

  const value = useMemo(() => ({
    selectedCurrency: currentCurrency,
    setSelectedCurrency: setSelectedCurrencyState,
    availableCurrencies: currencies,
  }), [currentCurrency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
