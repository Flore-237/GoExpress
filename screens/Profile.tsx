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
import { auth, db } from '../screens/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../App';

const { width, height } = Dimensions.get('window');

const ProfileScreen = ({ setIsLoggedIn }) => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState({
    totalOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0
  });

  // Fonction pour récupérer les données utilisateur depuis AsyncStorage
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

  // Fonction pour récupérer les données depuis Firestore
  const getUserDataFromFirestore = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Mettre à jour les données locales
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
    } catch (error) {
      console.error('Erreur lors de la récupération des données Firestore:', error);
      return null;
    }
  };

  // Fonction principale pour charger le profil utilisateur
  const loadUserProfile = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    
    try {
      // Récupérer d'abord les données locales
      const localData = await getUserDataFromStorage();
      
      if (localData && localData.id) {
        // Afficher les données locales immédiatement
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

        // Puis récupérer les données à jour depuis Firestore
        const firestoreData = await getUserDataFromFirestore(localData.id);
        
        if (firestoreData) {
          setUserProfile({
            id: firestoreData.uid || firestoreData.id,
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

          // Mettre à jour les statistiques si disponibles
          if (firestoreData.statistics) {
            setStatistics(firestoreData.statistics);
          }
        }
      } else {
        // Si pas de données locales, essayer de récupérer depuis Firebase Auth
        const currentUser = auth.currentUser;
        if (currentUser) {
          const firestoreData = await getUserDataFromFirestore(currentUser.uid);
          if (firestoreData) {
            setUserProfile({
              id: firestoreData.uid || firestoreData.id,
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
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations du profil.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction de rafraîchissement
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserProfile(false);
  }, []);

  // Fonction de déconnexion
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
              
              // Déconnexion Firebase
              await auth.signOut();
              
              // Nettoyer AsyncStorage
              await AsyncStorage.multiRemove([
                'authToken', 'userId', 'userEmail', 'userFirstName', 
                'userLastName', 'userFullName', 'userPhone', 'userRole', 
                'userStatus', 'userProfileImage', 'userCreatedAt'
              ]);
              
              // Mettre à jour l'état d'authentification
              if (setIsLoggedIn) {
                setIsLoggedIn(false);
              }
              
              // Redirection vers la page de connexion
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

  // Fonction pour formater la date
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

  // Charger le profil au montage du composant
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  // Fonction pour naviguer vers l'édition du profil
  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile', { userProfile });
  };

  // Composant de chargement
  if (isLoading && !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Composant d'erreur si pas de données utilisateur
  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="person-circle-outline" size={80} color="#8e8e93" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <Text style={styles.errorSubtitle}>
            Impossible de charger les informations du profil
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadUserProfile()}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Icon name="bag-outline" size={24} color="#007aff" />
              <Text style={styles.statNumber}>{statistics.totalOrders}</Text>
              <Text style={styles.statLabel}>Reservations</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="card-outline" size={24} color="#34c759" />
              <Text style={styles.statNumber}>{statistics.totalSpent} FCFA</Text>
              <Text style={styles.statLabel}>Dépensé</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="star-outline" size={24} color="#ff9500" />
              <Text style={styles.statNumber}>{statistics.loyaltyPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
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
            icon="settings-outline"
            title="Paramètres"
            subtitle="Gérer les préférences"
            onPress={() => navigation.navigate('Settings')}
          />
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Composant pour afficher une ligne d'information
const InfoRow = ({ icon, label, value, valueColor = '#1d1d1f' }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Icon name={icon} size={20} color="#8e8e93" />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
  </View>
);

// Composant pour les boutons d'action
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 16,
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