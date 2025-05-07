import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// Define the types for our data
interface Itinerary {
  id: string;
  departureCity: string;
  arrivalCity: string;
  duration: string;
}

const HorairesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data - replace with API call to your backend
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      try {
        // Replace this with your actual API call
        const mockItineraries = [
          { id: '1', departureCity: 'Yaoundé', arrivalCity: 'Douala', duration: '8 heures' },
          { id: '2', departureCity: 'Yaoundé', arrivalCity: 'Douala', duration: '8 heures' },
          { id: '3', departureCity: 'Yaoundé', arrivalCity: 'Douala', duration: '8 heures' },
          { id: '4', departureCity: 'Yaoundé', arrivalCity: 'Douala', duration: '8 heures' },
          { id: '5', departureCity: 'Yaoundé', arrivalCity: 'Douala', duration: '8 heures' },
        ];
        setItineraries(mockItineraries);
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des itinéraires');
        setLoading(false);
      }
    }, 1000);
  }, []);

  // Actual API function (uncomment and modify when ready)
  /*
  const fetchItineraries = async () => {
    try {
      setLoading(true);
      const response = await fetch('YOUR_API_ENDPOINT');
      const data = await response.json();
      setItineraries(data);
      setLoading(false);
    } catch (err) {
      setError('Erreur lors du chargement des itinéraires');
      setLoading(false);
    }
  };
  */

  const goBack = () => {
    navigation.goBack();
  };

  const viewTrips = (itinerary: Itinerary) => {
    // Navigate to trips detail screen - make sure this is properly set up in your navigation
    navigation.navigate('Voyages', { itinerary });
  };

  const renderItineraryItem = ({ item }: { item: Itinerary }) => (
    <View style={styles.itineraryCard}>
      <Text style={styles.itineraryTitle}>
        Itinéraire: {item.departureCity} → {item.arrivalCity}
      </Text>
      <Text style={styles.itineraryDuration}>Durée: {item.duration}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => viewTrips(item)}
      >
        <Text style={styles.buttonText}>Voir les voyages</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3F51B5" />
        <Text>Chargement des itinéraires...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => setLoading(true)}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Itinéraires disponibles</Text>
          <View style={{ width: 40 }} /> {/* Placeholder for symmetry */}
        </View>
        
        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeText}>
            {itineraries.length > 0 
              ? `${itineraries[0].departureCity} → ${itineraries[0].arrivalCity}` 
              : 'Aucun itinéraire disponible'}
          </Text>
        </View>

        <FlatList
          data={itineraries}
          renderItem={renderItineraryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3F51B5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3F51B5',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  routeInfoContainer: {
    backgroundColor: '#3F51B5',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  routeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  itineraryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  itineraryTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itineraryDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3F51B5',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default HorairesScreen;