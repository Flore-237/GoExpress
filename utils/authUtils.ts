import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkAuthStatus = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Erreur de vérification auth:', error);
    return null;
  }
};

export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem('userData', JSON.stringify({
      ...userData,
      isAuthenticated: true
    }));
    return true;
  } catch (error) {
    console.error('Erreur de sauvegarde:', error);
    return false;
  }
};