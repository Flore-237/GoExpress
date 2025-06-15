import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthManager } from '../utils/authManager';

export const AuthRequired = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const isAuth = await AuthManager.isAuthenticated();
    setIsAuthenticated(isAuth);
    setIsChecking(false);
    
    if (!isAuth) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };  
  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return isAuthenticated ? children : null;
};