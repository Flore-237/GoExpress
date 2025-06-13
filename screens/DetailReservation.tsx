import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';

interface RouteParams {
  reservationId: string;
}

const DetailReservation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { reservationId } = route.params as RouteParams;
  
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<any>(null);

  useEffect(() => {
    const fetchReservationDetails = async () => {
      try {
        const reservationDoc = await firestore()
          .collection('reservations')
          .doc(reservationId)
          .get();

        if (reservationDoc.exists) {
          setReservation({
            id: reservationDoc.id,
            ...reservationDoc.data()
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des détails:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservationDetails();
  }, [reservationId]);

  const getAgencyLogo = () => {
    if (reservation?.agencyId === 'bucca_voyage') {
      return require('../assets/images/BucaLogo.jpg');
    } else if (reservation?.agencyId === 'general_express_voyage') {
      return require('../assets/images/generaleLogo.jpg');
    } else if (reservation?.agencyId === 'touristique_express_voyage') {
      return require('../assets/images/touristique.jpg');
    }
    return require('../assets/images/logo.png');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Chargement des détails...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Réservation non trouvée</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#4169E1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la réservation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.journeyCard}>
          <View style={styles.agencyHeader}>
            <Image source={getAgencyLogo()} style={styles.agencyLogo} />
            <Text style={styles.agencyName}>{reservation.nomAgence || 'Agence'}</Text>
            <Text style={styles.departureTime}>{reservation.heureDepart || '--:--'}</Text>
          </View>

          <View style={styles.journeyInfo}>
            <View style={styles.cityContainer}>
              <Text style={styles.city}>{reservation.villeDepart || 'Départ'}</Text>
              <View style={styles.swapIconContainer}>
                <Feather name="arrow-right" size={20} color="#fff" />
              </View>
              <Text style={styles.city}>{reservation.villeArrivee || 'Arrivée'}</Text>
            </View>

            <View style={styles.seatInfoContainer}>
              <Text style={styles.seatInfo}>
                {reservation.numberOfSeats || 1} {reservation.numberOfSeats > 1 ? 'places' : 'place'} {reservation.seatType || 'classique'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Informations du voyageur</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nom</Text>
            <Text style={styles.detailValue}>{reservation.nom || 'Non spécifié'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prénom</Text>
            <Text style={styles.detailValue}>{reservation.prenom || 'Non spécifié'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{reservation.telephone || 'Non spécifié'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Numéro(s) de place</Text>
            <Text style={styles.detailValue}>
              {reservation.seats ? reservation.seats.map((seat: any) => seat.number).join(', ') : 'Non spécifié'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Montant total</Text>
            <Text style={styles.priceValue}>{reservation.prixTotal?.toLocaleString() || 0} FCFA</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Statut</Text>
            <Text style={[styles.detailValue, { color: reservation.statut === 'confirmé' ? '#10B981' : '#F59E0B' }]}>
              {reservation.statut || 'En attente'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4169E1',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4169E1',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  journeyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  agencyLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4169E1',
  },
  departureTime: {
    fontSize: 16,
    color: '#4169E1',
    marginLeft: 'auto',
  },
  journeyInfo: {
    marginTop: 15,
  },
  cityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  city: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  swapIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatInfoContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  seatInfo: {
    fontSize: 14,
    color: '#4169E1',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    color: '#4169E1',
    fontWeight: '700',
  },
});

export default DetailReservation;