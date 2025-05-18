import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Modal,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const SeatSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Extraction des paramètres avec toutes les possibilités
  const { 
    tripId, 
    agencyId, 
    tripDetails, 
    searchResult, 
    origin, 
    destination, 
    departureTime, 
    departureDate, 
    price, 
    classicPrice, 
    vipPrice, 
    agencyName: routeAgencyName,
    // Données venant de SearchResultsScreen
    voyage: searchVoyage,
    agencyDetails: searchAgencyDetails
  } = route.params || {};

  // Détermine la source des données
  const isFromSearch = !!searchVoyage || (origin && destination);

  // Normalisation des données
  const tripData = isFromSearch ? { 
    ...searchVoyage,
    id: searchVoyage?.id || tripId,
    origin: origin || searchVoyage?.departure,
    destination: destination || searchVoyage?.destination,
    departureTime: departureTime || searchVoyage?.heureDepart,
    departureDate: departureDate || searchVoyage?.date,
    prixClassique: classicPrice || price || searchVoyage?.price,
    prixVIP: vipPrice || searchVoyage?.vipPrice,
    agencyName: routeAgencyName || searchAgencyDetails?.name,
    agencyId: agencyId || searchVoyage?.agencyId,
    logoUrl: searchAgencyDetails?.logoUrl,
    availableClassicSeats: searchVoyage?.availableClassicSeats,
    availableVIPSeats: searchVoyage?.availableVIPSeats
  } : tripDetails || {};

  console.log('Source des données:', isFromSearch ? 'SearchResultsScreen' : 'AgencyDetailScreen');
  console.log('Données normalisées:', tripData);

  // Données du voyage normalisées
  const voyage = {
    id: tripData.id || 'default_trip_id',
    departure: tripData.origin || tripData.departure || 'Ville de départ',
    destination: tripData.destination || 'Ville d\'arrivée',
    heureDepart: tripData.departureTime || tripData.heureDepart || '--:--',
    dateDepart: tripData.departureDate || tripData.date || new Date().toISOString(),
  };

  // Informations sur l'agence
  const agencyName = tripData.agencyName || routeAgencyName || 'Agence de voyage';
  const logoUrl = tripData.logoUrl || 'https://via.placeholder.com/50';

  // Prix
  const prixClassique = tripData.prixClassique ? Number(tripData.prixClassique) : 5000;
  const prixVip = tripData.prixVIP ? Number(tripData.prixVIP) : prixClassique + 1000;

  // Places disponibles
  const placesClassiqueDisponibles = Number(tripData.availableClassicSeats) || Number(tripData.placesClassiqueDisponibles) || 0;
  const placesVIPDisponibles = Number(tripData.availableVIPSeats) || Number(tripData.placesVIPDisponibles) || 0;

  const agencyDetails = {
    id: tripData.agencyId || agencyId || 'default_agency_id',
    name: agencyName,
    logoUrl: logoUrl,
    pricing: {
      Classique: prixClassique,
      VIP: prixVip
    }
  };

  // États pour la sélection des sièges
  const [selectedSeatType, setSelectedSeatType] = useState('Classique');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [classiqueSeats, setClassiqueSeats] = useState([]);
  const [vipSeats, setVipSeats] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);

  // Sièges déjà réservés
  const reservedClassiqueSeats = tripData.reservedClassiqueSeats || [5, 12, 20, 33, 48];
  const reservedVipSeats = tripData.reservedVipSeats || [2, 8, 15];

  // Génération des sièges disponibles
  useEffect(() => {
    generateSeats();
  }, []);

  // Mise à jour du prix
  useEffect(() => {
    const pricePerSeat = selectedSeatType === 'Classique' ? prixClassique : prixVip;
    const calculatedPrice = pricePerSeat * selectedSeats.length;
    setCurrentPrice(isNaN(calculatedPrice) ? 0 : calculatedPrice);
  }, [selectedSeatType, selectedSeats, prixClassique, prixVip]);

  const generateSeats = () => {
    // Sièges classiques
    const maxClassiqueSeats = Math.max(placesClassiqueDisponibles + reservedClassiqueSeats.length, 70);
    const classicSeats = Array.from({ length: maxClassiqueSeats }, (_, i) => ({
      id: i + 1,
      label: `${i + 1}`,
      row: Math.floor(i / 4) + 1,
      column: i % 4,
      available: !reservedClassiqueSeats.includes(i + 1),
    }));
    setClassiqueSeats(classicSeats);

    // Sièges VIP
    const maxVipSeats = Math.max(placesVIPDisponibles + reservedVipSeats.length, 24);
    const vSeats = Array.from({ length: maxVipSeats }, (_, i) => ({
      id: i + 1,
      label: `V${i + 1}`,
      row: Math.floor(i / 2) + 1,
      column: i % 2,
      available: !reservedVipSeats.includes(i + 1),
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
    if (!seat.available) return;
    
    setSelectedSeats(prev => {
      if (prev.some(s => s.id === seat.id)) {
        return prev.filter(s => s.id !== seat.id);
      }
      return [...prev, seat];
    });
  };

  const handleReservation = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un siège');
      return;
    }

    const reservationData = {
      voyage,
      agencyDetails,
      selectedSeats,
      seatType: selectedSeatType,
      price: currentPrice,
      date: new Date().toISOString(),
    };

    const voyageData = {
      agencyId: agencyDetails.id,
      agencyName: agencyDetails.name,
      departure: voyage.departure,
      destination: voyage.destination,
      departureTime: voyage.heureDepart,
      seatType: selectedSeatType,
      seatCount: selectedSeats.length,
      totalPrice: currentPrice,
      voyageId: voyage.id,
      dateDepart: voyage.dateDepart,
    };

    navigation.navigate('Payment', {
      reservationData,
      voyageData
    });
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
          <View key={`row-${rowIndex}`} style={styles.seatRow}>
            {row.map(seat => (
              <TouchableOpacity
                key={seat.id}
                style={[
                  styles.seat,
                  selectedSeatType === 'VIP' && styles.vipSeat,
                  !seat.available && styles.unavailableSeat,
                  selectedSeats.some(s => s.id === seat.id) && styles.selectedSeat
                ]}
                onPress={() => handleSeatSelect(seat)}
                disabled={!seat.available}
              >
                <Text style={[
                  styles.seatLabel,
                  !seat.available && styles.unavailableSeatLabel,
                  selectedSeats.some(s => s.id === seat.id) && styles.selectedSeatLabel
                ]}>
                  {seat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choisissez vos places</Text>
        <View style={styles.backButton} />
      </View>

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
        <Text style={styles.priceLabel}>Sièges sélectionnés: {selectedSeats.length}</Text>
        <Text style={styles.priceValue}>{formatPrice(currentPrice)}</Text>
      </View>

      {/* Message d'information */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Prix par siège: {selectedSeatType === 'Classique' 
            ? formatPrice(prixClassique) 
            : formatPrice(prixVip)}
        </Text>
      </View>

      {/* Sélection des sièges */}
      <Text style={styles.sectionTitle}>Choisir les sièges</Text>
      <ScrollView style={styles.seatSelectionContainer}>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4169E1' }]} />
            <Text style={styles.legendText}>Siège Réservé</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ffcc00' }]} />
            <Text style={styles.legendText}>Vos places</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: selectedSeatType === 'VIP' ? '#8A2BE2' : '#e0e0e0' }]} />
            <Text style={styles.legendText}>Siège Disponible</Text>
          </View>
        </View>

        {renderSeats()}
      </ScrollView>

      {/* Bouton de réservation */}
      <TouchableOpacity 
        style={[styles.reserveButton, selectedSeats.length === 0 && styles.disabledButton]}
        onPress={handleReservation}
        disabled={selectedSeats.length === 0}
      >
        <Text style={styles.reserveButtonText}>
          Réserver {selectedSeats.length > 1 ? 'vos places' : 'votre place'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Styles (identique à votre version originale)
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