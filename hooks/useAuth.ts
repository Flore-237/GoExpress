import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
  const storeUserSession = async (userData) => {
    try {
      await AsyncStorage.multiSet([
        ['userData', JSON.stringify(userData)],
        ['isLoggedIn', 'true'],
      ]);
      return true;
    } catch (error) {
      console.error('Erreur de stockage des données:', error);
      return false;
    }
  };

  const getUserSession = async () => {
    try {
      const [userDataString, isLoggedIn] = await AsyncStorage.multiGet([
        'userData',
        'isLoggedIn'
      ]);
      
      return {
        userData: userDataString[1] ? JSON.parse(userDataString[1]) : null,
        isLoggedIn: isLoggedIn[1] === 'true'
      };
    } catch (error) {
      console.error('Erreur de récupération des données:', error);
      return { userData: null, isLoggedIn: false };
    }
  };

  const clearUserSession = async () => {
    try {
      await AsyncStorage.multiRemove(['userData', 'isLoggedIn']);
      return true;
    } catch (error) {
      console.error('Erreur de suppression des données:', error);
      return false;
    }
  };

  return {
    storeUserSession,
    getUserSession,
    clearUserSession
  };
};