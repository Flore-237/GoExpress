import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // Assurez-vous d'avoir installé react-native-vector-icons

export const fetchWithRetry = async (collectionName: string, docId: string, maxRetries = 3) => {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      if (!db) {
        throw new Error('Firestore instance not initialized');
      }

      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Cache the data
        await AsyncStorage.setItem(`cached_data_${docId}`, JSON.stringify(docSnap.data()));
        return docSnap.data();
      }
      return null;
      
    } catch (error) {
      attempt++;
      console.log(`Tentative ${attempt} échouée: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Attendre avant la prochaine tentative (1s, 2s, 4s...)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  offlineText: {
    color: '#92400E',
    fontSize: 12,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  }
});

export const getOfflineData = async (docId: string) => {
  try {
    const cachedData = await AsyncStorage.getItem(`cached_data_${docId}`);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('Error getting offline data:', error);
    return null;
  }
};

export const fetchUserReservations = async (userId: string) => {
  try {
    const reservationsRef = collection(db, 'reservations');
    const q = query(
      reservationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const reservations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Cache the results
    await AsyncStorage.setItem(
      `reservations_${userId}`,
      JSON.stringify(reservations)
    );

    return reservations;

  } catch (error) {
    console.error('Erreur réservations:', error);
    // Fallback to cached data
    const cached = await AsyncStorage.getItem(`reservations_${userId}`);
    return cached ? JSON.parse(cached) : [];
  }
};

// Dans votre composant qui fait les appels Firestore
import { fetchWithRetry, getOfflineData } from '../utils/firebase-helpers';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const YourComponent = () => {
  const navigation = useNavigation();
  
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback to home screen if can't go back
      navigation.navigate(ROUTES.HOME);
    }
  };

  const [isOffline, setIsOffline] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = async (userId: string) => {
    try {
      setIsOffline(false);
      const result = await fetchWithRetry('users', userId);
      if (result) {
        setData(result);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données Firestore:', error);
      setIsOffline(true);
      
      const offlineData = await getOfflineData(userId);
      if (offlineData) {
        setData(offlineData);
      }
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData(userId);
    }
  }, [userId]);

  // Ajouter un indicateur de mode hors ligne dans l'UI
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        {/* ...rest of your header */}
      </View>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Mode hors ligne - Certaines fonctionnalités peuvent être limitées
          </Text>
        </View>
      )}
      {/* Le reste de votre composant */}
    </View>
  );
};

export default YourComponent;