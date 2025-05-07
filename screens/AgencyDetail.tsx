import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Linking
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Feather from 'react-native-vector-icons/Feather';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';

const { width } = Dimensions.get('window');

const AgencyDetailScreen = ({ route, navigation }) => {
  const { agencyId, agencyName } = route.params;
  const [agency, setAgency] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const fetchAgencyDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch agency details
        const agencyDoc = await firestore().collection('agencies').doc(agencyId).get();
        if (agencyDoc.exists) {
          setAgency(agencyDoc.data());
        }
        
        // Fetch agency trips
        const tripsSnapshot = await firestore()
          .collection('trips')
          .where('agencyId', '==', agencyId)
          .get();
          
        if (!tripsSnapshot.empty) {
          // Récupérer les données des voyages de la base de données
          const tripsData = [];
          
          // Set to track unique routes
          const uniqueRoutes = new Set();
          
          tripsSnapshot.forEach(doc => {
            const tripData = { id: doc.id, ...doc.data() };
            const routeKey = `${tripData.origin}-${tripData.destination}`;
            
            // Only add if this route hasn't been added before
            if (!uniqueRoutes.has(routeKey)) {
              uniqueRoutes.add(routeKey);
              tripsData.push(tripData);
            }
          });
          
          setTrips(tripsData);
        } else {
          // Données de démo pour l'interface - un seul itinéraire pour éviter les doublons
          const demoTrip = {
            id: 'trip1',
            origin: 'Yaoundé',
            destination: 'Douala',
            duration: '6 heures',
            departureTime: '08:00',
            departureDate: '2025-05-10',
            price: '5000 FCFA',
            availableSeats: 15
          };
          setTrips([demoTrip]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des détails de l'agence:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchAgencyDetails();
  }, [agencyId]);

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleBookTrip = (tripId) => {
    // Navigation vers l'écran de sélection des sièges avec les détails du voyage
    navigation.navigate('SeatSelectionScreen', { tripId, agencyId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (error || !agency) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-triangle" size={50} color="#E74C3C" />
        <Text style={styles.errorText}>Une erreur est survenue lors du chargement des détails</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4169E1" barStyle="light-content" />
      
      {/* Header with agency name */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{agency.name}</Text>
        <TouchableOpacity style={styles.favoriteButton}>
          <Feather name="heart" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Agency Image Banner */}
        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: agency.bannerUrl.replace('assets/', '../assets/') }}
            style={styles.bannerImage}
            defaultSource={require('../assets/images/busFondBon.jpeg')}
          />
          <View style={styles.overlayLogo}>
            <Image 
              source={{ uri: agency.logoUrl.replace('assets/', '../assets//') }}
              style={styles.logoImage}
            />
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'info' && styles.activeTabButton]}
            onPress={() => setActiveTab('info')}
          >
            <Feather 
              name="info" 
              size={18} 
              color={activeTab === 'info' ? '#4169E1' : '#7F8C8D'} 
            />
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
              Informations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'trips' && styles.activeTabButton]}
            onPress={() => setActiveTab('trips')}
          >
            <Feather 
              name="map" 
              size={18} 
              color={activeTab === 'trips' ? '#4169E1' : '#7F8C8D'} 
            />
            <Text style={[styles.tabText, activeTab === 'trips' && styles.activeTabText]}>
              Voyages
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'info' ? (
          <View style={styles.infoContainer}>
            {/* Description Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.descriptionText}>{agency.description}</Text>
            </View>

            {/* Services Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services</Text>
              <View style={styles.servicesContainer}>
                {agency.services && agency.services.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <Feather name={getServiceIcon(service)} size={16} color="#4169E1" />
                    <Text style={styles.serviceItemText}>{service}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Destinations Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Destinations</Text>
              <View style={styles.destinationsContainer}>
                {agency.destinations && agency.destinations.map((destination, index) => (
                  <View key={index} style={styles.destinationTag}>
                    <Feather name="map-pin" size={14} color="#4169E1" />
                    <Text style={styles.destinationText}>{destination}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Contact Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              
              {agency.contactInfo && agency.contactInfo.phone && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => handleCall(agency.contactInfo.phone)}
                >
                  <Feather name="phone" size={18} color="#4169E1" />
                  <Text style={styles.contactText}>{agency.contactInfo.phone}</Text>
                </TouchableOpacity>
              )}
              
              {agency.contactInfo && agency.contactInfo.email && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => handleEmail(agency.contactInfo.email)}
                >
                  <Feather name="mail" size={18} color="#4169E1" />
                  <Text style={styles.contactText}>{agency.contactInfo.email}</Text>
                </TouchableOpacity>
              )}
              
              {agency.contactInfo && agency.contactInfo.address && (
                <View style={styles.contactItem}>
                  <Feather name="map" size={18} color="#4169E1" />
                  <Text style={styles.contactText}>{agency.contactInfo.address}</Text>
                </View>
              )}
            </View>

            {/* Pricing Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tarifs</Text>
              <View style={styles.pricingContainer}>
                {agency.pricing && Object.entries(agency.pricing).map(([type, price], index) => (
                  <View key={index} style={styles.pricingItem}>
                    <Text style={styles.seatTypeText}>{type}</Text>
                    <Text style={styles.priceText}>{price}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.tripsContainer}>
            <View style={styles.tripHeader}>
              <View style={styles.routeContainer}>
                <Text style={styles.routeText}>{trips[0]?.origin || 'Départ'} → {trips[0]?.destination || 'Arrivée'}</Text>
              </View>
            </View>
            
            {trips.length > 0 ? (
              trips.map((trip, index) => (
                <View key={index} style={styles.tripCard}>
                  <View style={styles.tripDetails}>
                    <Text style={styles.tripRoute}>
                      Itinéraire: {trip.origin} → {trip.destination}
                    </Text>
                  
                    <Text style={styles.tripDeparture}>
                      Départ: {trip.departureTime} - {format(new Date(trip.departureDate), 'PPP', { locale: fr })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => handleBookTrip(trip.id)}
                  >
                    <Text style={styles.bookButtonText}>Réserver</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.noTripsContainer}>
                <Feather name="alert-circle" size={40} color="#95A5A6" />
                <Text style={styles.noTripsText}>
                  Aucun voyage disponible pour cette agence
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getServiceIcon = (service) => {
  switch(service) {
    case 'Wi-Fi': return 'wifi';
    case 'Climatisation': return 'thermometer';
    case 'Repas': return 'coffee';
    case 'TV': return 'tv';
    case 'Boissons': return 'droplet';
    default: return 'check';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4169E1',
    paddingVertical: 15,
    paddingHorizontal: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  favoriteButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  bannerContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlayLogo: {
    position: 'absolute',
    bottom: -30,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'white',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 40,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginRight: 24,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4169E1',
  },
  tabText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4169E1',
    fontWeight: '600',
  },
  infoContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 22,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  serviceItemText: {
    fontSize: 13,
    color: '#34495E',
    marginLeft: 6,
  },
  destinationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  destinationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  destinationText: {
    fontSize: 13,
    color: '#3498DB',
    marginLeft: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    color: '#34495E',
    fontSize: 14,
    marginLeft: 10,
  },
  pricingContainer: {
    marginTop: 8,
  },
  pricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  seatTypeText: {
    fontSize: 14,
    color: '#34495E',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    color: '#16A085',
    fontWeight: '600',
  },
  // Styles pour la section des voyages
  tripsContainer: {
    padding: 16,
  },
  tripHeader: {
    marginBottom: 16,
  },
  routeContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tripDetails: {
    marginBottom: 12,
  },
  tripRoute: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  tripDuration: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  tripPrice: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '600',
    marginBottom: 4,
  },
  tripDeparture: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
  bookButton: {
    backgroundColor: '#4169E1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  bookButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  noTripsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  noTripsText: {
    fontSize: 15,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
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
    marginTop: 20,
    marginBottom: 30,
    lineHeight: 24,
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

export default AgencyDetailScreen;