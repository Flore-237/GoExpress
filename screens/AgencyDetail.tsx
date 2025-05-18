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
import { ROUTES } from '../App';

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
        
        const agencyDoc = await firestore().collection('agencies').doc(agencyId).get();
        if (agencyDoc.exists) {
          setAgency({
            id: agencyDoc.id,
            ...agencyDoc.data()
          });
        } else {
          throw new Error("Agence non trouvée");
        }
        
        const tripsQuery = await firestore()
          .collection('voyages')
          .where('agencyId', '==', agencyId)
          .get();
          
        const tripsData = [];
        tripsQuery.forEach(doc => {
          tripsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        tripsData.sort((a, b) => {
          const dateA = a.dateDepart ? new Date(a.dateDepart) : new Date();
          const dateB = b.dateDepart ? new Date(b.dateDepart) : new Date();
          
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          
          if (a.heureDepart < b.heureDepart) return -1;
          if (a.heureDepart > b.heureDepart) return 1;
          
          return 0;
        });
        
        setTrips(tripsData);
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des détails:", err);
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

  const handleBookTrip = (trip) => {
    const tripDetails = {
      id: trip.id,
      origin: trip.departure || '',
      destination: trip.destination || '',
      departureDate: trip.dateDepart || '',
      departureTime: trip.heureDepart || '',
      prixClassique: trip.prixClassique || 0,
      prixVIP: trip.prixVIP || 0,
      placesClassiqueDisponibles: trip.placesClassiqueDisponibles || 0,
      placesVIPDisponibles: trip.placesVIPDisponibles || 0,
      agencyName: agency?.name || agencyName
    };
    
    navigation.navigate(ROUTES.SEAT_SELECTION, { 
      tripId: trip.id,
      agencyId,
      tripDetails: tripDetails
    });
  };

  const getImageSource = (uri, type = 'banner') => {
    if (uri && uri.startsWith('http')) {
      return { uri };
    }
    
    const agencyNameLower = agency.name ? agency.name.toLowerCase() : '';
    
    if (agencyNameLower.includes('buca')) {
      return type === 'logo' 
        ? require('../assets/images/BucaLogo.jpg')
        : require('../assets/images/BucaVoyage.jpg');
    } else if (agencyNameLower.includes('generale') || agencyNameLower.includes('générale')) {
      return type === 'logo'
        ? require('../assets/images/generaleLogo.jpg')
        : require('../assets/images/GeneraleExpress.png');
    } else if (agencyNameLower.includes('touristique')) {
      return type === 'logo'
        ? require('../assets/images/trouristiqueLogo.jpg')
        : require('../assets/images/touristique.jpg');
    }
    
    return type === 'logo'
      ? require('../assets/images/GoExpress.png')
      : require('../assets/images/busFondBon.jpeg');
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(date, 'PPP', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };

  const getServiceIcon = (service) => {
    switch(service.toLowerCase()) {
      case 'wi-fi': return 'wifi';
      case 'climatisation': return 'thermometer';
      case 'repas': return 'coffee';
      case 'tv': return 'tv';
      case 'boissons': return 'droplet';
      case 'toilettes': return 'droplet';
      case 'prises électriques': return 'battery-charging';
      default: return 'check';
    }
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
        <View style={styles.bannerContainer}>
          <Image 
            source={getImageSource(agency.bannerUrl, 'banner')}
            style={styles.bannerImage}
            defaultSource={require('../assets/images/busFondBon.jpeg')}
          />
          <View style={styles.overlayLogo}>
            <Image 
              source={getImageSource(agency.logoUrl, 'logo')}
              style={styles.logoImage}
              defaultSource={require('../assets/images/GoExpress.png')}
            />
          </View>
        </View>

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

        {activeTab === 'info' ? (
          <View style={styles.infoContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.descriptionText}>
                {agency.description || "Aucune description disponible pour cette agence."}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services</Text>
              <View style={styles.servicesContainer}>
                {agency.services && agency.services.length > 0 ? (
                  agency.services.map((service, index) => (
                    <View key={index} style={styles.serviceItem}>
                      <Feather name={getServiceIcon(service)} size={16} color="#4169E1" />
                      <Text style={styles.serviceItemText}>{service}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>Aucun service renseigné</Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Destinations</Text>
              <View style={styles.destinationsContainer}>
                {agency.destinations && agency.destinations.length > 0 ? (
                  agency.destinations.map((destination, index) => (
                    <View key={index} style={styles.destinationTag}>
                      <Feather name="map-pin" size={14} color="#4169E1" />
                      <Text style={styles.destinationText}>{destination}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>Aucune destination renseignée</Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              
              {agency.contactInfo?.phone ? (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => handleCall(agency.contactInfo.phone)}
                >
                  <Feather name="phone" size={18} color="#4169E1" />
                  <Text style={styles.contactText}>{agency.contactInfo.phone}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noDataText}>Aucun numéro de téléphone</Text>
              )}
              
              {agency.contactInfo?.email ? (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => handleEmail(agency.contactInfo.email)}
                >
                  <Feather name="mail" size={18} color="#4169E1" />
                  <Text style={styles.contactText}>{agency.contactInfo.email}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noDataText}>Aucun email renseigné</Text>
              )}
              
              {agency.contactInfo?.address ? (
                <View style={styles.contactItem}>
                  <Feather name="map" size={18} color="#4169E1" />
                  <Text style={styles.contactText}>{agency.contactInfo.address}</Text>
                </View>
              ) : (
                <Text style={styles.noDataText}>Aucune adresse renseignée</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tarifs</Text>
              <View style={styles.pricingContainer}>
                {agency.pricing && Object.keys(agency.pricing).length > 0 ? (
                  Object.entries(agency.pricing).map(([type, price], index) => (
                    <View key={index} style={styles.pricingItem}>
                      <Text style={styles.seatTypeText}>{type}</Text>
                      <Text style={styles.priceText}>{price} FCFA</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>Aucun tarif renseigné</Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.tripsContainer}>
            {trips.length > 0 ? (
              <>
                <View style={styles.tripHeader}>
                  <Text style={styles.tripCountText}>
                    {trips.length} voyage{trips.length > 1 ? 's' : ''} disponible{trips.length > 1 ? 's' : ''}
                  </Text>
                </View>

                {trips.map((trip) => {
                  const departureDate = trip.dateDepart 
                    ? new Date(trip.dateDepart) 
                    : null;
                  
                  const availableSeats = (trip.placesClassiqueDisponibles || 0) + (trip.placesVIPDisponibles || 0);
                  
                  const price = trip.prixClassique || trip.prixVIP || 'N/A';
                  
                  return (
                    <View key={trip.id} style={styles.tripCard}>
                      <View style={styles.tripInfoRow}>
                        <View style={styles.routeContainer}>
                          <Text style={styles.routeText}>
                            {trip.departure || 'N/A'} → {trip.destination || 'N/A'}
                          </Text>
                        </View>
                        <Text style={styles.tripPrice}>
                          {price} FCFA
                        </Text>
                      </View>

                      <View style={styles.tripDetails}>
                        <View style={styles.detailRow}>
                          <Feather name="clock" size={16} color="#7F8C8D" />
                          <Text style={styles.detailText}>
                            Départ: {trip.heureDepart || 'N/A'} - {departureDate ? formatDate(departureDate) : 'N/A'}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Feather name="layers" size={16} color="#7F8C8D" />
                          <Text style={styles.detailText}>
                            Classique: {trip.prixClassique || 'N/A'} FCFA - VIP: {trip.prixVIP || 'N/A'} FCFA
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Feather name="users" size={16} color="#7F8C8D" />
                          <Text style={styles.detailText}>
                            Places disponibles: {availableSeats} (Classique: {trip.placesClassiqueDisponibles || 0}, VIP: {trip.placesVIPDisponibles || 0})
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.bookButton}
                        onPress={() => handleBookTrip(trip)}
                      >
                        <Text style={styles.bookButtonText}>Réserver</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.noTripsContainer}>
                <Feather name="alert-circle" size={40} color="#95A5A6" />
                <Text style={styles.noTripsText}>
                  Aucun voyage disponible pour cette agence
                </Text>
                <Text style={styles.noTripsSubText}>
                  Veuillez vérifier ultérieurement
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  noDataText: {
    fontSize: 14,
    color: '#95A5A6',
    fontStyle: 'italic',
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
  tripsContainer: {
    padding: 16,
  },
  tripHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  tripCountText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tripInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeContainer: {
    flex: 1,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tripPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27AE60',
  },
  tripDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
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
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  noTripsSubText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 8,
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