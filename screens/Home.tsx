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
import { useNavigation, NavigationProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Dropdown } from 'react-native-element-dropdown';
import moment from 'moment';
import { ROUTES } from '../constants/routes';
import 'moment/locale/fr';

type RootStackParamList = {
  SEARCH_RESULTS: {
    departure: string;
    destination: string;
    date?: string;
    time?: string;
  };
  AGENCY_SELECT: undefined;
  LOGIN: undefined;
  PROFILE: undefined;
  // ...ajoutez ici vos autres routes
};

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [departureCity, setDepartureCity] = useState(null);
  const [destinationCity, setDestinationCity] = useState(null);
  const [departureDate, setDepartureDate] = useState(null);
  const [departureTime, setDepartureTime] = useState(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [departureCities, setDepartureCities] = useState([]);
  const [destinationCities, setDestinationCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    departure: '',
    destination: '',
    date: new Date(),
    time: new Date(),
  });

  useEffect(() => {
    fetchVoyages();
    
    // Vérifier l'état d'authentification
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        console.log('[HomeScreen] No authenticated user found');
      } else {
        console.log('[HomeScreen] Current user:', user.uid);
      }
    });

    return () => unsubscribe();
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

  const resetSearchForm = () => {
    setFormData({
      departure: '',
      destination: '', 
      date: new Date(),
      time: new Date(),
    });
  };

  const handleSearch = () => {
    // Vérifiez que les champs requis sont remplis
    if (!departureCity || !destinationCity) {
      Alert.alert('Erreur', 'Veuillez sélectionner une ville de départ et d\'arrivée');
      return;
    }

    // Navigation vers l'écran des résultats avec les paramètres
    navigation.navigate(ROUTES.SEARCH_RESULTS, {
      departure: departureCity,
      destination: destinationCity,
      date: departureDate ? moment(departureDate).format('YYYY-MM-DD') : undefined,
      time: departureTime ? moment(departureTime).format('HH:mm') : undefined
    });

    // Réinitialiser le formulaire après la navigation
    resetSearchForm();
  };

  const navigateToAgencySelection = () => {
    navigation.navigate(ROUTES.AGENCY_SELECT);
  };

  const navigateToProfile = () => {
    if (!currentUser) {
      Alert.alert(
        'Non connecté',
        'Vous devez être connecté pour accéder au profil.',
        [
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate(ROUTES.LOGIN)
          },
          {
            text: 'Annuler',
            style: 'cancel'
          }
        ]
      );
    } else {
      navigation.navigate('ProfileTab', { screen: ROUTES.PROFILE });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bienvenue</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.notificationButton}>
            <Icon name="bell" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={navigateToProfile}>
            <Icon name="user" size={24} color="#000" />
          </TouchableOpacity>
        </View>
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
                  setFormData(prev => ({ ...prev, departure: item.value }));
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
                  setFormData(prev => ({ ...prev, destination: item.value }));
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
                <Icon name="briefcase" size={18} color="#333" style={styles.agencyButtonIcon} />
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
  headerButtons: {
    flexDirection: 'row',
  },
  notificationButton: {
    padding: 5,
    marginRight: 10,
  },
  profileButton: {
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
    borderColor: '#4169E1',
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  agencyButtonIcon: {
    marginRight: 8,
  },
  agencyButtonText: {
    color: '#4169E1',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loader: {
    marginTop: 20,
  },
});

export default HomeScreen;