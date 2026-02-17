import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface CustomerContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  login: (phone: string, name: string) => Promise<void>;
  register: (name: string, phone: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Customer>) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, []);

  const loadCustomer = async () => {
    try {
      const savedCustomer = await AsyncStorage.getItem('customer_data');
      if (savedCustomer) {
        const customerData = JSON.parse(savedCustomer);
        setCustomer(customerData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const login = async (phone: string, name: string) => {
    const customerData: Customer = {
      id: Date.now().toString(),
      phone,
      name,
    };
    
    await AsyncStorage.setItem('customer_data', JSON.stringify(customerData));
    setCustomer(customerData);
    setIsAuthenticated(true);
  };

  const register = async (name: string, phone: string, email?: string) => {
    const customerData: Customer = {
      id: Date.now().toString(),
      name,
      phone,
      email,
    };
    
    await AsyncStorage.setItem('customer_data', JSON.stringify(customerData));
    setCustomer(customerData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('customer_data');
    setCustomer(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (data: Partial<Customer>) => {
    if (customer) {
      const updatedCustomer = { ...customer, ...data };
      await AsyncStorage.setItem('customer_data', JSON.stringify(updatedCustomer));
      setCustomer(updatedCustomer);
    }
  };

  return (
    <CustomerContext.Provider
      value={{ customer, isAuthenticated, login, register, logout, updateProfile }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
