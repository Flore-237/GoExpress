import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Text, 
  ActivityIndicator,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import Feather from 'react-native-vector-icons/Feather';

const HomeScreen = ({ navigation }) => {
  // États pour les sélections
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [showDepartureList, setShowDepartureList] = useState(false);
  const [showDestinationList, setShowDestinationList] = useState(false);
  const [departures, setDepartures] = useState([]);
  const [destinations, setDestinations] = useState([]);
  
  // États pour la date et l'heure
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Charger les données depuis Firestore
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const agenciesSnapshot = await firestore().collection('agencies').get();
        
        const departureSet = new Set();
        const destinationSet = new Set();
        
        agenciesSnapshot.docs.forEach(doc => {
          const agencyData = doc.data();
          
          if (agencyData.departures && Array.isArray(agencyData.departures)) {
            agencyData.departures.forEach(departure => departureSet.add(departure));
          }
          
          if (agencyData.destinations && Array.isArray(agencyData.destinations)) {
            agencyData.destinations.forEach(destination => destinationSet.add(destination));
          }
        });
        
        setDepartures(Array.from(departureSet).sort());
        setDestinations(Array.from(destinationSet).sort());
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const formattedDate = format(date, 'dd/MM/yyyy', { locale: fr });
  const formattedTime = format(time, 'HH:mm', { locale: fr });

  const handleSearch = () => {
    if (!selectedDeparture || !selectedDestination) {
      alert('Veuillez sélectionner un point de départ et une destination');
      return;
    }

    navigation.navigate('SearchResults', {
      departure: selectedDeparture,
      destination: selectedDestination,
      date: formattedDate,
      time: formattedTime
    });
  };

  const handleChooseAgency = () => {
    navigation.navigate('AgencySelection');
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => {
        if (showDepartureList) {
          setSelectedDeparture(item);
        } else {
          setSelectedDestination(item);
        }
        setShowDepartureList(false);
        setShowDestinationList(false);
      }}
    >
      <Text style={styles.itemText}>{item}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Chargement en cours...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Une erreur est survenue lors du chargement des données</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Réservation de billets</Text>
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/busFondBon.jpeg')} 
          style={styles.logo} 
          resizeMode="contain"
        />
      </View>

      {/* Search Card */}
      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Planifiez votre voyage</Text>

        {/* Départ */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Départ</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => {
              setShowDepartureList(true);
              setShowDestinationList(false);
            }}
          >
            <Text style={selectedDeparture ? styles.dropdownButtonTextSelected : styles.dropdownButtonText}>
              {selectedDeparture || 'Sélectionnez un départ'}
            </Text>
            <Feather 
              name="chevron-down" 
              size={20} 
              color="#7F8C8D"
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Destination */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Destination</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => {
              setShowDestinationList(true);
              setShowDepartureList(false);
            }}
          >
            <Text style={selectedDestination ? styles.dropdownButtonTextSelected : styles.dropdownButtonText}>
              {selectedDestination || 'Sélectionnez une destination'}
            </Text>
            <Feather 
              name="chevron-down" 
              size={20} 
              color="#7F8C8D"
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Date et Heure */}
        <View style={styles.datetimeRow}>
          <View style={styles.datetimeGroup}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.datetimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datetimeButtonText}>{formattedDate}</Text>
              <Feather 
                name="calendar" 
                size={18} 
                color="#7F8C8D"
                style={styles.datetimeIcon}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.datetimeGroup}>
            <Text style={styles.inputLabel}>Heure</Text>
            <TouchableOpacity 
              style={styles.datetimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.datetimeButtonText}>{formattedTime}</Text>
              <Feather 
                name="clock" 
                size={18} 
                color="#7F8C8D"
                style={styles.datetimeIcon}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Boutons */}
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Rechercher</Text>
          <Feather 
            name="search" 
            size={18} 
            color="white"
            style={styles.buttonIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.agencyButton}
          onPress={handleChooseAgency}
        >
          <Text style={styles.agencyButtonText}>Choisir une agence</Text>
          <Feather 
            name="map-pin" 
            size={18} 
            color="#4169E1"
            style={styles.buttonIcon}
          />
        </TouchableOpacity>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            is24Hour={true}
          />
        )}
      </View>

      {/* Modals for Dropdowns */}
      <Modal
        visible={showDepartureList || showDestinationList}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDepartureList(false);
          setShowDestinationList(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FlatList
              data={showDepartureList ? departures : destinations}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
              style={styles.dropdownList}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setShowDepartureList(false);
                setShowDestinationList(false);
              }}
            >
              <Text style={styles.closeModalButtonText}>Fermer</Text>
              <Feather 
                name="x" 
                size={18} 
                color="white"
                style={styles.closeIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#4169E1',
    paddingVertical: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  logo: {
    width: '100%',
    height: 120,
  },
  searchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D5D8DC',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: 'white',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#95A5A6',
  },
  dropdownButtonTextSelected: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  dropdownIcon: {
    marginLeft: 10,
  },
  datetimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  datetimeGroup: {
    width: '48%',
  },
  datetimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D5D8DC',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: 'white',
  },
  datetimeButtonText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  datetimeIcon: {
    marginLeft: 10,
  },
  searchButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 15,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  agencyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4169E1',
    borderRadius: 8,
    paddingVertical: 16,
  },
  agencyButtonText: {
    color: '#4169E1',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '60%',
    padding: 15,
  },
  dropdownList: {
    marginBottom: 15,
  },
  listItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  itemText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  closeModalButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    borderRadius: 8,
    padding: 12,
  },
  closeModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeIcon: {
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7F8C8D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F5F7FA',
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;