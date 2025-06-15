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

const SeatSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
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
    classicPrice = 0, 
    vipPrice = 0, 
    agencyName: routeAgencyName = '',
    voyage: searchVoyage = {},
    agencyDetails: searchAgencyDetails = {}
  } = route.params || {};

  // Normalisation des données
  const tripData = {
    ...(searchVoyage || tripDetails || {}),
    id: searchVoyage?.id || tripId || 'default_id',
    origin: origin || searchVoyage?.departure || tripDetails?.departure || '',
    destination: destination || searchVoyage?.destination || tripDetails?.destination || '',
    departureTime: departureTime || searchVoyage?.heureDepart || tripDetails?.heureDepart || '',
    departureDate: departureDate || searchVoyage?.dateDepart || tripDetails?.dateDepart || '',
    prixClassique: classicPrice || price || searchVoyage?.prixClassique || tripDetails?.prixClassique || 5000,
    prixVIP: vipPrice || searchVoyage?.prixVIP || tripDetails?.prixVIP || 7000,
    agencyName: routeAgencyName || searchAgencyDetails?.name || tripDetails?.agencyName || '',
    agencyId: agencyId || searchVoyage?.agencyId || tripDetails?.agencyId || '',
    logoUrl: searchAgencyDetails?.logoUrl || tripDetails?.logoUrl || '',
    placesClassiqueDisponibles: searchVoyage?.placesClassiqueDisponibles || tripDetails?.placesClassiqueDisponibles || 70,
    placesVIPDisponibles: searchVoyage?.placesVIPDisponibles || tripDetails?.placesVIPDisponibles || 45,
    placesClassiqueTotal: searchVoyage?.placesClassiqueTotal || tripDetails?.placesClassiqueTotal || 70,
    placesVIPTotal: searchVoyage?.placesVIPTotal || tripDetails?.placesVIPTotal || 45
  };

  // États initiaux
  const [selectedSeatType, setSelectedSeatType] = useState('Classique');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [classiqueSeats, setClassiqueSeats] = useState([]);
  const [vipSeats, setVipSeats] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [reservedSeats, setReservedSeats] = useState({
    classique: [],
    vip: []
  });

  // Calcul du prix
  useEffect(() => {
    const pricePerSeat = selectedSeatType === 'Classique' ? tripData.prixClassique : tripData.prixVIP;
    setCurrentPrice(pricePerSeat * selectedSeats.length);
  }, [selectedSeatType, selectedSeats, tripData.prixClassique, tripData.prixVIP]);

  // Récupérer les places réservées
  const fetchReservedSeats = async (voyageId) => {
    try {
      const reservationsSnapshot = await firestore()
        .collection('reservations')
        .where('voyageId', '==', voyageId)
        .where('statut', '==', 'confirmé')
        .get();

      const classiqueReserved = [];
      const vipReserved = [];

      reservationsSnapshot.forEach(doc => {
        const reservation = doc.data();
        if (reservation.seatType === 'Classique') {
          reservation.seats?.forEach(seat => classiqueReserved.push(seat.number));
        } else if (reservation.seatType === 'VIP') {
          reservation.seats?.forEach(seat => vipReserved.push(seat.number));
        }
      });

      setReservedSeats({
        classique: classiqueReserved,
        vip: vipReserved
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des places réservées:', error);
    }
  };

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!tripData.id) return;

    const unsubscribe = firestore()
      .collection('voyages')
      .doc(tripData.id)
      .onSnapshot(
        (documentSnapshot) => {
          if (documentSnapshot.exists) {
            fetchReservedSeats(tripData.id);
          }
        },
        (error) => console.error('Erreur Firebase:', error)
      );

    fetchReservedSeats(tripData.id);

    return () => unsubscribe();
  }, [tripData.id]);

  // Génération des sièges
  useEffect(() => {
    generateSeats();
  }, [reservedSeats, tripData.placesClassiqueTotal, tripData.placesVIPTotal]);

  const generateSeats = () => {
    // Sièges classiques
    const classicSeats = Array.from({ length: tripData.placesClassiqueTotal }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      label: `${i + 1}`,
      row: Math.floor(i / 4) + 1,
      column: i % 4,
      available: !reservedSeats.classique.includes(i + 1),
    }));
    setClassiqueSeats(classicSeats);

    // Sièges VIP
    const vSeats = Array.from({ length: tripData.placesVIPTotal }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      label: `V${i + 1}`,
      row: Math.floor(i / 4) + 1,
      column: i % 4,
      available: !reservedSeats.vip.includes(i + 1),
    }));
    setVipSeats(vSeats);
  };

  const handleGoBack = () => navigation.goBack();
  const toggleSeatTypeDropdown = () => setDropdownVisible(!dropdownVisible);

  const selectSeatType = (type) => {
    setSelectedSeatType(type);
    setSelectedSeats([]);
    setDropdownVisible(false);
  };

  const handleSeatSelect = (seat) => {
    if (!seat.available) {
      Alert.alert('Siège indisponible', 'Ce siège est déjà réservé.');
      return;
    }
    
    setSelectedSeats(prev => {
      const isAlreadySelected = prev.some(s => s.number === seat.number);
      
      if (isAlreadySelected) {
        return prev.filter(s => s.number !== seat.number);
      } else {
        if (prev.length >= 5) {
          Alert.alert('Limite atteinte', 'Vous ne pouvez sélectionner que 5 sièges maximum.');
          return prev;
        }
        return [...prev, seat];
      }
    });
  };

  const createTemporaryReservation = async () => {
    const reservationId = `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const reservationData = {
        id: reservationId,
        voyageId: tripData.id,
        agencyId: tripData.agencyId,
        seatType: selectedSeatType,
        seats: selectedSeats.map(seat => ({
          number: seat.number,
          label: seat.label
        })),
        numberOfSeats: selectedSeats.length,
        totalPrice: currentPrice,
        prixTotal: currentPrice,
        pricePerSeat: selectedSeatType === 'Classique' ? tripData.prixClassique : tripData.prixVIP,
        departure: tripData.origin,
        destination: tripData.destination,
        villeDepart: tripData.origin,
        villeArrivee: tripData.destination,
        departureDate: tripData.departureDate,
        dateVoyage: tripData.departureDate,
        departureTime: tripData.departureTime,
        heureDepart: tripData.departureTime,
        reservationDate: firestore.FieldValue.serverTimestamp(),
        dateReservation: new Date().toISOString().split('T')[0],
        heureReservation: new Date().toTimeString().split(' ')[0],
        statut: 'en_attente',
        statutPaiement: 'en_attente',
        paymentStatus: 'en_attente',
        createdAt: firestore.FieldValue.serverTimestamp(),
        nomAgence: tripData.agencyName,
        logoAgence: tripData.logoUrl,
      };

      await firestore().collection('reservations').doc(reservationId).set(reservationData);
      return { success: true, reservationId, reservationData };
    } catch (error) {
      console.error('Erreur lors de la création de la réservation temporaire:', error);
      throw error;
    }
  };

  const handleContinue = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un siège');
      return;
    }

    const availableSeats = selectedSeatType === 'Classique' 
      ? tripData.placesClassiqueDisponibles 
      : tripData.placesVIPDisponibles;
    
    if (selectedSeats.length > availableSeats) {
      Alert.alert(
        'Places insuffisantes', 
        `Il ne reste que ${availableSeats} place(s) ${selectedSeatType.toLowerCase()}(s) disponible(s).`
      );
      return;
    }

    setIsLoading(true);

    try {
      const reservationResult = await createTemporaryReservation();
      
      if (reservationResult.success) {
        navigation.navigate(ROUTES.PAYMENT, {
          reservationData: reservationResult.reservationData,
          reservationId: reservationResult.reservationId
        });
      }
    } catch (error) {
      Alert.alert(
        'Erreur', 
        'Une erreur est survenue lors de la création de la réservation.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const organizeSeatsIntoRows = (seats) => {
    return seats.reduce((rows, seat) => {
      if (!rows[seat.row]) rows[seat.row] = [];
      rows[seat.row].push(seat);
      return rows;
    }, []);
  };

  const renderSeats = () => {
    const seats = selectedSeatType === 'Classique' ? classiqueSeats : vipSeats;
    const rows = organizeSeatsIntoRows(seats);

    return (
      <View style={styles.seatLayout}>
        {rows.map((row, rowIndex) => (
          row && Array.isArray(row) && (
            <View key={`row-${rowIndex}`} style={styles.seatRow}>
              {row.map(seat => {
                const isSelected = selectedSeats.some(s => s.number === seat.number);
                const isReserved = !seat.available;
                
                return (
                  <TouchableOpacity
                    key={seat.id}
                    style={[
                      styles.seat,
                      selectedSeatType === 'VIP' && styles.vipSeat,
                      isReserved && styles.unavailableSeat,
                      isSelected && styles.selectedSeat
                    ]}
                    onPress={() => handleSeatSelect(seat)}
                    disabled={isReserved || isLoading}
                  >
                    <Text style={[
                      styles.seatLabel,
                      isReserved && styles.unavailableSeatLabel,
                      isSelected && styles.selectedSeatLabel
                    ]}>
                      {seat.label}
                    </Text>
                  </TouchableOpacity>
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (e) {
      return '';
    }
  };

  const refreshData = async () => {
    if (!tripData.id) {
      Alert.alert('Erreur', 'ID de voyage invalide');
      return;
    }

    setIsLoading(true);
    try {
      await fetchReservedSeats(tripData.id);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour les données');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choisissez vos places</Text>
        <TouchableOpacity onPress={refreshData} style={styles.backButton} disabled={isLoading}>
          <Icon name="refresh-cw" size={18} color={isLoading ? "#ccc" : "#007bff"} />
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Traitement en cours...</Text>
        </View>
      )}

      {/* Journey Card */}
      <View style={styles.journeyCard}>
        <Text style={styles.cityName}>{tripData.origin}</Text>
        <View style={styles.directionIconContainer}>
          <MaterialCommunityIcons name="arrow-right-thick" size={24} color="white" />
        </View>
        <Text style={styles.cityName}>{tripData.destination}</Text>
      </View>

      {/* Trip Info */}
      <View style={styles.tripInfoCard}>
        <Text style={styles.tripInfoText}>
          Départ: {tripData.departureTime} - {formatDate(tripData.departureDate)}
        </Text>
      </View>

      {/* Agency Info */}
      <View style={styles.agencyInfoContainer}>
        <Image 
          source={{ uri: tripData.logoUrl }} 
          style={styles.agencyLogo}
          defaultSource={{ uri: 'https://via.placeholder.com/50' }}
        />
        <View style={styles.agencyInfo}>
          <Text style={styles.agencyName}>{tripData.agencyName}</Text>
          <Text style={styles.availableSeats}>
            Places disponibles: Classique ({tripData.placesClassiqueDisponibles}), VIP ({tripData.placesVIPDisponibles})
          </Text>
        </View>
      </View>

      {/* Seat Type Selection */}
      <View style={styles.seatTypeContainer}>
        <TouchableOpacity onPress={toggleSeatTypeDropdown} style={styles.seatTypeSelector}>
          <Text style={styles.seatTypeText}>{selectedSeatType}</Text>
          <Icon name={dropdownVisible ? "chevron-up" : "chevron-down"} size={16} color="#000" />
        </TouchableOpacity>
        
        {dropdownVisible && (
          <View style={styles.dropdown}>
            <TouchableOpacity 
              style={[styles.dropdownItem, selectedSeatType === 'Classique' && styles.selectedDropdownItem]} 
              onPress={() => selectSeatType('Classique')}
            >
              <Text style={styles.dropdownItemText}>Classique</Text>
              <Text style={styles.priceText}>{formatPrice(tripData.prixClassique)}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dropdownItem, selectedSeatType === 'VIP' && styles.selectedDropdownItem]} 
              onPress={() => selectSeatType('VIP')}
            >
              <Text style={styles.dropdownItemText}>VIP</Text>
              <Text style={styles.priceText}>{formatPrice(tripData.prixVIP)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Price Display */}
      <View style={styles.priceDisplay}>
        <Text style={styles.priceLabel}>Sièges sélectionnés: {selectedSeats.length}/5</Text>
        <Text style={styles.priceValue}>{formatPrice(currentPrice)}</Text>
      </View>

      {/* Info Message */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Prix par siège: {selectedSeatType === 'Classique' 
            ? formatPrice(tripData.prixClassique) 
            : formatPrice(tripData.prixVIP)} • Maximum 5 places
        </Text>
      </View>

      {/* Seat Selection */}
      <Text style={styles.sectionTitle}>Choisir les sièges</Text>
      <ScrollView style={styles.seatSelectionContainer}>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4169E1' }]} />
            <Text style={styles.legendText}>Réservé</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ffcc00' }]} />
            <Text style={styles.legendText}>Vos places</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: selectedSeatType === 'VIP' ? '#8A2BE2' : '#e0e0e0' }]} />
            <Text style={styles.legendText}>Disponible</Text>
          </View>
        </View>

        {renderSeats()}
      </ScrollView>

      {/* Continue Button */}
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
              : `Continuer avec ${selectedSeats.length > 1 ? 'ces places' : 'cette place'} (${formatPrice(currentPrice)})`
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
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    elevation: 2,
  },
  backButton: {
    padding: 5,
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
  journeyCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#007bff',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  cityName: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  directionIconContainer: {
    backgroundColor: '#0056b3',
    padding: 5,
    borderRadius: 5,
  },
  tripInfoCard: {
    backgroundColor: '#fff',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    elevation: 1,
  },
  tripInfoText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  agencyInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    elevation: 2,
  },
  agencyLogo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    borderRadius: 25,
    marginRight: 10,
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  availableSeats: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  seatTypeContainer: {
    marginHorizontal: 20,
    marginTop: 15,
    zIndex: 10,
  },
  seatTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  seatTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    marginTop: 5,
    borderRadius: 8,
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  selectedDropdownItem: {
    backgroundColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    color: '#888',
  },
  priceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 10,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
  seatSelectionContainer: {
    marginTop: 10,
    marginHorizontal: 10,
    paddingBottom: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 15,
    height: 15,
    marginRight: 5,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
  },
  seatLayout: {
    alignItems: 'center',
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  seat: {
    width: 35,
    height: 35,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  vipSeat: {
    backgroundColor: '#8A2BE2',
  },
  unavailableSeat: {
    backgroundColor: '#4169E1',
  },
  selectedSeat: {
    backgroundColor: '#ffcc00',
  },
  seatLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  unavailableSeatLabel: {
    color: '#fff',
  },
  selectedSeatLabel: {
    color: '#000',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  continueButton: {
    backgroundColor: '#3D56F0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  infoContainer: {
    backgroundColor: '#f0f8ff',
    padding: 8,
    marginHorizontal: 20,
    marginTop: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cce0ff',
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});

export default SeatSelectionScreen;