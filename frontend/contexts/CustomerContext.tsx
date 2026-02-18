import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyalty_points: number;
  total_bookings: number;
  referral_code: string;
  token?: string;
}

interface CustomerContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (phone: string) => Promise<void>;
  register: (name: string, phone: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Customer>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/customers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Giriş başarısız');
      }

      const data = await response.json();
      const customerData: Customer = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        loyalty_points: data.loyalty_points || 0,
        total_bookings: data.total_bookings || 0,
        referral_code: data.referral_code || '',
        token: data.token,
      };

      await AsyncStorage.setItem('customer_data', JSON.stringify(customerData));
      setCustomer(customerData);
      setIsAuthenticated(true);
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (name: string, phone: string, email?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Kayıt başarısız');
      }

      const data = await response.json();
      const customerData: Customer = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        loyalty_points: data.loyalty_points || 0,
        total_bookings: data.total_bookings || 0,
        referral_code: data.referral_code || '',
        token: data.token,
      };

      await AsyncStorage.setItem('customer_data', JSON.stringify(customerData));
      setCustomer(customerData);
      setIsAuthenticated(true);
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('customer_data');
    setCustomer(null);
    setIsAuthenticated(false);
  };

  const refreshProfile = async () => {
    if (!customer?.phone) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/customers/profile?phone=${encodeURIComponent(customer.phone)}`);
      if (response.ok) {
        const data = await response.json();
        const updatedCustomer: Customer = {
          ...customer,
          loyalty_points: data.loyalty_points || 0,
          total_bookings: data.total_bookings || 0,
          referral_code: data.referral_code || '',
        };
        await AsyncStorage.setItem('customer_data', JSON.stringify(updatedCustomer));
        setCustomer(updatedCustomer);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
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
      value={{ 
        customer, 
        isAuthenticated, 
        loading,
        login, 
        register, 
        logout, 
        updateProfile,
        refreshProfile 
      }}
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
