import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import { getAgencyLogo } from '../utils/agencyUtils';

const SearchResultsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { departure, destination, date, time } = route.params;

  const [loading, setLoading] = useState(true);
  const [voyages, setVoyages] = useState([]);
  const [agencies, setAgencies] = useState({});

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      console.log(`Recherche: Départ=${departure}, Destination=${destination}, Date=${date}`);
      
      const voyagesRef = firestore().collection('voyages');
      
      let query = voyagesRef
        .where('departure', '==', departure)
        .where('destination', '==', destination);
      
      const voyagesSnapshot = await query.get();
      console.log(`Nombre de résultats trouvés: ${voyagesSnapshot.size}`);

      const agenciesSnapshot = await firestore().collection('agencies').get();
      const agenciesData = {};

      agenciesSnapshot.docs.forEach(doc => {
        agenciesData[doc.id] = doc.data();
      });
      setAgencies(agenciesData);

      const voyagesData = [];
      voyagesSnapshot.docs.forEach(doc => {
        const voyageData = doc.data();
        console.log(`Voyage trouvé: ${JSON.stringify(voyageData)}`);
        voyagesData.push({ id: doc.id, ...voyageData });
      });

      // Grouper les voyages par agence, ville de départ, ville d'arrivée et date (ignorer l'horaire)
      const voyageMap = {};
      voyagesData.forEach(voyage => {
        const key = `${voyage.departure}_${voyage.destination}_${voyage.dateDepart || voyage.dateVoyage}_${voyage.agencyId}`;
        if (!voyageMap[key]) {
          voyageMap[key] = [];
        }
        voyageMap[key].push(voyage);
      });
      const uniqueVoyages = Object.values(voyageMap).map(group => {
        return {
          ...group[0],
          horaires: group.map(v => ({
            id: v.id,
            heureDepart: v.heureDepart,
            typePlace: v.typePlace || v.seatType || 'Classique',
            voyage: v
          })),
          allTypes: group // pour compatibilité éventuelle
        };
      });
      setVoyages(uniqueVoyages);
      setLoading(false);
    } catch (error) {
      console.error('Erreur de recherche:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la recherche: ' + error.message
      );
      setLoading(false);
    }
  };

  const handleGoBack = () => navigation.goBack();

  const formatDate = (dateString) => {
    const date = moment(dateString, 'YYYY-MM-DD');
    return date.isValid()
      ? `${date.format('MMM')} ${date.format('DD')} ${date.format('YYYY')} | ${date.format('dddd')}`
      : dateString;
  };

  const handleVoyageSelect = (voyage) => {
    // Si plusieurs horaires sont disponibles, proposer le choix
    if (voyage.horaires && voyage.horaires.length > 1) {
      Alert.alert(
        'Choix de l\'horaire',
        'Sélectionnez un horaire de départ',
        [
          ...voyage.horaires.map(h => ({
            text: `${h.heureDepart} (${h.typePlace})`,
            onPress: () => goToSeatSelection(h.voyage)
          })),
          { text: 'Annuler', style: 'cancel' }
        ]
      );
    } else if (voyage.horaires && voyage.horaires.length === 1) {
      goToSeatSelection(voyage.horaires[0].voyage);
    } else {
      goToSeatSelection(voyage);
    }
  };

  const goToSeatSelection = (voyage) => {
    const agencyDetails = agencies[voyage.agencyId] || {};
    navigation.navigate('SeatSelection', { 
      voyage,
      agencyDetails,
      departure,
      destination,
      date
    });
  };

  const renderVoyageItem = ({ item }) => {
    const agency = agencies[item.agencyId] || {};
  
    const onPressVoyage = () => {
      console.log('Item pressé:', item.id);
      handleVoyageSelect(item);
    };
  
    return (
      <TouchableOpacity 
        style={styles.voyageCard} 
        onPress={onPressVoyage}
        activeOpacity={0.6}
      >
        <Image
          source={getAgencyLogo(item.agencyId)}
          style={styles.voyageImage}
        />
        <View style={styles.voyageInfo}>
          <Text style={styles.voyageAgency}>{agency.name || 'Agence'}</Text>
          <View style={styles.voyageDetails}>
            <Text style={styles.voyageTime}>
              {item.horaires && item.horaires.length > 1
                ? `${item.horaires.length} horaires disponibles`
                : `Départ: ${item.horaires && item.horaires[0]?.heureDepart}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultat de Recherche</Text>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.travelCard}>
        <Image
          source={require('../assets/images/busHome.png')}
          style={styles.busIcon}
        />
        <View style={styles.cityRow}>
          <Text style={styles.cityText}>{departure}</Text>
          <MaterialCommunityIcons name="swap-horizontal" size={24} color="#fff" />
          <Text style={styles.cityText}>{destination}</Text>
        </View>
        <Text style={styles.dateText}>
          {date} {time ? `à ${time}` : ''}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2C52A4" style={{ marginTop: 20 }} />
      ) : voyages.length === 0 ? (
        <View style={styles.noResultContainer}>
          <Text style={styles.noResultText}>Aucun voyage disponible pour cette recherche</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleGoBack}
          >
            <Text style={styles.retryButtonText}>Modifier la recherche</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={voyages}
          renderItem={renderVoyageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerLogo: { width: 60, height: 40 },

  travelCard: {
    marginHorizontal: 15,
    marginVertical: 10,
    backgroundColor: '#3D56F0',
    borderRadius: 10,
    alignItems: 'center',
    padding: 15,
  },
  busIcon: {
    width: 80,
    height: 80,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 10,
  },
  cityText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    backgroundColor: '#fff',
    color: '#3D56F0',
    fontSize: 14,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },

  voyageCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderColor: '#FF8C00',
    borderWidth: 1,
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  voyageImage: {
    width: 80,
    height: 80,
    borderRadius: 5,
  },
  voyageInfo: {
    marginLeft: 15,
    flex: 1,
  },
  voyageAgency: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  voyageDetails: {
    marginTop: 5,
  },
  voyageTime: {
    fontSize: 14,
    color: '#666',
  },
  voyageDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  voyagePrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tapPrompt: {
    fontSize: 12,
    color: '#3D56F0',
    marginTop: 5,
    fontWeight: 'bold',
  },
  noResultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noResultText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3D56F0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultsContainer: {
    paddingBottom: 20,
  },
});

export default SearchResultsScreen;