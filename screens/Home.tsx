import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Dropdown } from 'react-native-element-dropdown';
import moment from 'moment';
import 'moment/locale/fr';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [departureCity, setDepartureCity] = useState(null);
  const [destinationCity, setDestinationCity] = useState(null);
  const [departureDate, setDepartureDate] = useState(null);
  const [departureTime, setDepartureTime] = useState(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [departureCities, setDepartureCities] = useState([]);
  const [destinationCities, setDestinationCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVoyages();
  }, []);

  const fetchVoyages = async () => {
    try {
      setLoading(true);
      const voyagesSnapshot = await firestore().collection('voyages').get();
      
      const departureSet = new Set();
      const destinationSet = new Set();

      voyagesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.departure) departureSet.add(data.departure);
        if (data.destination) destinationSet.add(data.destination);
      });

      const departures = Array.from(departureSet).sort().map(city => ({ label: city, value: city }));
      const destinations = Array.from(destinationSet).sort().map(city => ({ label: city, value: city }));

      setDepartureCities(departures);
      setDestinationCities(destinations);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des villes:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les données des villes. Veuillez réessayer.'
      );
      setLoading(false);
    }
  };

  const handleDateConfirm = (date) => {
    setDepartureDate(date);
    setDatePickerVisible(false);
  };

  const handleTimeConfirm = (time) => {
    setDepartureTime(time);
    setTimePickerVisible(false);
  };

  const handleSearch = () => {
    if (!departureCity || !destinationCity || !departureDate) {
      Alert.alert(
        'Champs incomplets',
        'Veuillez remplir tous les champs obligatoires (départ, destination et date)'
      );
      return;
    }

    const formattedDate = moment(departureDate).format('YYYY-MM-DD');
    const formattedTime = departureTime ? moment(departureTime).format('HH[h]mm') : null;

    navigation.navigate('SearchResults', {
      departure: departureCity,
      destination: destinationCity,
      date: formattedDate,
      time: formattedTime,
    });
  };

  const navigateToAgencySelection = () => {
    navigation.navigate('SelectAgency'); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bienvenue</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="bell" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.busImageContainer}>
          <Image 
            source={require('../assets/images/busFondBon.jpeg')} 
            style={styles.busImage} 
            resizeMode="contain"
          />
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchTitle}>Où allons-nous aujourd'hui ?</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#4169E1" style={styles.loader} />
          ) : (
            <>
              <Text style={styles.inputLabel}>Point de départ</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={departureCities}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Choisir un point de depart"
                value={departureCity}
                onChange={item => {
                  setDepartureCity(item.value);
                }}
              />
              
              <Text style={styles.inputLabel}>Destination</Text>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={destinationCities}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Choisir une destination"
                value={destinationCity}
                onChange={item => {
                  setDestinationCity(item.value);
                }}
              />
              
              <View style={styles.dateTimeContainer}>
                <View style={styles.dateContainer}>
                  <Text style={styles.inputLabel}>Date de départ</Text>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setDatePickerVisible(true)}
                  >
                    <Text style={departureDate ? styles.dateTimeText : styles.placeholderStyle}>
                      {departureDate ? moment(departureDate).format('DD/MM/YYYY') : 'Choisir une date'}
                    </Text>
                  </TouchableOpacity>
                  
                  <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={handleDateConfirm}
                    onCancel={() => setDatePickerVisible(false)}
                    minimumDate={new Date()}
                    locale="fr-FR"
                  />
                </View>
                
                <View style={styles.dateContainer}>
                  <Text style={styles.inputLabel}>Heure de départ</Text>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setTimePickerVisible(true)}
                  >
                    <Text style={departureTime ? styles.dateTimeText : styles.placeholderStyle}>
                      {departureTime ? moment(departureTime).format('HH:mm') : 'Choisir une heure'}
                    </Text>
                  </TouchableOpacity>
                  
                  <DateTimePickerModal
                    isVisible={isTimePickerVisible}
                    mode="time"
                    onConfirm={handleTimeConfirm}
                    onCancel={() => setTimePickerVisible(false)}
                    locale="fr-FR"
                    is24Hour={true}
                  />
                </View>
              </View>
              
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchButtonText}>RECHERCHER</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.agencyButton} onPress={navigateToAgencySelection}>
                <Text style={styles.agencyButtonText}>CHOISIR UNE AGENCE</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#ffffff',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  notificationButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  busImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  busImage: {
    width: '80%',
    height: 120,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4169E1',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
  },
  dropdown: {
    height: 50,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  selectedTextStyle: {
    fontSize: 14,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateContainer: {
    width: '48%',
  },
  dateInput: {
    height: 50,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    justifyContent: 'center',
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#4169E1',
    borderRadius: 5,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  agencyButton: {
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  agencyButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    marginVertical: 50,
  },
});

export default HomeScreen;