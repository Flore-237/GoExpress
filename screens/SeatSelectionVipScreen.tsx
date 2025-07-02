import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../contexts/AuthContext';

const VipSeatSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  
  // Extraction des paramètres
  const { 
    tripId = '', 
    agencyId = '', 
    tripDetails = {}, 
    searchResult = {}, 
    origin = '', 
    destination = '', 
    departureTime = '', 
    departureDate = '', 
    price = 0, 
    vipPrice = 0, 
    agencyName: routeAgencyName = '',
    voyage: searchVoyage = {},
    agencyDetails: searchAgencyDetails = {}
  } = route.params || {};

  console.log('VipSeatSelection - Paramètres reçus:', route.params);

  // Normalisation des données pour voyage VIP
  const tripData = {
    ...(searchVoyage || tripDetails || {}),
    id: searchVoyage?.id || tripDetails?.id || tripId || 'default_id',
    origin: origin || searchVoyage?.departure || tripDetails?.origin || tripDetails?.departure || '',
    destination: destination || searchVoyage?.destination || tripDetails?.destination || '',
    departureTime: departureTime || searchVoyage?.heureDepart || tripDetails?.departureTime || tripDetails?.heureDepart || '',
    departureDate: departureDate || searchVoyage?.dateDepart || tripDetails?.departureDate || tripDetails?.dateDepart || '',
    prixVip: tripDetails?.prixVIP || vipPrice || price || searchVoyage?.prixVip || tripDetails?.prixVip || 12000,
    agencyName: routeAgencyName || searchAgencyDetails?.name || tripDetails?.agencyName || '',
    agencyId: agencyId || searchVoyage?.agencyId || tripDetails?.agencyId || '',
    logoUrl: searchAgencyDetails?.logoUrl || tripDetails?.logoUrl || '',
    placesVipDisponibles: searchVoyage?.placesVipDisponibles || tripDetails?.placesVipDisponibles || 16,
    placesVipTotal: searchVoyage?.placesVipTotal || tripDetails?.placesVipTotal || 16
  };

  // États pour la sélection de sièges VIP
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [vipSeats, setVipSeats] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [reservedSeats, setReservedSeats] = useState([]);

  // Calcul du prix total
  useEffect(() => {
    setCurrentPrice(tripData.prixVip * selectedSeats.length);
  }, [selectedSeats, tripData.prixVip]);

  // Génération des sièges VIP (2x2 par rangée, 70 places)
  const generateVipSeats = () => {
    const totalSeats = 70;
    const seatsPerRow = 4; // 2 de chaque côté
    const vipSeats = Array.from({ length: totalSeats }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      label: `${i + 1}`,
      row: Math.floor(i / seatsPerRow) + 1,
      column: i % seatsPerRow,
      available: !reservedSeats.includes(i + 1),
    }));
    setVipSeats(vipSeats);
  };

  // Génération initiale des sièges
  useEffect(() => {
    generateVipSeats();
  }, [reservedSeats, tripData.placesVipTotal]);

  // Organisation des sièges par rangées (disposition 2+1)
  const organizeVipSeatsIntoRows = (seats) => {
    return seats.reduce((rows, seat) => {
      if (!rows[seat.row]) rows[seat.row] = [];
      rows[seat.row].push(seat);
      return rows;
    }, []);
  };

  const handleGoBack = () => navigation.goBack();

  const refreshData = async () => {
    if (!tripData.id) {
      Alert.alert('Erreur', 'ID de voyage invalide');
      return;
    }
    setIsLoading(true);
    try {
      const doc = await firestore()
        .collection('voyages')
        .doc(tripData.id)
        .get();
        
      if (doc.exists) {
        const data = doc.data();
        setReservedSeats(data.siegesVipReserves || []);
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
      Alert.alert('Erreur', 'Impossible de rafraîchir les données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeatSelect = (seat) => {
    if (!seat.available) {
      Alert.alert('Siège indisponible', 'Ce siège VIP est déjà réservé.');
      return;
    }
    
    setSelectedSeats(prev => {
      const isAlreadySelected = prev.some(s => s.number === seat.number);
      if (isAlreadySelected) {
        return prev.filter(s => s.number !== seat.number);
      } else {
        if (prev.length >= 3) {
          Alert.alert('Limite atteinte', 'Vous ne pouvez sélectionner que 3 sièges VIP maximum.');
          return prev;
        }
        return [...prev, seat];
      }
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    // Si c'est déjà au format HH:MM, le retourner tel quel
    if (typeof time === 'string' && time.includes(':')) {
      return time;
    }
    // Sinon, essayer de le formater
    return time.toString();
  };

  const formatDate = (date) => {
    if (!date) return '';
    // Si c'est une date string, la retourner telle quelle
    if (typeof date === 'string') {
      return date;
    }
    // Si c'est un objet Date
    if (date instanceof Date) {
      return date.toLocaleDateString('fr-FR');
    }
    return date.toString();
  };

  const renderVipSeats = () => {
    const rows = organizeVipSeatsIntoRows(vipSeats);
    
    return (
      <View style={styles.seatLayout}>
        {/* En-tête du bus VIP */}
        <View style={styles.busHeader}>
          <Text style={styles.busHeaderText}>Bus VIP Premium</Text>
          <View style={styles.driverSeat}>
            <MaterialCommunityIcons name="steering" size={20} color="white" />
          </View>
        </View>
        
        {/* Rangées de sièges VIP */}
        {rows.map((row, rowIndex) => (
          row && Array.isArray(row) && (
            <View key={`vip-row-${rowIndex}`} style={styles.seatRow}>
              {row.map((seat, index) => {
                const isSelected = selectedSeats.some(s => s.number === seat.number);
                const isReserved = !seat.available;
                // Ajouter un espace après le 2ème siège pour la disposition 2+1
                const showVipAisle = index === 1;
                
                return (
                  <React.Fragment key={seat.id}>
                    <TouchableOpacity
                      style={[
                        styles.vipSeat,
                        isReserved && styles.unavailableVipSeat,
                        isSelected && styles.selectedVipSeat
                      ]}
                      onPress={() => handleSeatSelect(seat)}
                      disabled={isReserved || isLoading}
                    >
                      <Text style={[
                        styles.vipSeatLabel,
                        isReserved && styles.unavailableVipSeatLabel,
                        isSelected && styles.selectedVipSeatLabel
                      ]}>
                        {seat.label}
                      </Text>
                    </TouchableOpacity>
                    {showVipAisle && <View style={styles.vipAisle} />}
                  </React.Fragment>
                );
              })}
            </View>
          )
        ))}
      </View>
    );
  };

  const formatPrice = (price) => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const handleContinue = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Aucun siège sélectionné', 'Veuillez sélectionner au moins un siège VIP.');
      return;
    }

    try {
      // Créer la réservation dans Firestore avec tous les champs nécessaires
      const reservation = {
        tripId: tripData.id,
        agencyId: tripData.agencyId,
        nomAgence: tripData.agencyName,
        agencyName: tripData.agencyName,
        logoAgence: tripData.logoUrl,
        logoUrl: tripData.logoUrl,
        villeDepart: tripData.origin,
        departure: tripData.origin,
        villeArrivee: tripData.destination,
        destination: tripData.destination,
        heureDepart: tripData.departureTime,
        departureTime: tripData.departureTime,
        dateVoyage: tripData.departureDate,
        departureDate: tripData.departureDate,
        prixVIP: tripData.prixVip,
        prixTotal: currentPrice,
        totalPrice: currentPrice,
        seatType: 'VIP',
        typePlace: 'VIP',
        selectedSeats,
        seats: selectedSeats,
        numberOfSeats: selectedSeats.length,
        statut: 'en attente de paiement',
        createdAt: new Date(),
        nom: user?.lastName || '',
        prenom: user?.firstName || '',
        telephone: user?.phone || '',
      };
      const docRef = await firestore().collection('reservations').add(reservation);

      // Naviguer vers la page paiement avec l'ID de la réservation
      navigation.navigate(ROUTES.PAYMENT, {
        reservationId: docRef.id
      });
    } catch (error) {
      Alert.alert('Erreur', "Impossible de créer la réservation. Veuillez réessayer.");
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sélection des places VIP</Text>
        <TouchableOpacity onPress={refreshData} style={styles.backButton} disabled={isLoading}>
          <Icon name="refresh-cw" size={18} color={isLoading ? "#ccc" : "#007bff"} />
        </TouchableOpacity>
      </View>

      {/* Informations de l'agence et du voyage */}
      <View style={styles.agencyInfo}>
        <View style={styles.agencyHeader}>
          {tripData.logoUrl ? (
            <Image 
              source={{ uri: tripData.logoUrl }} 
              style={styles.agencyLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderLogo}>
              <MaterialCommunityIcons name="domain" size={30} color="#007bff" />
            </View>
          )}
          <View style={styles.agencyDetails}>
            <Text style={styles.agencyName}>{tripData.agencyName || 'Agence non spécifiée'}</Text>
            <Text style={styles.tripRoute}>
              {tripData.origin} → {tripData.destination}
            </Text>
          </View>
        </View>
        
        <View style={styles.tripDetails}>
          <View style={styles.tripDetailItem}>
            <Icon name="calendar" size={16} color="#666" />
            <Text style={styles.tripDetailText}>
              {formatDate(tripData.departureDate) || 'Date non spécifiée'}
            </Text>
          </View>
          <View style={styles.tripDetailItem}>
            <Icon name="clock" size={16} color="#666" />
            <Text style={styles.tripDetailText}>
              {formatTime(tripData.departureTime) || 'Heure non spécifiée'}
            </Text>
          </View>
        </View>
      </View>

      {/* Légende des sièges VIP */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSeat, styles.vipSeat]} />
          <Text style={styles.legendText}>Disponible</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSeat, styles.selectedVipSeat]} />
          <Text style={styles.legendText}>Sélectionné</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSeat, styles.unavailableVipSeat]} />
          <Text style={styles.legendText}>Occupé</Text>
        </View>
      </View>

      {/* Zone de sélection des sièges */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Chargement des places VIP...</Text>
          </View>
        ) : (
          renderVipSeats()
        )}
      </ScrollView>

      {/* Footer avec bouton de continuation */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.continueButton, 
            (selectedSeats.length === 0 || isLoading) && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={selectedSeats.length === 0 || isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading 
              ? 'Traitement en cours...' 
              : `Continuer VIP - ${selectedSeats.length} place${selectedSeats.length > 1 ? 's' : ''} (${formatPrice(currentPrice)})`
            }
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  agencyInfo: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agencyLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  placeholderLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  agencyDetails: {
    flex: 1,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tripRoute: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tripDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  seatLayout: {
    padding: 20,
    alignItems: 'center',
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  busHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  driverSeat: {
    width: 40,
    height: 30,
    backgroundColor: '#333',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatRow: {
    flexDirection: 'row',
    marginBottom: 10,
    justifyContent: 'center',
  },
  vipSeat: {
    width: 50,
    height: 50,
    backgroundColor: '#2d3748',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  selectedVipSeat: {
    backgroundColor: '#007bff',
    borderColor: '#0056b3',
  },
  unavailableVipSeat: {
    backgroundColor: '#9e9e9e',
    borderColor: '#757575',
  },
  vipSeatLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  selectedVipSeatLabel: {
    color: 'white',
  },
  unavailableVipSeatLabel: {
    color: 'white',
  },
  vipAisle: {
    width: 30,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  continueButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendSeat: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default VipSeatSelectionScreen;