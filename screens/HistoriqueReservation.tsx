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
      navigation.navigate('MainTabs', { screen: ROUTES.PROFILE_TAB });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4169E1" barStyle="light-content" />
      
      {/* Header avec gradient */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Bienvenue 👋</Text>
            <Text style={styles.subWelcomeText}>Planifiez your voyage</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notification')}>
            <View style={styles.notificationIconContainer}>
              <Icon name="bell" size={22} color="#4169E1" />
              <View style={styles.notificationBadge} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section avec logo sur image */}
        <View style={styles.heroSection}>
          <View style={styles.busImageContainer}>
            <Image 
              source={require('../assets/images/busFondBon.jpeg')} 
              style={styles.busImage} 
              resizeMode="cover"
            />
            <View style={styles.imageOverlay} />
            
            {/* Logo GoExpress sur l'image */}
            <View style={styles.logoOverlay}>
              <Image 
                source={require('../assets/images/GoExpress.png')} 
                style={styles.logoOnImage} 
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Votre voyage commence ici</Text>
              <Text style={styles.heroSubtitle}>Réservez facilement vos billets de bus</Text>
            </View>
          </View>
        </View>

        {/* Formulaire de recherche */}
        <View style={styles.searchContainer}>
          <View style={styles.searchHeader}>
            <Icon name="map-pin" size={24} color="#4169E1" />
            <Text style={styles.searchTitle}>Où souhaitez-vous aller ?</Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4169E1" />
              <Text style={styles.loadingText}>Chargement des destinations...</Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              {/* Départ */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Icon name="circle" size={12} color="#4169E1" /> Point de départ
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
                      <Icon name="map-pin" size={18} color="#4169E1" style={styles.dropdownIcon} />
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
                  <Icon name="briefcase" size={18} color="#4169E1" />
                  <Text style={styles.agencyButtonText}>CHOISIR UNE AGENCE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={() => setDatePickerVisible(false)}
        minimumDate={new Date()}
        locale="fr-FR"
        headerTextIOS="Choisir la date de départ"
        confirmTextIOS="Confirmer"
        cancelTextIOS="Annuler"
      />

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerVisible(false)}
        locale="fr-FR"
        headerTextIOS="Choisir l'heure de départ"
        confirmTextIOS="Confirmer"
        cancelTextIOS="Annuler"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#4169E1',
    paddingTop: 15,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  subWelcomeText: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  notificationButton: {
    padding: 5,
  },
  notificationIconContainer: {
    position: 'relative',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 20,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    marginTop: -10,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  logo: {
    width: 150,
    height: 60,
  },
  logoOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 2,
  },
  logoOnImage: {
    width: 120,
    height: 50,
    tintColor: 'rgba(255, 255, 255, 0.95)',
  },
  busImageContainer: {
    position: 'relative',
    height: 200,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 25,
  },
  busImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroTextContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    fontWeight: '400',
  },
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 30,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 5,
  },
  inputLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 10,
    fontWeight: '600',
  },
  dropdownContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdown: {
    height: 56,
    borderColor: '#e1e8ed',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
  },
  dropdownIcon: {
    marginRight: 10,
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#95a5a6',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 15,
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderColor: '#e1e8ed',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  dateTimeSelectedText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  dateTimePlaceholder: {
    fontSize: 16,
    color: '#95a5a6',
  },
  buttonContainer: {
    gap: 15,
    marginTop: 10,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  agencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(65, 105, 225, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    borderColor: '#4169E1',
    borderWidth: 2,
    gap: 10,
  },
  agencyButtonText: {
    color: '#4169E1',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;