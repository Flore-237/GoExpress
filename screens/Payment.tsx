import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [user, setUser] = useState(null);
  
  // These would come from route params in a real app
  const voyageData = route.params?.voyageData || {
    agencyId: 'bucca_voyage',
    agencyName: 'Bucca Voyage',
    departure: 'Douala',
    destination: 'Yaounde',
    departureTime: '14h00',
    seatType: 'classique',
    seatCount: 2,
    totalPrice: 10000,
    voyageId: 'voyage_sample',
    dateDepart: '2025-05-15',
  };
  
  // Mock passenger data - in real app would be entered by user
  const passengerData = {
    name: 'Jean Paul',
    age: '30',
    gender: 'Masculin',
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    
    fetchUserData();
  }, []);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleProceedPayment = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner une méthode de paiement');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      // Create a new ticket
      const ticketRef = await addDoc(collection(db, 'tickets'), {
        userId: currentUser.uid,
        voyageId: voyageData.voyageId,
        agencyId: voyageData.agencyId,
        seatNumber: 'A1', // This would be dynamically determined in a real app
        prix: voyageData.totalPrice,
        typePlace: voyageData.seatType,
        nom: user?.name || 'Client',
        telephone: user?.phone || '',
        email: user?.email || '',
        departure: voyageData.departure,
        destination: voyageData.destination,
        dateDepart: voyageData.dateDepart,
        heureDepart: voyageData.departureTime,
        status: 'valid',
        createdAt: new Date(),
        barcode: `TICKET${Math.floor(Math.random() * 100000)}`,
      });

      // Create a payment record
      const paiementRef = await addDoc(collection(db, 'paiements'), {
        userId: currentUser.uid,
        ticketId: ticketRef.id,
        montant: voyageData.totalPrice,
        methode: selectedPaymentMethod,
        numero: user?.phone || '',
        status: 'complété',
        reference: `${selectedPaymentMethod.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 1000000)}`,
        dateTransaction: new Date().toISOString().split('T')[0],
        heureTransaction: new Date().toTimeString().split(' ')[0].substring(0, 5),
        createdAt: new Date(),
      });

      // Create a reservation
      await addDoc(collection(db, 'reservations'), {
        userId: currentUser.uid,
        voyageId: voyageData.voyageId,
        agencyId: voyageData.agencyId,
        ticketId: ticketRef.id,
        typePlace: voyageData.seatType,
        prixTotal: voyageData.totalPrice,
        statut: 'confirmé',
        dateReservation: new Date().toISOString().split('T')[0],
        heureReservation: new Date().toTimeString().split(' ')[0].substring(0, 5),
        createdAt: new Date(),
        paiementId: paiementRef.id,
      });

      // Update voyage available seats
      const voyageRef = doc(db, 'voyages', voyageData.voyageId);
      const voyageDoc = await getDoc(voyageRef);
      
      if (voyageDoc.exists()) {
        const voyageData = voyageDoc.data();
        if (voyageData.seatType === 'Classique') {
          await updateDoc(voyageRef, {
            placesClassiqueDisponibles: voyageData.placesClassiqueDisponibles - 1
          });
        } else {
          await updateDoc(voyageRef, {
            placesVIPDisponibles: voyageData.placesVIPDisponibles - 1
          });
        }
      }

      // Add notification
      await addDoc(collection(db, 'notifications'), {
        userId: currentUser.uid,
        titre: 'Réservation confirmée',
        message: `Votre réservation pour ${voyageData.departure}-${voyageData.destination} a été confirmée`,
        type: 'reservation',
        lue: false,
        dateCreation: new Date().toISOString().split('T')[0],
        heureCreation: new Date().toTimeString().split(' ')[0].substring(0, 5),
        createdAt: new Date(),
      });

      Alert.alert(
        'Paiement réussi',
        'Votre ticket a été réservé avec succès!',
        [
          { 
            text: 'Voir mon ticket', 
            //onPress: () => navigation.navigate('TicketScreen', { ticketId: ticketRef.id }) 
          }
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détail de la réservation</Text>
          <Image 
            //source={require('../assets/images/GoExpress.png')} 
            style={styles.headerLogo} 
          />
        </View>

        <View style={styles.ticketCard}>
          <Image 
            //source={require('../assets/images/GoExpress.png')} 
            style={styles.agencyLogo} 
          />
          
          <View style={styles.routeContainer}>
            <Text style={styles.cityText}>{voyageData.departure}</Text>
            <View style={styles.arrowContainer}>
              <Icon name="arrow-right" size={24} color="#000" />
            </View>
            <Text style={styles.cityText}>{voyageData.destination}</Text>
          </View>
          
          <View style={styles.ticketDetailsRow}>
            <Text style={styles.agencyName}>{voyageData.agencyName}</Text>
            <Text style={styles.seatInfo}>{voyageData.seatCount} places {voyageData.seatType}</Text>
          </View>
          
          <View style={styles.ticketDetailsRow}>
            <Text style={styles.departureTime}>{voyageData.departureTime}</Text>
            <Text style={styles.priceText}>Prix total: {voyageData.totalPrice} FCFA</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information personnelle</Text>
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{passengerData.name}</Text>
            <Text style={styles.passengerDetail}>{passengerData.age} ans</Text>
            <View style={styles.genderRow}>
              <Icon name="circle" size={12} color="#000" />
              <Text style={styles.passengerDetail}> {passengerData.gender}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options de Paiement</Text>
          
          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              selectedPaymentMethod === 'Mobile Money' && styles.selectedPayment
            ]}
            onPress={() => handlePaymentMethodSelect('Mobile Money')}
          >
            <Image 
             
              style={styles.paymentLogo}
            />
            <Text style={styles.paymentText}>Mobile Money</Text>
            <Icon name="chevron-right" size={24} color="#757575" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.paymentOption, 
              selectedPaymentMethod === 'Orange Money' && styles.selectedPayment
            ]}
            onPress={() => handlePaymentMethodSelect('Orange Money')}
          >
            <Image 
             
              style={styles.paymentLogo}
            />
            <Text style={styles.paymentText}>Orange Money</Text>
            <Icon name="chevron-right" size={24} color="#757575" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.paymentButton}
          onPress={handleProceedPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.paymentButtonText}>Procéder au paiement</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="home" size={24} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="ticket-confirmation" size={24} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="bus" size={24} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="account" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerLogo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  ticketCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  agencyLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 10,
  },
  routeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  arrowContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 5,
  },
  ticketDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  agencyName: {
    fontSize: 16,
    color: '#fff',
  },
  seatInfo: {
    fontSize: 14,
    color: '#fff',
  },
  departureTime: {
    fontSize: 14,
    color: '#fff',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  passengerInfo: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#000',
  },
  passengerDetail: {
    fontSize: 14,
    color: '#64748B',
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  selectedPayment: {
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  paymentLogo: {
    width: 30,
    height: 30,
    marginRight: 15,
  },
  paymentText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  paymentButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navItem: {
    alignItems: 'center',
    padding: 5,
  },
});

export default PaymentScreen;





