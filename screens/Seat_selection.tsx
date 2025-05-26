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

const SeatSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Extraction des paramètres avec valeurs par défaut
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

  // Détermine la source des données
  const isFromSearch = !!searchVoyage?.id || (origin && destination);

  // Normalisation des données avec protections
  const tripData = isFromSearch ? { 
    ...searchVoyage,
    id: searchVoyage?.id || tripId || 'default_id',
    origin: origin || searchVoyage?.departure || '',
    destination: destination || searchVoyage?.destination || '',
    departureTime: departureTime || searchVoyage?.heureDepart || '',
    departureDate: departureDate || searchVoyage?.dateDepart || '',
    prixClassique: classicPrice || price || searchVoyage?.prixClassique || 0,
    prixVIP: vipPrice || searchVoyage?.prixVIP || 0,
    agencyName: routeAgencyName || searchAgencyDetails?.name || '',
    agencyId: agencyId || searchVoyage?.agencyId || '',
    logoUrl: searchAgencyDetails?.logoUrl || '',
    placesClassiqueDisponibles: searchVoyage?.placesClassiqueDisponibles || 0,
    placesVIPDisponibles: searchVoyage?.placesVIPDisponibles || 0,
    placesClassiqueTotal: searchVoyage?.placesClassiqueTotal || 70,
    placesVIPTotal: searchVoyage?.placesVIPTotal || 45
  } : tripDetails || {};

  // Données du voyage avec valeurs par défaut
  const voyage = {
    id: tripData.id || 'default_trip_id',
    departure: tripData.origin || tripData.departure || 'Ville inconnue',
    destination: tripData.destination || 'Ville inconnue',
    heureDepart: tripData.departureTime || tripData.heureDepart || '--:--',
    dateDepart: tripData.departureDate || tripData.dateDepart || new Date().toISOString(),
    agencyId: tripData.agencyId || agencyId || '',
  };

  // Informations sur l'agence avec valeurs par défaut
  const agencyName = tripData.agencyName || routeAgencyName || 'Agence inconnue';
  const logoUrl = tripData.logoUrl || 'https://via.placeholder.com/50';

  // Prix avec valeurs par défaut
  const prixClassique = tripData.prixClassique ? Number(tripData.prixClassique) : 5000;
  const prixVip = tripData.prixVIP ? Number(tripData.prixVIP) : 7000;

  // États pour les places disponibles (synchronisés avec Firebase)
  const [placesClassiqueDisponibles, setPlacesClassiqueDisponibles] = useState(Number(tripData.placesClassiqueDisponibles) || 70);
  const [placesVIPDisponibles, setPlacesVIPDisponibles] = useState(Number(tripData.placesVIPDisponibles) || 45);
  const [placesClassiqueTotal] = useState(Number(tripData.placesClassiqueTotal) || 70);
  const [placesVIPTotal] = useState(Number(tripData.placesVIPTotal) || 45);

  const agencyDetails = {
    id: tripData.agencyId || agencyId || 'default_agency_id',
    name: agencyName,
    logoUrl: logoUrl,
    pricing: {
      Classique: prixClassique,
      VIP: prixVip
    }
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

  // Écouter les changements en temps réel depuis Firebase
  useEffect(() => {
    if (!voyage.id || voyage.id === 'default_trip_id') {
      console.log('ID de voyage invalide, impossible d\'écouter les changements Firebase');
      return;
    }

    console.log('Écoute des changements Firebase pour le voyage:', voyage.id);
    
    const unsubscribe = firestore()
      .collection('voyages')
      .doc(voyage.id)
      .onSnapshot(
        (documentSnapshot) => {
          if (documentSnapshot.exists) {
            const data = documentSnapshot.data();
            console.log('Données mises à jour depuis Firebase:', data);
            
            // Mettre à jour les places disponibles
            setPlacesClassiqueDisponibles(data.placesClassiqueDisponibles || 0);
            setPlacesVIPDisponibles(data.placesVIPDisponibles || 0);
            
            // Récupérer les places réservées
            fetchReservedSeats(voyage.id);
          }
        },
        (error) => {
          console.error('Erreur lors de l\'écoute des changements Firebase:', error);
        }
      );

    // Récupération initiale des places réservées
    fetchReservedSeats(voyage.id);

    return () => unsubscribe();
  }, [voyage.id]);

  // Récupérer les places réservées depuis Firebase
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
          reservation.seats?.forEach(seat => {
            classiqueReserved.push(seat.number);
          });
        } else if (reservation.seatType === 'VIP') {
          reservation.seats?.forEach(seat => {
            vipReserved.push(seat.number);
          });
        }
      });

      setReservedSeats({
        classique: classiqueReserved,
        vip: vipReserved
      });

      console.log('Places réservées récupérées:', { classiqueReserved, vipReserved });
    } catch (error) {
      console.error('Erreur lors de la récupération des places réservées:', error);
    }
  };

  // Génération des sièges
  useEffect(() => {
    generateSeats();
  }, [reservedSeats, placesClassiqueTotal, placesVIPTotal]);

  // Calcul du prix
  useEffect(() => {
    const pricePerSeat = selectedSeatType === 'Classique' ? prixClassique : prixVip;
    const calculatedPrice = pricePerSeat * selectedSeats.length;
    setCurrentPrice(isNaN(calculatedPrice) ? 0 : calculatedPrice);
  }, [selectedSeatType, selectedSeats, prixClassique, prixVip]);

  const generateSeats = () => {
    // Sièges classiques (4 sièges par rangée)
    const classicSeats = Array.from({ length: placesClassiqueTotal }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      label: `${i + 1}`,
      row: Math.floor(i / 4) + 1,
      column: i % 4,
      available: !reservedSeats.classique.includes(i + 1),
    }));
    setClassiqueSeats(classicSeats);

    // Sièges VIP (2 sièges par rangée)
    const vSeats = Array.from({ length: placesVIPTotal }, (_, i) => ({
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
    setSelectedSeats([]); // Réinitialise les sièges sélectionnés
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
        // Désélectionner le siège
        return prev.filter(s => s.number !== seat.number);
      } else {
        // Vérifier le nombre maximum de sièges sélectionnables (5 maximum)
        if (prev.length >= 5) {
          Alert.alert('Limite atteinte', 'Vous ne pouvez sélectionner que 5 sièges maximum.');
          return prev;
        }
        // Sélectionner le siège
        return [...prev, seat];
      }
    });
  };

  const createTemporaryReservation = async (seatsToReserve) => {
    const reservationId = `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const reservationData = {
        id: reservationId,
        voyageId: voyage.id,
        agencyId: voyage.agencyId,
        userId: 'current_user_id',
        seatType: selectedSeatType,
        typePlace: selectedSeatType,
        seats: seatsToReserve.map(seat => ({
          number: seat.number,
          label: seat.label
        })),
        numberOfSeats: seatsToReserve.length,
        totalPrice: currentPrice,
        prixTotal: currentPrice,
        pricePerSeat: selectedSeatType === 'Classique' ? prixClassique : prixVip,
        departure: voyage.departure,
        destination: voyage.destination,
        villeDepart: voyage.departure,
        villeArrivee: voyage.destination,
        departureDate: voyage.dateDepart,
        dateVoyage: voyage.dateDepart,
        departureTime: voyage.heureDepart,
        heureDepart: voyage.heureDepart,
        reservationDate: firestore.FieldValue.serverTimestamp(),
        dateReservation: new Date().toISOString().split('T')[0],
        heureReservation: new Date().toTimeString().split(' ')[0],
        statut: 'en_attente',
        statutPaiement: 'en_attente',
        paymentStatus: 'en_attente',
        createdAt: firestore.FieldValue.serverTimestamp(),
        nomAgence: agencyDetails.name,
        logoAgence: agencyDetails.logoUrl,
      };

      await firestore().collection('reservations').doc(reservationId).set(reservationData);

      console.log('Réservation temporaire créée:', reservationId);
      return { success: true, reservationId, reservationData };

    } catch (error) {
      console.error('Erreur lors de la création de la réservation temporaire:', error);
      throw error;
    }
  };

  const handleReservation = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un siège');
      return;
    }

    const availableSeats = selectedSeatType === 'Classique' ? placesClassiqueDisponibles : placesVIPDisponibles;
    if (selectedSeats.length > availableSeats) {
      Alert.alert(
        'Places insuffisantes', 
        `Il ne reste que ${availableSeats} place(s) ${selectedSeatType.toLowerCase()}(s) disponible(s).`
      );
      return;
    }

    const currentReservedSeats = selectedSeatType === 'Classique' ? reservedSeats.classique : reservedSeats.vip;
    const unavailableSeats = selectedSeats.filter(seat => currentReservedSeats.includes(seat.number));

    if (unavailableSeats.length > 0) {
      Alert.alert(
        'Sièges indisponibles', 
        'Certains sièges sélectionnés ne sont plus disponibles. Veuillez en choisir d\'autres.',
        [{ text: 'OK', onPress: () => setSelectedSeats([]) }]
      );
      return;
    }

    Alert.alert(
      'Confirmer la sélection',
      `Procéder avec ${selectedSeats.length} place(s) ${selectedSeatType} pour ${formatPrice(currentPrice)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: () => processReservation() }
      ]
    );
  };

  const processReservation = async () => {
    setIsLoading(true);

    try {
      const reservationResult = await createTemporaryReservation(selectedSeats);

      if (reservationResult.success) {
        const reservationData = reservationResult.reservationData;
        
        setSelectedSeats([]);

     navigation.navigate('Payment', {
  reservationData: reservationData,
  reservationId: reservationResult.reservationId
});
      }
    } catch (error) {
      console.error('Erreur lors du processus de réservation:', error);
      Alert.alert(
        'Erreur', 
        'Une erreur est survenue lors de la création de la réservation. Veuillez réessayer.',
        [
          { text: 'OK' },
          { text: 'Réessayer', onPress: () => processReservation() }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const organizeSeatsIntoRows = (seats) => {
    if (!Array.isArray(seats)) return [];
    
    return seats.reduce((rows, seat) => {
      if (!rows[seat.row]) rows[seat.row] = [];
      rows[seat.row].push(seat);
      return rows;
    }, []);
  };

  const renderSeats = () => {
    const seats = selectedSeatType === 'Classique' ? classiqueSeats : vipSeats;
    const rows = organizeSeatsIntoRows(seats);

    if (!Array.isArray(rows)) return null;

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
    if (!voyage.id || voyage.id === 'default_trip_id') {
      Alert.alert('Erreur', 'ID de voyage invalide');
      return;
    }

    setIsLoading(true);
    try {
      await fetchReservedSeats(voyage.id);
      Alert.alert('Succès', 'Données mises à jour');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour les données');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choisissez vos places</Text>
        <TouchableOpacity onPress={refreshData} style={styles.backButton} disabled={isLoading}>
          <Icon name="refresh-cw" size={18} color={isLoading ? "#ccc" : "#007bff"} />
        </TouchableOpacity>
      </View>

      {/* Indicateur de chargement global */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Traitement en cours...</Text>
        </View>
      )}

      {/* Carte du trajet */}
      <View style={styles.journeyCard}>
        <Text style={styles.cityName}>{voyage.departure}</Text>
        <View style={styles.directionIconContainer}>
          <MaterialCommunityIcons name="arrow-right-thick" size={24} color="white" />
        </View>
        <Text style={styles.cityName}>{voyage.destination}</Text>
      </View>

      {/* Informations supplémentaires sur le voyage */}
      <View style={styles.tripInfoCard}>
        <Text style={styles.tripInfoText}>
          Départ: {voyage.heureDepart} - {formatDate(voyage.dateDepart)}
        </Text>
      </View>

      {/* Informations sur l'agence */}
      <View style={styles.agencyInfoContainer}>
        <Image 
          source={{ uri: agencyDetails.logoUrl }} 
          style={styles.agencyLogo}
          defaultSource={{ uri: 'https://via.placeholder.com/50' }}
        />
        <View style={styles.agencyInfo}>
          <Text style={styles.agencyName}>{agencyDetails.name}</Text>
          <Text style={styles.availableSeats}>
            Places disponibles: Classique ({placesClassiqueDisponibles}), VIP ({placesVIPDisponibles})
          </Text>
        </View>
      </View>

      {/* Sélection du type de siège */}
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
              <Text style={styles.priceText}>{formatPrice(prixClassique)}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dropdownItem, selectedSeatType === 'VIP' && styles.selectedDropdownItem]} 
              onPress={() => selectSeatType('VIP')}
            >
              <Text style={styles.dropdownItemText}>VIP</Text>
              <Text style={styles.priceText}>{formatPrice(prixVip)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Affichage du prix */}
      <View style={styles.priceDisplay}>
        <Text style={styles.priceLabel}>Sièges sélectionnés: {selectedSeats.length}/5</Text>
        <Text style={styles.priceValue}>{formatPrice(currentPrice)}</Text>
      </View>

      {/* Message d'information */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Prix par siège: {selectedSeatType === 'Classique' 
            ? formatPrice(prixClassique) 
            : formatPrice(prixVip)} • Maximum 5 places
        </Text>
      </View>

      {/* Sélection des sièges */}
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

      {/* Bouton de réservation */}
      <TouchableOpacity 
        style={[
          styles.reserveButton, 
          (selectedSeats.length === 0 || isLoading) && styles.disabledButton
        ]}
        onPress={handleReservation}
        disabled={selectedSeats.length === 0 || isLoading}
      >
        <Text style={styles.reserveButtonText}>
          {isLoading 
            ? 'Traitement en cours...' 
            : `Continuer avec ${selectedSeats.length > 1 ? 'ces places' : 'cette place'} (${formatPrice(currentPrice)})`
          }
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Styles
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
  reserveButton: {
    backgroundColor: '#007bff',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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