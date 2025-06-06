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
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, parseISO, isAfter, isBefore, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { auth, db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Composant EmptyState
const EmptyState = ({ icon, title, message, actionText, onActionPress }) => {
  return (
    <View style={emptyStateStyles.container}>
      <Icon name={icon} size={60} color="#CCCCCC" />
      <Text style={emptyStateStyles.title}>{title}</Text>
      <Text style={emptyStateStyles.message}>{message}</Text>
      <TouchableOpacity 
        style={emptyStateStyles.actionButton} 
        onPress={onActionPress}
      >
        <Text style={emptyStateStyles.actionText}>{actionText}</Text>
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
    padding: 20,
    marginTop: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginTop: 16,
  },
  message: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#5e17eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  statut: 'confirmé' | 'en attente' | 'annulé';
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
  statutPaiement?: 'complété' | 'en attente';
  nomAgence?: string;
  logoAgence?: string;
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
      const userId = await AsyncStorage.getItem('userId');
      if (userId) return userId;
      
      const currentUser = auth.currentUser;
      if (currentUser) return currentUser.uid;
      
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
      if (!userId) {
        console.log('Aucun utilisateur connecté');
        setReservations([]);
        setLoading(false);
        return;
      }

      const reservationsRef = collection(db, 'reservations');
      const q = query(
        reservationsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribeSnapshot = onSnapshot(q, async (snapshot) => {
        console.log('Mise à jour en temps réel des réservations');
        
        if (snapshot.empty) {
          console.log('Aucune réservation trouvée');
          setReservations([]);
          setLoading(false);
          return;
        }
        
        const reservationsData: Reservation[] = [];
        
        for (const docSnap of snapshot.docs) {
          const reservationData = docSnap.data() as Reservation;
          
          try {
            const voyageDocRef = doc(db, 'voyages', reservationData.voyageId);
            const voyageDoc = await getDoc(voyageDocRef);
            
            const agencyDocRef = doc(db, 'agencies', reservationData.agencyId);
            const agencyDoc = await getDoc(agencyDocRef);
            
            let ticketData = null;
            if (reservationData.ticketId) {
              const ticketDocRef = doc(db, 'tickets', reservationData.ticketId);
              const ticketDoc = await getDoc(ticketDocRef);
              ticketData = ticketDoc.exists() ? ticketDoc.data() : null;
            }
            
            let paiementData = null;
            if (reservationData.paiementId) {
              const paiementDocRef = doc(db, 'paiements', reservationData.paiementId);
              const paiementDoc = await getDoc(paiementDocRef);
              paiementData = paiementDoc.exists() ? paiementDoc.data() : null;
            }
            
            if (voyageDoc.exists() && agencyDoc.exists()) {
              const voyageData = voyageDoc.data();
              const agencyData = agencyDoc.data();
              
              reservationsData.push({
                ...reservationData,
                id: docSnap.id,
                dateVoyage: voyageData?.dateDepart,
                heureDepart: voyageData?.heureDepart,
                villeDepart: voyageData?.departure || voyageData?.villeDepart,
                villeArrivee: voyageData?.destination || voyageData?.villeArrivee,
                nomAgence: agencyData?.name || agencyData?.nom,
                logoAgence: agencyData?.logoUrl || agencyData?.logo,
                numeroBillet: ticketData?.barcode || ticketData?.numero,
                statutPaiement: paiementData?.status || paiementData?.statut
              });
            }
          } catch (error) {
            console.error('Erreur lors de la récupération des données associées:', error);
          }
        }
        
        setReservations(reservationsData);
        setLoading(false);
      }, (error) => {
        console.error('Erreur lors de l\'écoute en temps réel:', error);
        Alert.alert('Erreur', 'Impossible de synchroniser vos réservations.');
        setLoading(false);
      });

      setUnsubscribe(() => unsubscribeSnapshot);
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
              const reservationRef = doc(db, 'reservations', reservationId);
              await updateDoc(reservationRef, {
                statut: 'annulé',
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
      case 'confirmé': return '#4CAF50';
      case 'annulé': return '#F44336';
      case 'en attente': return '#FF9800';
      default: return '#757575';
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
          {label} {count !== undefined && `(${count})`}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderReservationItem = ({ item }: { item: Reservation }) => {
    const canCancel = item.statut !== 'annulé' && 
                      item.dateVoyage && 
                      isAfter(parseISO(item.dateVoyage), new Date());
    
    const formattedDate = item.dateVoyage 
      ? format(parseISO(item.dateVoyage), 'dd MMM yyyy', { locale: fr }) 
      : 'Date non définie';
    
    const dateLabel = getDateLabel(item);
    
    return (
      <TouchableOpacity
        style={styles.reservationCard}
        onPress={() => navigateToReservationDetails(item.id)}
        activeOpacity={0.7}
      >
        {dateLabel && (
          <View style={styles.dateLabelContainer}>
            <Text style={styles.dateLabelText}>{dateLabel}</Text>
          </View>
        )}
        
        <View style={styles.cardHeader}>
          <View style={styles.agencyContainer}>
            {item.logoAgence ? (
              <Image
                source={{ uri: item.logoAgence }}
                style={styles.agencyLogo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.agencyLogoPlaceholder}>
                <Text style={styles.agencyLogoInitial}>
                  {item.nomAgence?.charAt(0) || 'A'}
                </Text>
              </View>
            )}
            <View style={styles.agencyInfo}>
              <Text style={styles.agencyName}>{item.nomAgence || 'Agence inconnue'}</Text>
              <Text style={styles.reservationId}>Réf: {item.numeroBillet || item.id.slice(-8)}</Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.statut) + '20' }
          ]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.statut) }]}>
              {item.statut}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.journeyInfo}>
            <View style={styles.routeContainer}>
              <Text style={styles.cityText}>{item.villeDepart || 'Départ'}</Text>
              <View style={styles.arrowContainer}>
                <View style={styles.arrowLine} />
                <Icon name="arrow-right" size={20} color="#5e17eb" />
              </View>
              <Text style={styles.cityText}>{item.villeArrivee || 'Arrivée'}</Text>
            </View>
            
            <View style={styles.dateTimeContainer}>
              <Icon name="calendar" size={16} color="#666" />
              <Text style={styles.dateTimeText}>{formattedDate}</Text>
              <Icon name="clock-outline" size={16} color="#666" style={{ marginLeft: 8 }} />
              <Text style={styles.dateTimeText}>{item.heureDepart || 'Heure non définie'}</Text>
            </View>
          </View>
          
          <View style={styles.ticketInfo}>
            <View style={styles.ticketTypeContainer}>
              <Text style={styles.ticketTypeLabel}>Type:</Text>
              <Text style={styles.ticketTypeValue}>{item.typePlace}</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Prix:</Text>
              <Text style={styles.priceValue}>{item.prixTotal?.toLocaleString() || '0'} FCFA</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => shareTicket(item)}
          >
            <Icon name="share-variant" size={18} color="#5e17eb" />
            <Text style={styles.actionButtonText}>Partager</Text>
          </TouchableOpacity>
          
          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => cancelReservation(item.id)}
            >
              <Icon name="cancel" size={18} color="#F44336" />
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Annuler</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToReservationDetails(item.id)}
          >
            <Icon name="eye" size={18} color="#5e17eb" />
            <Text style={styles.actionButtonText}>Détails</Text>
          </TouchableOpacity>
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
          <ActivityIndicator size="large" color="#5e17eb" />
          <Text style={styles.loadingText}>Chargement de vos réservations...</Text>
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
          <Icon name="arrow-left" size={24} color="#263238" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Réservations</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par agence, ville, référence..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersContainer}>
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
              colors={['#5e17eb']}
              tintColor="#5e17eb"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#263238',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtersContentContainer: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeFilterButton: {
    backgroundColor: '#5e17eb',
    borderColor: '#5e17eb',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateLabelContainer: {
    position: 'absolute',
    top: -6,
    left: 16,
    backgroundColor: '#5e17eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  dateLabelText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  agencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  agencyLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  agencyLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5e17eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agencyLogoInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
  },
  reservationId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardBody: {
    marginBottom: 12,
  },
  journeyInfo: {
    marginBottom: 12,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    flex: 1,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  arrowLine: {
    height: 1,
    width: 20,
    backgroundColor: '#5e17eb',
    marginRight: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  ticketInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  ticketTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketTypeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  ticketTypeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5e17eb',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#5e17eb',
    marginLeft: 4,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
  },
  cancelButtonText: {
    color: '#F44336',
  },
});

export default HistoriqueReservation;