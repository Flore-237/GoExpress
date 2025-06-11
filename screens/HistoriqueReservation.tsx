import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Share,
  TextInput,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, parseISO, isAfter, isBefore, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { auth, db } from '../config/firebase';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Composant EmptyState amélioré
const EmptyState = ({ icon, title, message, actionText, onActionPress }) => {
  return (
    <View style={emptyStateStyles.container}>
      <View style={emptyStateStyles.iconContainer}>
        <Icon name={icon} size={80} color="#E3F2FD" />
      </View>
      <Text style={emptyStateStyles.title}>{title}</Text>
      <Text style={emptyStateStyles.message}>{message}</Text>
      <TouchableOpacity 
        style={emptyStateStyles.actionButton} 
        onPress={onActionPress}
      >
        <Text style={emptyStateStyles.actionText}>{actionText}</Text>
        <Icon name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
};

// Styles pour le composant EmptyState
const emptyStateStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FAFBFF',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Interface TypeScript pour les réservations
interface Reservation {
  id: string;
  userId: string;
  voyageId: string;
  agencyId: string;
  ticketId: string;
  typePlace: 'VIP' | 'Classique';
  prixTotal: number;
  statut: 'confirmé' | 'en_attente' | 'annulé';
  dateReservation: string;
  heureReservation: string;
  createdAt: any;
  paiementId: string;
  // Données jointes
  numeroBillet?: string;
  dateVoyage?: string;
  heureDepart?: string;
  villeDepart?: string;
  villeArrivee?: string;
  statutPaiement?: 'complété' | 'en_attente';
  nomAgence?: string;
  logoAgence?: string;
  // Champs supplémentaires basés sur vos données
  departure?: string;
  destination?: string;
  departureDate?: string;
  departureTime?: string;
  seatType?: string;
  paymentStatus?: string;
  numberOfSeats?: number;
  pricePerSeat?: number;
  totalPrice?: number;
  seats?: Array<any>;
}

const HistoriqueReservation: React.FC = () => {
  const navigation = useNavigation();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'past' | 'confirmed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    setupRealtimeListener();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    filterReservations();
  }, [reservations, activeFilter, searchQuery]);

  useEffect(() => {
    const navUnsubscribe = navigation.addListener('focus', () => {
      if (!unsubscribe) {
        setupRealtimeListener();
      }
    });
    
    return navUnsubscribe;
  }, [navigation]);

  const getCurrentUserId = async () => {
    try {
      // Essayer d'abord AsyncStorage
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        console.log('User ID trouvé dans AsyncStorage:', storedUserId);
        return storedUserId;
      }

      // Ensuite essayer authToken
      const authToken = await AsyncStorage.getItem('authToken');
      if (authToken) {
        console.log('Auth token trouvé:', authToken);
        return authToken;
      }
      
      // Enfin essayer Firebase auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('User ID trouvé dans Firebase auth:', currentUser.uid);
        return currentUser.uid;
      }

      // Essayer de récupérer les données utilisateur stockées
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        if (parsedUserData.id || parsedUserData.uid) {
          console.log('User ID trouvé dans userData:', parsedUserData.id || parsedUserData.uid);
          return parsedUserData.id || parsedUserData.uid;
        }
      }
      
      console.log('Aucun utilisateur connecté trouvé');
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
      return null;
    }
  };

  const setupRealtimeListener = async () => {
    try {
      setLoading(true);
      
      const userId = await getCurrentUserId();
      console.log('User ID récupéré:', userId);
      
      if (!userId) {
        console.log('Aucun utilisateur connecté');
        setReservations([]);
        setLoading(false);
        return;
      }

      // Essayer d'abord avec userId
      let reservationsRef = firestore()
        .collection('reservations')
        .where('userId', '==', userId);

      const unsubscribeListener = reservationsRef.onSnapshot(
        (snapshot) => {
          console.log('Nombre de documents trouvés avec userId:', snapshot.docs.length);
          
          if (snapshot.docs.length === 0) {
            // Si aucun résultat avec userId, essayer avec d'autres champs possibles
            console.log('Aucune réservation trouvée avec userId, essai avec d\'autres champs...');
            
            // Vous pouvez ici essayer d'autres requêtes si nécessaire
            // Par exemple si vous stockez l'ID utilisateur dans un autre champ
          }

          const reservationsData = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Données de réservation trouvées:', data);
            
            return {
              id: doc.id,
              ...data,
              // Normaliser les données pour assurer la compatibilité
              villeDepart: data.villeDepart || data.departure,
              villeArrivee: data.villeArrivee || data.destination,
              dateVoyage: data.dateVoyage || data.departureDate,
              heureDepart: data.heureDepart || data.departureTime,
              typePlace: data.typePlace || data.seatType,
              statut: data.statut || (data.paymentStatus === 'en_attente' ? 'en_attente' : 'confirmé'),
              statutPaiement: data.statutPaiement || data.paymentStatus,
              prixTotal: data.prixTotal || data.totalPrice || data.pricePerSeat,
              dateReservation: data.dateReservation || data.createdAt?.toDate?.() || data.reservationDate?.toDate?.(),
            };
          });
          
          console.log('Réservations finales:', reservationsData);
          setReservations(reservationsData);
          setLoading(false);
        },
        (error) => {
          console.error('Erreur lors de la récupération des réservations:', error);
          
          // En cas d'erreur, essayer une requête alternative
          console.log('Tentative de récupération de toutes les réservations pour debug...');
          
          firestore()
            .collection('reservations')
            .limit(10)
            .get()
            .then((snapshot) => {
              console.log('Toutes les réservations (debug):', snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })));
            })
            .catch((debugError) => {
              console.error('Erreur debug:', debugError);
            });
          
          setLoading(false);
        }
      );

      setUnsubscribe(() => unsubscribeListener);
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'écoute:', error);
      setLoading(false);
    }
  };

  const filterReservations = () => {
    let filtered = [...reservations];
    const currentDate = new Date();

    if (activeFilter !== 'all') {
      filtered = filtered.filter(reservation => {
        switch (activeFilter) {
          case 'upcoming':
            if (!reservation.dateVoyage) return false;
            try {
              const voyageDate = parseISO(`${reservation.dateVoyage}T${reservation.heureDepart?.replace('h', ':') || '00:00'}`);
              return isAfter(voyageDate, currentDate) && reservation.statut !== 'annulé';
            } catch {
              return false;
            }
          case 'past':
            if (!reservation.dateVoyage) return true;
            try {
              const voyageDate = parseISO(`${reservation.dateVoyage}T${reservation.heureDepart?.replace('h', ':') || '00:00'}`);
              return !isAfter(voyageDate, currentDate) || reservation.statut === 'annulé';
            } catch {
              return true;
            }
          case 'confirmed':
            return reservation.statut === 'confirmé';
          case 'cancelled':
            return reservation.statut === 'annulé';
          default:
            return true;
        }
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(reservation => 
        reservation.nomAgence?.toLowerCase().includes(query) ||
        reservation.villeDepart?.toLowerCase().includes(query) ||
        reservation.villeArrivee?.toLowerCase().includes(query) ||
        reservation.numeroBillet?.toLowerCase().includes(query) ||
        reservation.id.toLowerCase().includes(query)
      );
    }

    setFilteredReservations(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Relancer la configuration du listener pour rafraîchir les données
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    await setupRealtimeListener();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const navigateToReservationDetails = (reservationId: string) => {
    navigation.navigate('DetailReservation', { reservationId });
  };

  const shareTicket = async (reservation: Reservation) => {
    try {
      await Share.share({
        message: `Mon billet de voyage avec ${reservation.nomAgence}\n
Date: ${reservation.dateVoyage ? format(parseISO(reservation.dateVoyage), 'dd/MM/yyyy', { locale: fr }) : 'Date non définie'}\n
Heure: ${reservation.heureDepart || 'Heure non définie'}\n
Trajet: ${reservation.villeDepart || 'Départ'} - ${reservation.villeArrivee || 'Arrivée'}\n
Type: ${reservation.typePlace}\n
Référence: ${reservation.numeroBillet || reservation.id}`,
        title: `Billet de voyage ${reservation.nomAgence}`,
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager le billet');
    }
  };

  const cancelReservation = async (reservationId: string) => {
    Alert.alert(
      'Annuler la réservation',
      'Êtes-vous sûr de vouloir annuler cette réservation ?',
      [
        { text: 'Non', style: 'cancel' },
        { 
          text: 'Oui', 
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('reservations')
                .doc(reservationId)
                .update({
                  statut: 'annulé',
                  updatedAt: firestore.FieldValue.serverTimestamp()
                });
              
              Alert.alert('Succès', 'Votre réservation a été annulée');
            } catch (error) {
              console.error('Erreur lors de l\'annulation:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler la réservation. Veuillez réessayer.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'confirmé': return '#10B981';
      case 'annulé': return '#EF4444';
      case 'en_attente': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (statut: string) => {
    switch (statut) {
      case 'confirmé': return '#ECFDF5';
      case 'annulé': return '#FEF2F2';
      case 'en_attente': return '#FFFBEB';
      default: return '#F9FAFB';
    }
  };

  const getDateLabel = (reservation: Reservation) => {
    if (!reservation.dateVoyage) return '';
    
    try {
      const voyageDate = parseISO(reservation.dateVoyage);
      if (isToday(voyageDate)) return 'Aujourd\'hui';
      if (isThisWeek(voyageDate)) return 'Cette semaine';
      if (isThisMonth(voyageDate)) return 'Ce mois';
      return format(voyageDate, 'MMM yyyy', { locale: fr });
    } catch {
      return '';
    }
  };

  const renderFilterButton = (filter: string, label: string, count?: number) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => setActiveFilter(filter as any)}
      >
        <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
          {label}
        </Text>
        {count !== undefined && (
          <View style={[styles.countBadge, isActive && styles.activeCountBadge]}>
            <Text style={[styles.countText, isActive && styles.activeCountText]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderReservationItem = ({ item, index }: { item: Reservation, index: number }) => {
    const canCancel = item.statut !== 'annulé' && 
                      item.dateVoyage && 
                      isAfter(parseISO(item.dateVoyage), new Date());
    
    const formattedDate = item.dateVoyage 
      ? format(parseISO(item.dateVoyage), 'dd MMM yyyy', { locale: fr }) 
      : 'Date non définie';
    
    const dateLabel = getDateLabel(item);
    
    return (
      <TouchableOpacity
        style={[styles.reservationCard, { marginBottom: index === filteredReservations.length - 1 ? 100 : 16 }]}
        onPress={() => navigateToReservationDetails(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardGradient}>
          <View style={styles.cardHeader}>
            <View style={styles.agencyContainer}>
              <View style={styles.logoContainer}>
                {item.logoAgence && !item.logoAgence.startsWith('assets/') ? (
                  <Image
                    source={{ uri: item.logoAgence }}
                    style={styles.agencyLogo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.agencyLogoPlaceholder}>
                    <Text style={styles.agencyLogoInitial}>
                      {item.nomAgence?.charAt(0) || 'A'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.agencyInfo}>
                <Text style={styles.agencyName} numberOfLines={1}>
                  {item.nomAgence || 'Agence inconnue'}
                </Text>
                <View style={styles.refContainer}>
                  <Icon name="bookmark-outline" size={12} color="#64748B" />
                  <Text style={styles.reservationId}>
                    {item.numeroBillet || item.id.slice(-8)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusBgColor(item.statut) }
            ]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.statut) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(item.statut) }]}>
                {item.statut}
              </Text>
            </View>
          </View>
          
          <View style={styles.routeSection}>
            <View style={styles.routeContainer}>
              <View style={styles.cityContainer}>
                <Text style={styles.cityCode}>
                  {(item.villeDepart || 'DEP').substring(0, 3).toUpperCase()}
                </Text>
                <Text style={styles.cityName} numberOfLines={1}>
                  {item.villeDepart || 'Départ'}
                </Text>
              </View>
              
              <View style={styles.routeMiddle}>
                <View style={styles.routeLine} />
                <View style={styles.arrowContainer}>
                  <Icon name="arrow-right" size={20} color="#4169E1" />
                </View>
                <View style={styles.routeLine} />
              </View>
              
              <View style={styles.cityContainer}>
                <Text style={styles.cityCode}>
                  {(item.villeArrivee || 'ARR').substring(0, 3).toUpperCase()}
                </Text>
                <Text style={styles.cityName} numberOfLines={1}>
                  {item.villeArrivee || 'Arrivée'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="calendar-outline" size={16} color="#64748B" />
                <Text style={styles.detailText}>{formattedDate}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="clock-outline" size={16} color="#64748B" />
                <Text style={styles.detailText}>{item.heureDepart || 'Non définie'}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="seat-passenger" size={16} color="#64748B" />
                <Text style={styles.detailText}>{item.typePlace}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceValue}>{item.prixTotal?.toLocaleString() || '0'}</Text>
                <Text style={styles.priceUnit}>FCFA</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.actionsSection}>
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => cancelReservation(item.id)}
              >
                <Icon name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => shareTicket(item)}
            >
              <Icon name="share-variant-outline" size={18} color="#4169E1" />
              <Text style={styles.actionButtonText}>Partager</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => navigateToReservationDetails(item.id)}
            >
              <Icon name="eye-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Détails</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const upcomingCount = reservations.filter(r => {
    if (!r.dateVoyage) return false;
    try {
      const voyageDate = parseISO(`${r.dateVoyage}T${r.heureDepart?.replace('h', ':') || '00:00'}`);
      return isAfter(voyageDate, new Date()) && r.statut !== 'annulé';
    } catch {
      return false;
    }
  }).length;

  const pastCount = reservations.filter(r => {
    if (!r.dateVoyage) return true;
    try {
      const voyageDate = parseISO(`${r.dateVoyage}T${r.heureDepart?.replace('h', ':') || '00:00'}`);
      return !isAfter(voyageDate, new Date()) || r.statut === 'annulé';
    } catch {
      return true;
    }
  }).length;

  const confirmedCount = reservations.filter(r => r.statut === 'confirmé').length;
  const cancelledCount = reservations.filter(r => r.statut === 'annulé').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#4169E1" />
          </View>
          <Text style={styles.loadingTitle}>Chargement</Text>
          <Text style={styles.loadingText}>Récupération de vos réservations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mes Réservations</Text>
          <Text style={styles.headerSubtitle}>{reservations.length} voyage(s)</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par agence, ville..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: 'Toutes', count: reservations.length },
            { key: 'upcoming', label: 'À venir', count: upcomingCount },
            { key: 'past', label: 'Passées', count: pastCount },
            { key: 'confirmed', label: 'Confirmées', count: confirmedCount },
            { key: 'cancelled', label: 'Annulées', count: cancelledCount },
          ]}
          renderItem={({ item }) => renderFilterButton(item.key, item.label, item.count)}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filtersContentContainer}
        />
      </View>

      {filteredReservations.length === 0 ? (
        <EmptyState
          icon={searchQuery.trim() ? "magnify" : activeFilter === 'upcoming' ? "calendar-clock" : activeFilter === 'past' ? "history" : activeFilter === 'cancelled' ? "cancel" : "ticket-outline"}
          title={searchQuery.trim() ? "Aucun résultat" : activeFilter === 'upcoming' ? "Aucun voyage à venir" : activeFilter === 'past' ? "Aucun voyage passé" : activeFilter === 'cancelled' ? "Aucune réservation annulée" : "Aucune réservation"}
          message={searchQuery.trim() ? "Aucune réservation ne correspond à votre recherche" : activeFilter === 'upcoming' ? "Vous n'avez aucun voyage prévu pour le moment" : activeFilter === 'past' ? "Vous n'avez aucun voyage terminé" : activeFilter === 'cancelled' ? "Vous n'avez aucune réservation annulée" : "Vous n'avez pas encore effectué de réservation"}
          actionText={searchQuery.trim() ? "Effacer la recherche" : "Réserver un voyage"}
          onActionPress={searchQuery.trim() ? () => setSearchQuery('') : () => navigation.navigate('Search')}
        />
      ) : (
        <FlatList
          data={filteredReservations}
          renderItem={renderReservationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4169E1']}
              tintColor="#4169E1"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFF',
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
filtersSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filtersContentContainer: {
    paddingHorizontal: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterButton: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  countBadge: {
    marginLeft: 8,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeCountText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
  },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  agencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    overflow: 'hidden',
  },
  agencyLogo: {
    width: '100%',
    height: '100%',
  },
  agencyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agencyLogoInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  refContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reservationId: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  routeSection: {
    marginBottom: 20,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityContainer: {
    flex: 1,
    alignItems: 'center',
  },
  cityCode: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cityName: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  routeMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flex: 1,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  priceUnit: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  primaryButton: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
    marginLeft: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
});

export default HistoriqueReservation;