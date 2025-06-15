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
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Dropdown } from 'react-native-element-dropdown';
import moment from 'moment';
import { ROUTES } from '../constants/routes';
import 'moment/locale/fr';

interface CityOption {
  label: string;
  value: string;
}

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
  MainTabs: { screen?: string };
  Notification: undefined;
  // ...ajoutez ici vos autres routes
};

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [departureCity, setDepartureCity] = useState<string | null>(null);
  const [destinationCity, setDestinationCity] = useState<string | null>(null);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [departureTime, setDepartureTime] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [departureCities, setDepartureCities] = useState<CityOption[]>([]);
  const [destinationCities, setDestinationCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseAuthTypes.User | null>(null);
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
      
      const departureSet = new Set<string>();
      const destinationSet = new Set<string>();

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
    } catch (error: any) {
      console.error('Erreur lors de la récupération des villes:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les données des villes. Veuillez réessayer.'
      );
      setLoading(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    setDepartureDate(date);
    setDatePickerVisible(false);
  };

  const handleTimeConfirm = (time: Date) => {
    setDepartureTime(time);
    setTimePickerVisible(false);
  };

  const resetSearchForm = () => {
    setDepartureCity(null);
    setDestinationCity(null);
    setDepartureDate(null);
    setDepartureTime(null);
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

    console.log('Home.tsx - departureCity avant navigation:', departureCity);
    // Navigation vers l'écran des résultats avec les paramètres
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.HOME_TAB,
      params: {
        screen: ROUTES.SEARCH_RESULTS,
        params: {
          departure: departureCity,
          destination: destinationCity,
          date: departureDate ? moment(departureDate).format('YYYY-MM-DD') : undefined,
          time: departureTime ? moment(departureTime).format('HH:mm') : undefined
        }
      }
    });

    // Réinitialiser le formulaire après la navigation
    resetSearchForm();
  };

  const navigateToAgencySelection = () => {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.HOME_TAB,
      params: {
        screen: ROUTES.AGENCY_SELECT
      }
    });
  };

  const navigateToProfile = () => {
    if (!currentUser) {
      Alert.alert(
        'Non connecté',
        'Vous devez être connecté pour accéder au profil.',
        [
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('LOGIN')
          },
          {
            text: 'Annuler',
            style: 'cancel'
          }
        ]
      );
    } else {
      navigation.navigate('MainTabs', { screen: ROUTES.PROFILE_TAB });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      
      {/* Header avec gradient */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Bienvenue 👋</Text>
            <Text style={styles.subWelcomeText}>Planifiez your voyage</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notification')}>
            <View style={styles.notificationIconContainer}>
              <Icon name="bell" size={22} color="#4A90E2" />
              <View style={styles.notificationBadge} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section avec logo et image */}
        <View style={styles.heroSection}>
          <View style={styles.heroImageContainer}>
            <Image
              source={require('../assets/images/busHome.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.logoOverlay}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.heroLogo}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Formulaire de recherche */}
        <View style={styles.searchContainer}>
          <View style={styles.searchHeader}>
            <Icon name="map-pin" size={24} color="#4A90E2" />
            <Text style={styles.searchTitle}>Où souhaitez-vous aller ?</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Chargement des destinations...</Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              {/* Départ */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Icon name="circle" size={12} color="#4A90E2" /> Point de départ
                </Text>
                <View style={styles.dropdownContainer}>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    data={departureCities}
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder="Choisir un point de départ"
                    value={departureCity}
                    onChange={item => {
                      setDepartureCity(item.value);
                      setFormData(prev => ({ ...prev, departure: item.value }));
                    }}
                    renderLeftIcon={() => (
                      <Icon name="map-pin" size={18} color="#4A90E2" style={styles.dropdownIcon} />
                    )}
                  />
                </View>
              </View>

              {/* Destination */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Icon name="navigation" size={12} color="#E74C3C" /> Destination
                </Text>
                <View style={styles.dropdownContainer}>
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
                    renderLeftIcon={() => (
                      <Icon name="navigation" size={18} color="#E74C3C" style={styles.dropdownIcon} />
                    )}
                  />
                </View>
              </View>

              {/* Date et Heure */}
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeItem}>
                  <Text style={styles.inputLabel}>
                    <Icon name="calendar" size={12} color="#27AE60" /> Date
                  </Text>
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setDatePickerVisible(true)}
                  >
                    <Icon name="calendar" size={18} color="#27AE60" />
                    <Text style={departureDate ? styles.dateTimeSelectedText : styles.dateTimePlaceholder}>
                      {departureDate ? moment(departureDate).format('DD/MM/YYYY') : 'Date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateTimeItem}>
                  <Text style={styles.inputLabel}>
                    <Icon name="clock" size={12} color="#F39C12" /> Heure
                  </Text>
                  <TouchableOpacity 
                    style={styles.dateTimeButton}
                    onPress={() => setTimePickerVisible(true)}
                  >
                    <Icon name="clock" size={18} color="#F39C12" />
                    <Text style={departureTime ? styles.dateTimeSelectedText : styles.dateTimePlaceholder}>
                      {departureTime ? moment(departureTime).format('HH:mm') : 'Heure'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Boutons d'action */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                  <Icon name="search" size={20} color="white" />
                  <Text style={styles.searchButtonText}>RECHERCHER</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.agencyButton} onPress={navigateToAgencySelection}>
                  <Icon name="briefcase" size={18} color="#4A90E2" />
                  <Text style={styles.agencyButtonText}>CHOISIR UNE AGENCE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={() => setDatePickerVisible(false)}
        minimumDate={new Date()}
        locale="fr-FR"
      />

      {/* Time Picker Modal */}
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerVisible(false)}
        locale="fr-FR"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1d1d1f',
  },
  subWelcomeText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  notificationButton: {
    padding: 8,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    width: '100%',
    height: 200,
    marginBottom: 20,
  },
  heroImageContainer: {
    position: 'relative',
    height: 200,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 25,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  heroLogo: {
    width: 150,
    height: 100,
  },
  searchContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  resetText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#f8fafc',
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputSearchStyle: {
    fontSize: 16,
    color: '#95a5a6',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#666',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#333',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  formContainer: {
    // Add any necessary styles for the form container
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: 'white',
    marginTop: 8,
  },
  dropdown: {
    height: 50,
    borderColor: 'transparent',
    paddingHorizontal: 12,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dateTimeItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'white',
    marginTop: 8,
  },
  dateTimeSelectedText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  dateTimePlaceholder: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  agencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 8,
  },
  agencyButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;