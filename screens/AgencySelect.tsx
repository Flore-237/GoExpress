import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient'; 

const { width } = Dimensions.get('window');

const Agency_select = () => {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const agenciesRef = await firestore().collection('agencies').get();
        const agenciesData = agenciesRef.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          ...doc.data()
        }));
        setAgencies(agenciesData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des agences:', error);
        setLoading(false);
      }
    };

    fetchAgencies();
  }, []);

  const handleAgencySelect = (agency) => {
    // Correction: Changé de 'AgencyDetailScreen' à 'AgencyDetail'
    navigation.navigate('AgencyDetail', { 
      agencyId: agency.id, 
      agencyName: agency.name 
    });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Get agency logo based on ID
  const getAgencyLogo = (agencyId) => { 
    switch(agencyId) {
      case 'general_express_voyage':
        return require('../assets/images/GeneraleExpress.png');
      case 'bucca_voyage':
        return require('../assets/images/BucaVoyage.jpg');
      default:
        return require('../assets/images/touristique.jpg');

    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#4169E1" barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#4169E1', '#5A7BF0']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choisir une agence</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Chargement des agences...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <Text style={styles.subtitle}>
            Sélectionnez l'agence de votre choix
          </Text>
          
          <ScrollView 
            style={styles.agencyList} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}
          >
            {agencies.map((agency) => (
              <TouchableOpacity
                key={agency.id}
                style={styles.agencyItem}
                onPress={() => handleAgencySelect(agency)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(65, 105, 225, 0.05)', 'rgba(90, 123, 240, 0.08)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.agencyCardContent}>
                    <Image
                      source={getAgencyLogo(agency.id)}
                      style={styles.agencyImage}
                      resizeMode="cover"
                    />
                    <View style={styles.agencyDetails}>
                      <Text style={styles.agencyName}>{agency.name}</Text>
                      {agency.services && (
                        <Text style={styles.agencyDescription}>
                          {agency.services.slice(0, 2).join(' • ')}
                        </Text>
                      )}
                      <View style={styles.ratingContainer}>
                        <Icon name="star" size={16} color="#FFD700" />
                        <Text style={styles.ratingText}>
                          {agency.rating || '4.5'} 
                          <Text style={styles.ratingCount}>({agency.ratingCount || '124'})</Text>
                        </Text>
                      </View>
                    </View>
                    <View style={styles.arrowContainer}>
                      <Icon name="chevron-forward" size={24} color="#4169E1" style={styles.arrowIcon} />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
            
            {/* Additional space at bottom for better scrolling */}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 15,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 15,
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: '#666',
    fontSize: 16,
  },
  agencyList: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  agencyItem: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardGradient: {
    width: '100%',
    borderRadius: 16,
  },
  agencyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  agencyImage: {
    width: 75,
    height: 75,
    borderRadius: 12,
  },
  agencyDetails: {
    flex: 1,
    paddingLeft: 15,
  },
  agencyName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 5,
  },
  agencyDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 4,
  },
  ratingCount: {
    fontWeight: 'normal',
    color: '#94a3b8',
  },
  arrowContainer: {
    backgroundColor: '#F0F4FF',
    padding: 8,
    borderRadius: 20,
  },
  arrowIcon: {
    marginLeft: 0,
  },
});

export default Agency_select;