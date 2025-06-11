import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  // Stocker les données utilisateur
  storeUserData: async (userData) => {
    try {
      // Stockage des données utilisateur et du statut de connexion dans un seul appel
      const dataToStore = {
        ...userData,
        isLoggedIn: true,
        lastLoginTime: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error('Erreur de stockage:', error);
      return false;
    }
  },

  // Récupérer les données utilisateur
  getUserData: async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) return null;
      return JSON.parse(userDataString);
    } catch (error) {
      console.error('Erreur de récupération:', error);
      return null;
    }
  },

  // Vérifier si l'utilisateur est connecté
  isUserLoggedIn: async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) return false;
      const userData = JSON.parse(userDataString);
      return userData?.isLoggedIn === true;
    } catch (error) {
      return false;
    }
  }
};