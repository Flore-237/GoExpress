import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthManager = {
  // Stocker les informations utilisateur
  setUser: async (userData) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify({
        ...userData,
        isLoggedIn: true,
        lastLoginTime: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('Erreur de stockage utilisateur:', error);
      return false;
    }
  },

  // Récupérer l'utilisateur actuel
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Erreur de récupération utilisateur:', error);
      return null;
    }
  },

  // Vérifier si l'utilisateur est connecté
  isAuthenticated: async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData !== null;
    } catch (error) {
      return false;
    }
  },

  // Déconnexion
  logout: async () => {
    try {
      await AsyncStorage.removeItem('user');
      return true;
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      return false;
    }
  }
};