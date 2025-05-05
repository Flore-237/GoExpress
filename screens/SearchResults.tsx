import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Card, IconButton, Divider } from 'react-native-paper';
import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const SearchResultsScreen = ({ route, navigation }) => {
  const { departure, destination, date, time } = route.params;
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Icônes pour les différents services
  const serviceIcons = {
    'Wi-Fi': 'wifi',
    'Climatisation': 'air-conditioner',
    'TV': 'television',
    'Repas': 'food',
    'Boissons': 'cup',
  };

  useEffect(() => {
    const fetchVoyages = async () => {
      try {
        setLoading(true);
        
        // Convertir date string (dd/MM/yyyy) en Date pour la comparaison
        const [day, month, year] = date.split('/');
        const searchDate = `${year}-${month}-${day}`;
        
        // Récupérer les voyages correspondant au départ et à la destination
        const voyagesSnapshot = await firestore()
          .collection('voyages')
          .where('departure', '==', departure)
          .where('destination', '==', destination)
          .where('dateDepart', '==', searchDate)
          .get();
        
        if (voyagesSnapshot.empty) {
          setVoyages([]);
          setLoading(false);
          return;
        }
        
        // Récupérer les infos des agences pour chaque voyage
        const voyagesData = [];
        
        for (const doc of voyagesSnapshot.docs) {
          const voyageData = doc.data();
          
          // Récupérer les infos de l'agence
          const agencyDoc = await firestore()
            .collection('agencies')
            .doc(voyageData.agencyId)
            .get();
            
          if (agencyDoc.exists) {
            const agencyData = agencyDoc.data();
            
            voyagesData.push({
              id: doc.id,
              ...voyageData,
              agencyName: agencyData.name,
              services: agencyData.services || [],
              logoUrl: agencyData.logoUrl,
            });
          }
        }
        
        setVoyages(voyagesData);
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors de la récupération des voyages:", err);
        setError("Une erreur est survenue lors du chargement des voyages.");
        setLoading(false);
      }
    };

    fetchVoyages();
  }, [departure, destination, date]);

  const handleVoyageSelect = (voyage) => {
    navigation.navigate('VoyageDetails', { voyageId: voyage.id });
  };

  const renderServiceIcons = (services) => {
    return (
      <View style={styles.serviceIconsContainer}>
        {services.slice(0, 3).map((service, index) => (
          <MaterialCommunityIcons 
            key={index} 
            name={serviceIcons[service] || 'check-circle'} 
            size={20} 
            color="#4169E1" 
            style={styles.serviceIcon}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Recherche des voyages...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.routeContainer}>
          <Image 
            source={require('../assets/images/generaleLogo.jpg')} 
            style={styles.busIcon} 
          />
          <View style={styles.routeInfo}>
            <Text style={styles.routeText}>{departure}</Text>
            <IconButton 
              icon="swap-horizontal" 
              color="#FFF" 
              size={24} 
              style={styles.swapIcon}
            />
            <Text style={styles.routeText}>{destination}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.dateContainer}>
          <Text style={styles.dateText}>{date} | {time}</Text>
        </TouchableOpacity>
      </View>

      {voyages.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            Aucun voyage trouvé pour cette recherche.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Retour à la recherche</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={voyages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleVoyageSelect(item)}>
              <Card style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.agencyInfo}>
                    <Text style={styles.agencyName}>{item.agencyName}</Text>
                    <Text style={styles.seatType}>
                      {item.placesClassiqueDisponibles > 0 ? 'Classique' : ''} 
                      {item.placesClassiqueDisponibles > 0 && item.placesVIPDisponibles > 0 ? ' & ' : ''}
                      {item.placesVIPDisponibles > 0 ? 'VIP' : ''}
                    </Text>
                  </View>
                  
                  <View style={styles.timeContainer}>
                    <Text style={styles.time}>{item.heureDepart}</Text>
                    <Text style={styles.duration}>
                      {/* Ici on pourrait calculer la durée si on avait l'heure d'arrivée */}
                    </Text>
                  </View>
                  
                  <View style={styles.priceSeatsContainer}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>
                        {item.placesClassiqueDisponibles > 0 
                          ? `${item.prixClassique} FCFA` 
                          : `${item.prixVIP} FCFA`}
                      </Text>
                    </View>
                    
                    <View style={styles.seatsContainer}>
                      <Text style={[
                        styles.seatsText,
                        (item.placesClassiqueDisponibles + item.placesVIPDisponibles) < 5 
                          ? styles.fewSeatsLeft 
                          : null
                      ]}>
                        {item.placesClassiqueDisponibles + item.placesVIPDisponibles} places disponibles
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.bottomContainer}>
                  {renderServiceIcons(item.services)}
                  <View style={styles.rightIcons}>
                    <IconButton icon="information-outline" size={20} color="#4169E1" />
                    <IconButton icon="share-variant-outline" size={20} color="#4169E1" />
                    <IconButton icon="cart-outline" size={20} color="#4169E1" onPress={() => handleVoyageSelect(item)} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    backgroundColor: '#4169E1',
    padding: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  busIcon: {
    width: 40,
    height: 40,
    tintColor: 'white',
    resizeMode: 'contain',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  routeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  swapIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: 0,
  },
  dateContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  dateText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 10,
  },
  card: {
    marginVertical: 8,
    borderRadius: 10,
    elevation: 3,
  },
  cardContent: {
    padding: 15,
  },
  agencyInfo: {
    marginBottom: 10,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  seatType: {
    fontSize: 14,
    color: '#666',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  priceSeatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    backgroundColor: '#4169E1',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  price: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  seatsContainer: {},
  seatsText: {
    color: 'green',
    fontWeight: 'bold',
  },
  fewSeatsLeft: {
    color: 'red',
  },
  divider: {
    backgroundColor: '#ddd',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  serviceIconsContainer: {
    flexDirection: 'row',
  },
  serviceIcon: {
    marginRight: 10,
  },
  rightIcons: {
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4169E1',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4169E1',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#4169E1',
    padding: 10,
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default SearchResultsScreen;