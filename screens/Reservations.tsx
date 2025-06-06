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
  Share
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, parseISO, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { auth, db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'; 
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
    backgroundColor: '#0066CC',
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

// Types
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

const ReservationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const today = new Date();

  useEffect(() => {
    fetchReservations();
  }, []);
  
  // Pour activer la navigation de l'écouteur
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchReservations();
    });
    
    return unsubscribe;
  }, [navigation]);

  // Fonction pour récupérer l'ID utilisateur depuis AsyncStorage ou Firebase Auth
  const getCurrentUserId = async () => {
    try {
      // Essayer d'abord AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        return userId;
      }
      
      // Sinon utiliser Firebase Auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        return currentUser.uid;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
      return null;
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'ID utilisateur
      const userId = await getCurrentUserId();
      
      if (!userId) {
        console.log('Aucun utilisateur connecté');
        setReservations([]);
        setLoading(false);
        return;
      }

      console.log('Récupération des réservations pour userId:', userId);
      
      // Récupérer les réservations de l'utilisateur depuis Firestore
      const reservationsRef = collection(db, 'reservations');
      const q = query(reservationsRef, where('userId', '==', userId));
      const reservationsSnapshot = await getDocs(q);
        
      if (reservationsSnapshot.empty) {
        console.log('Aucune réservation trouvée');
        setReservations([]);
        setLoading(false);
        return;
      }
      
      console.log('Nombre de réservations trouvées:', reservationsSnapshot.size);
      
      // Transformer les données et récupérer les informations associées
      const reservationsData: Reservation[] = [];
      
      for (const docSnap of reservationsSnapshot.docs) {
        const reservationData = docSnap.data() as Reservation;
        console.log('Données de réservation:', reservationData);
        
        try {
          // Récupérer les informations du voyage
          const voyageDocRef = doc(db, 'voyages', reservationData.voyageId);
          const voyageDoc = await getDoc(voyageDocRef);
          
          // Récupérer les informations de l'agence
          const agencyDocRef = doc(db, 'agencies', reservationData.agencyId);
          const agencyDoc = await getDoc(agencyDocRef);
          
          // Récupérer les informations du ticket (optionnel)
          let ticketData = null;
          if (reservationData.ticketId) {
            const ticketDocRef = doc(db, 'tickets', reservationData.ticketId);
            const ticketDoc = await getDoc(ticketDocRef);
            ticketData = ticketDoc.exists() ? ticketDoc.data() : null;
          }
          
          // Récupérer les informations du paiement (optionnel)
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
          } else {
            console.log('Voyage ou agence non trouvé pour la réservation:', docSnap.id);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données associées:', error);
        }
      }
      
      console.log('Réservations finales:', reservationsData);
      
      // Trier les réservations par date de création (plus récentes en premier)
      reservationsData.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate() - a.createdAt.toDate();
        }
        return 0;
      });
      
      setReservations(reservationsData);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des réservations:', error);
      Alert.alert('Erreur', 'Impossible de charger vos réservations. Veuillez réessayer.');
      setLoading(false);
    }
  };

  // Filtrer les réservations selon l'onglet actif
  const getFilteredReservations = () => {
    const currentDate = new Date();
    
    return reservations.filter(reservation => {
      if (!reservation.dateVoyage) return activeTab === 'past'; // Mettre les réservations sans date dans "passé"
      
      try {
        const voyageDate = parseISO(`${reservation.dateVoyage}T${reservation.heureDepart?.replace('h', ':') || '00:00'}`);
        
        if (activeTab === 'upcoming') {
          return isAfter(voyageDate, currentDate) && reservation.statut !== 'annulé';
        } else {
          return !isAfter(voyageDate, currentDate) || reservation.statut === 'annulé';
        }
      } catch (error) {
        console.error('Erreur lors du parsing de la date:', error);
        return activeTab === 'past';
      }
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const navigateToReservationDetails = (reservationId: string) => {
    navigation.navigate('ReservationDetails', { reservationId });
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
              fetchReservations();
            } catch (error) {
              console.error('Erreur lors de l\'annulation:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler la réservation. Veuillez réessayer.');
            }
          }
        }
      ]
    );
  };

  const renderReservationItem = ({ item }: { item: Reservation }) => {
    const canCancel = item.statut !== 'annulé' && 
                      activeTab === 'upcoming';
    
    const formattedDate = item.dateVoyage 
      ? format(parseISO(item.dateVoyage), 'dd MMM yyyy', { locale: fr }) 
      : 'Date non définie';
    
    return (
      <TouchableOpacity
        style={styles.reservationCard}
        onPress={() => navigateToReservationDetails(item.id)}
        activeOpacity={0.7}
      >
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
            <Text style={styles.agencyName}>{item.nomAgence || 'Agence inconnue'}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            item.statut === 'confirmé' ? styles.statusConfirmed :
            item.statut === 'annulé' ? styles.statusCancelled : styles.statusPending
          ]}>
            <Text style={styles.statusText}>{item.statut}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.journeyInfo}>
            <View style={styles.routeContainer}>
              <Text style={styles.cityText}>{item.villeDepart || 'Départ'}</Text>
              <View style={styles.arrowContainer}>
                <View style={styles.arrowLine} />
                <Icon name="arrow-right" size={20} color="#0066CC" />
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
              <Text style={styles.ticketTypeLabel}>Type de place:</Text>
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
            <Icon name="share-variant" size={18} color="#0066CC" />
            <Text style={styles.actionButtonText}>Partager</Text>
          </TouchableOpacity>
          
          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => cancelReservation(item.id)}
            >
              <Icon name="close-circle" size={18} color="#E53935" />
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Annuler</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToReservationDetails(item.id)}
          >
            <Icon name="chevron-right" size={18} color="#0066CC" />
            <Text style={styles.actionButtonText}>Détails</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    return (
      <EmptyState
        icon="ticket"
        title={activeTab === 'upcoming' ? "Aucune réservation à venir" : "Aucun voyage passé"}
        message={activeTab === 'upcoming' ? "Vous n'avez pas encore de réservations futures" : "Vous n'avez pas d'historique de voyages"}
        actionText="Réserver un voyage"
        onActionPress={() => navigation.navigate('Home')}
      />
    );
  };
  
  const filteredReservations = getFilteredReservations();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Réservations</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTabButton]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            À venir ({filteredReservations.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'past' && styles.activeTabButton]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Passés ({getFilteredReservations().length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Chargement de vos réservations...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReservations}
          renderItem={renderReservationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0066CC']}
              tintColor="#0066CC"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#263238',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#757575',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#757575',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  agencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agencyLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  agencyLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agencyLogoInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  agencyName: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF8E1',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#263238',
  },
  cardBody: {
    marginBottom: 16,
  },
  journeyInfo: {
    marginBottom: 12,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cityText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  arrowLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#0066CC',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  ticketInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  ticketTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketTypeLabel: {
    fontSize: 14,
    color: '#757575',
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
    color: '#757575',
    marginRight: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#0066CC',
  },
  cancelButton: {
    marginHorizontal: 8,
  },
  cancelButtonText: {
    color: '#E53935',
  },
});

export default ReservationScreen;