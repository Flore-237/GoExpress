import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, enableNetwork, disableNetwork } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../App';

const { width, height } = Dimensions.get('window');

const ProfileScreen = ({ setIsLoggedIn }) => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [statistics, setStatistics] = useState({
    totalOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0
  });

  // Fonction utilitaire pour retry avec backoff exponentiel
  const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        console.log(`Tentative ${i + 1} échouée:`, error.message);
        
        if (i === maxRetries - 1) {
          throw error;
        }
        
        // Attendre avant la prochaine tentative (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  };

  const getUserDataFromStorage = async () => {
    try {
      const keys = [
        'userId', 'userEmail', 'userFirstName', 'userLastName', 
        'userFullName', 'userPhone', 'userRole', 'userStatus', 
        'userProfileImage', 'userCreatedAt'
      ];
      
      const values = await AsyncStorage.multiGet(keys);
      const userData = {};
      
      values.forEach(([key, value]) => {
        const cleanKey = key.replace('user', '').toLowerCase();
        userData[cleanKey] = value;
      });

      return userData;
    } catch (error) {
      console.error('Erreur lors de la récupération des données locales:', error);
      return null;
    }
  };

  const getUserDataFromFirestore = async (userId) => {
    try {
      return await retryWithBackoff(async () => {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          
          // Sauvegarder en cache local pour utilisation offline
          await AsyncStorage.multiSet([
            ['userEmail', userData.email || ''],
            ['userFirstName', userData.firstName || ''],
            ['userLastName', userData.lastName || ''],
            ['userFullName', userData.fullName || ''],
            ['userPhone', userData.phone || ''],
            ['userRole', userData.role || 'client'],
            ['userStatus', userData.status || 'active'],
            ['userProfileImage', userData.profileImage || ''],
            ['userCreatedAt', userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()],
          ]);

          return userData;
        }
        return null;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des données Firestore:', error);
      setIsOnline(false);
      
      // En cas d'erreur, utiliser les données en cache
      return null;
    }
  };

  const getUserReservationStats = async (userId) => {
    try {
      console.log('Récupération des statistiques pour userId:', userId);
      
      // Essayer de récupérer depuis le cache local d'abord
      const cachedStats = await AsyncStorage.getItem(`userStats_${userId}`);
      if (cachedStats && !isOnline) {
        console.log('Utilisation des statistiques en cache (mode offline)');
        return JSON.parse(cachedStats);
      }

      const stats = await retryWithBackoff(async () => {
        const reservationsRef = collection(db, 'reservations');
        const q = query(reservationsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        
        console.log('Nombre de réservations trouvées:', querySnapshot.size);
        
        let totalOrders = querySnapshot.size;
        let totalSpent = 0;
        let loyaltyPoints = 0;
        
        querySnapshot.forEach((doc) => {
          const reservation = doc.data();
          console.log('Réservation trouvée:', reservation);
          
          const prix = parseFloat(reservation.prixTotal) || parseFloat(reservation.prix) || 0;
          totalSpent += prix;
          loyaltyPoints += Math.floor(prix / 1000);
        });
        
        const calculatedStats = {
          totalOrders,
          totalSpent,
          loyaltyPoints
        };
        
        // Sauvegarder en cache
        await AsyncStorage.setItem(`userStats_${userId}`, JSON.stringify(calculatedStats));
        
        return calculatedStats;
      });

      console.log('Statistiques calculées:', stats);
      setIsOnline(true);
      return stats;
      
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      setIsOnline(false);
      
      // Essayer de récupérer depuis le cache en cas d'erreur
      try {
        const cachedStats = await AsyncStorage.getItem(`userStats_${userId}`);
        if (cachedStats) {
          console.log('Utilisation des statistiques en cache après erreur');
          return JSON.parse(cachedStats);
        }
      } catch (cacheError) {
        console.error('Erreur lors de la récupération du cache:', cacheError);
      }
      
      return {
        totalOrders: 0,
        totalSpent: 0,
        loyaltyPoints: 0
      };
    }
  };

  const checkNetworkConnection = async () => {
    try {
      // Tentative de reconnexion à Firestore
      await enableNetwork(db);
      setIsOnline(true);
      console.log('Connexion Firestore rétablie');
    } catch (error) {
      setIsOnline(false);
      console.log('Toujours hors ligne:', error.message);
    }
  };

  const loadUserProfile = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    
    try {
      let userId = null;
      const localData = await getUserDataFromStorage();
      
      if (localData && localData.id) {
        userId = localData.id;
        
        // Charger d'abord les données locales
        setUserProfile({
          id: localData.id,
          email: localData.email,
          firstName: localData.firstname,
          lastName: localData.lastname,
          fullName: localData.fullname,
          phone: localData.phone,
          role: localData.role,
          status: localData.status,
          profileImage: localData.profileimage,
          createdAt: localData.createdat,
        });

        // Essayer de récupérer les données Firestore en arrière-plan
        const firestoreData = await getUserDataFromFirestore(localData.id);
        
        if (firestoreData) {
          setUserProfile({
            id: firestoreData.uid || firestoreData.id || localData.id,
            email: firestoreData.email,
            firstName: firestoreData.firstName,
            lastName: firestoreData.lastName,
            fullName: firestoreData.fullName,
            phone: firestoreData.phone,
            role: firestoreData.role,
            status: firestoreData.status,
            profileImage: firestoreData.profileImage,
            createdAt: firestoreData.createdAt?.toDate?.()?.toISOString() || firestoreData.createdAt,
          });
        }
      } else {
        const currentUser = auth.currentUser;
        if (currentUser) {
          userId = currentUser.uid;
          const firestoreData = await getUserDataFromFirestore(currentUser.uid);
          if (firestoreData) {
            setUserProfile({
              id: firestoreData.uid || firestoreData.id || currentUser.uid,
              email: firestoreData.email,
              firstName: firestoreData.firstName,
              lastName: firestoreData.lastName,
              fullName: firestoreData.fullName,
              phone: firestoreData.phone,
              role: firestoreData.role,
              status: firestoreData.status,
              profileImage: firestoreData.profileImage,
              createdAt: firestoreData.createdAt?.toDate?.()?.toISOString() || firestoreData.createdAt,
            });
          }
        }
      }
      
      if (userId) {
        console.log('Chargement des statistiques pour:', userId);
        const stats = await getUserReservationStats(userId);
        console.log('Statistiques chargées:', stats);
        setStatistics(stats);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      
      // Ne pas afficher d'alerte si c'est juste un problème de connectivité
      if (!error.message.includes('offline') && !error.message.includes('network')) {
        Alert.alert('Erreur', 'Impossible de charger les informations du profil.');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Vérifier la connexion avant de rafraîchir
    await checkNetworkConnection();
    
    // Attendre un peu pour que la reconnexion se fasse
    setTimeout(() => {
      loadUserProfile(false);
    }, 500);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await auth.signOut();
              
              // Nettoyer le cache
              const keysToRemove = [
                'authToken', 'userId', 'userEmail', 'userFirstName', 
                'userLastName', 'userFullName', 'userPhone', 'userRole', 
                'userStatus', 'userProfileImage', 'userCreatedAt'
              ];
              
              // Ajouter les clés de cache des statistiques
              if (userProfile?.id) {
                keysToRemove.push(`userStats_${userProfile.id}`);
              }
              
              await AsyncStorage.multiRemove(keysToRemove);
              
              if (setIsLoggedIn) {
                setIsLoggedIn(false);
              }
              
              navigation.reset({
                index: 0,
                routes: [{ name: ROUTES.LOGIN }],
              });
              
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter. Réessayez.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date inconnue';
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile', { userProfile });
  };

  const navigateToReservations = () => {
    // Use the full path if it's in a nested navigator
    navigation.navigate('MainStack', {
      screen: 'ReservationHistory'
    });
    
    // Or if it's in the same stack, just use:
    // navigation.navigate('ReservationHistory');
  };

  const handleReservationHistory = () => {
    navigation.navigate('HistoriqueReservation'); // Changez 'MainStack' en 'HistoriqueReservation'
  };

  const handleNavigateToHistory = () => {
    navigation.navigate(ROUTES.RESERVATION_HISTORY);
  };

  if (isLoading && !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
          {!isOnline && (
            <Text style={styles.offlineText}>Mode hors ligne</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="person-circle-outline" size={80} color="#8e8e93" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <Text style={styles.errorSubtitle}>
            Impossible de charger les informations du profil
          </Text>
          {!isOnline && (
            <Text style={styles.offlineText}>
              Vérifiez votre connexion internet
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={() => loadUserProfile()}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Indicateur de connexion */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Icon name="cloud-offline-outline" size={16} color="#ffffff" />
          <Text style={styles.offlineIndicatorText}>Mode hors ligne</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            title={!isOnline ? "Reconnexion..." : "Actualiser"}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="log-out-outline" size={24} color="#ff3b30" />
          </TouchableOpacity>
        </Animatable.View>

        {/* Carte de profil principal */}
        <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {userProfile.profileImage ? (
              <Image
                source={{ uri: userProfile.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {userProfile.firstName?.charAt(0)?.toUpperCase() || '?'}
                  {userProfile.lastName?.charAt(0)?.toUpperCase() || ''}
                </Text>
              </View>
            )}
            <View style={styles.statusBadge}>
              <View style={[
                styles.statusDot,
                { backgroundColor: userProfile.status === 'active' ? '#34c759' : '#ff3b30' }
              ]} />
            </View>
          </View>

          <Text style={styles.fullName}>{userProfile.fullName || 'Nom non défini'}</Text>
          <Text style={styles.email}>{userProfile.email}</Text>
          
          <View style={styles.roleContainer}>
            <Icon 
              name={userProfile.role === 'admin' ? 'shield-checkmark' : 'person'} 
              size={16} 
              color="#007aff" 
            />
            <Text style={styles.roleText}>
              {userProfile.role === 'admin' ? 'Administrateur' : 'Client'}
            </Text>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={navigateToEditProfile}>
            <Icon name="create-outline" size={20} color="#007aff" />
            <Text style={styles.editButtonText}>Modifier le profil</Text>
          </TouchableOpacity>
        </Animatable.View>

        {/* Statistiques */}
        <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.statsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes Statistiques</Text>
            <TouchableOpacity onPress={navigateToReservations}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={navigateToReservations}>
              <Icon name="bag-outline" size={24} color="#007aff" />
              <Text style={styles.statNumber}>{statistics.totalOrders}</Text>
              <Text style={styles.statLabel}>Réservations</Text>
            </TouchableOpacity>
            <View style={styles.statCard}>
              <Icon name="card-outline" size={24} color="#34c759" />
              <Text style={styles.statNumber}>{statistics.totalSpent.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.statLabel}>Dépensé</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="star-outline" size={24} color="#ff9500" />
              <Text style={styles.statNumber}>{statistics.loyaltyPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
          {!isOnline && (
            <Text style={styles.cacheIndicator}>
              * Données en cache (dernière mise à jour)
            </Text>
          )}
        </Animatable.View>

        {/* Informations détaillées */}
        <Animatable.View animation="fadeInUp" duration={800} delay={600} style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <InfoRow 
            icon="person-outline" 
            label="Prénom" 
            value={userProfile.firstName || 'Non défini'} 
          />
          <InfoRow 
            icon="person-outline" 
            label="Nom" 
            value={userProfile.lastName || 'Non défini'} 
          />
          <InfoRow 
            icon="call-outline" 
            label="Téléphone" 
            value={userProfile.phone || 'Non défini'} 
          />
          <InfoRow 
            icon="mail-outline" 
            label="Email" 
            value={userProfile.email} 
          />
          <InfoRow 
            icon="calendar-outline" 
            label="Membre depuis" 
            value={formatDate(userProfile.createdAt)} 
          />
          <InfoRow 
            icon="checkmark-circle-outline" 
            label="Statut" 
            value={userProfile.status === 'active' ? 'Actif' : 'Inactif'}
            valueColor={userProfile.status === 'active' ? '#34c759' : '#ff3b30'}
          />
        </Animatable.View>

        {/* Actions rapides */}
        <Animatable.View animation="fadeInUp" duration={800} delay={800} style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          
          <ActionButton
            icon="ticket-outline"
            title="Mes Réservations"
            subtitle="Voir l'historique des voyages"
            onPress={handleReservationHistory}
          />
          
          {/* Supprimez ou commentez la section paramètres
          <ActionButton
            icon="settings-outline"
            title="Paramètres"
            subtitle="Gérer les préférences"
            onPress={() => navigation.navigate('Settings')}
          />
          */}
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value, valueColor = '#1d1d1f' }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Icon name={icon} size={20} color="#8e8e93" />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
  </View>
);

const ActionButton = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.actionLeft}>
      <View style={styles.actionIconContainer}>
        <Icon name={icon} size={22} color="#007aff" />
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <Icon name="chevron-forward" size={20} color="#c7c7cc" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  offlineIndicator: {
    backgroundColor: '#ff9500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineIndicatorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e93',
  },
  offlineText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ff9500',
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1d1d1f',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  logoutButton: {
    padding: 8,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#f2f2f7',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#f2f2f7',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fullName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: '#8e8e93',
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007aff',
    marginLeft: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007aff',
    marginLeft: 8,
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  seeAllText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#ffffff',
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d1d1f',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  cacheIndicator: {
    fontSize: 12,
    color: '#ff9500',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  detailsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: '#8e8e93',
    marginLeft: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  actionsContainer: {
    marginHorizontal: 20,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
  },
});

export default ProfileScreen;