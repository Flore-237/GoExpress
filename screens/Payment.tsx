import React, { useState, useEffect } from 'react';  
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { reservationData, voyageData } = route.params || {};

  // Utilisateur actuel
  const [currentUser, setCurrentUser] = useState(null);
  
  // États pour les passagers
  const [passengers, setPassengers] = useState([{
    fullName: '',
    email: '',
    phone: '',
    pieceIdentite: '',
    seatLabel: ''
  }]);
  
  // État de chargement
  const [loading, setLoading] = useState(false);
  // État pour suivre si les données utilisateur ont été chargées
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // Date et heure actuelles
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const formattedTime = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;

  // Initialisation des passagers en fonction du nombre de sièges sélectionnés
  useEffect(() => {
    if (reservationData && reservationData.selectedSeats && reservationData.selectedSeats.length > 0) {
      const initialPassengers = reservationData.selectedSeats.map(seat => ({
        fullName: '',
        email: '',
        phone: '',
        pieceIdentite: '',
        seatLabel: seat.label
      }));
      setPassengers(initialPassengers);
      
      console.log('Initialisation des passagers:', initialPassengers.length);
    }
  }, [reservationData]);

  // Récupération de l'utilisateur actuel
  useEffect(() => {
    console.log('Vérification de l\'utilisateur connecté...');
    const user = auth().currentUser;
    if (user) {
      console.log('Utilisateur connecté:', user.uid);
      setCurrentUser(user);
      
      // Récupérer les informations de l'utilisateur depuis Firestore
      firestore()
        .collection('users')
        .doc(user.uid)
        .get()
        .then(documentSnapshot => {
          console.log('Récupération des données utilisateur...');
          if (documentSnapshot.exists) {
            const userData = documentSnapshot.data();
            console.log('Données utilisateur récupérées:', userData);
            
            // Mettre à jour uniquement le premier passager avec les données de l'utilisateur
            setPassengers(prevPassengers => {
              const updatedPassengers = [...prevPassengers];
              updatedPassengers[0] = {
                ...updatedPassengers[0],
                fullName: userData.fullName || '',
                email: userData.email || user.email || '',
                phone: userData.phone || ''
              };
              return updatedPassengers;
            });
            
            setUserDataLoaded(true);
          } else {
            console.log('Aucune donnée utilisateur trouvée dans Firestore');
            // Mettre à jour uniquement l'email du premier passager
            setPassengers(prevPassengers => {
              const updatedPassengers = [...prevPassengers];
              updatedPassengers[0] = {
                ...updatedPassengers[0],
                email: user.email || ''
              };
              return updatedPassengers;
            });
            
            setUserDataLoaded(true);
          }
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des informations utilisateur:', error);
          setUserDataLoaded(true);
        });
    } else {
      console.log('Aucun utilisateur connecté');
      setUserDataLoaded(true);
    }
  }, []);

  const handleGoBack = () => navigation.goBack();

  const validateForm = () => {
    console.log('Validation du formulaire...');
    
    // Vérifier chaque passager
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      if (!passenger.fullName.trim()) {
        Alert.alert('Erreur', `Veuillez entrer le nom complet du passager ${i + 1}`);
        return false;
      }
      if (!passenger.email.trim() || !passenger.email.includes('@')) {
        Alert.alert('Erreur', `Veuillez entrer une adresse email valide pour le passager ${i + 1}`);
        return false;
      }
      if (!passenger.phone.trim() || passenger.phone.length < 8) {
        Alert.alert('Erreur', `Veuillez entrer un numéro de téléphone valide pour le passager ${i + 1}`);
        return false;
      }
      if (!passenger.pieceIdentite.trim()) {
        Alert.alert('Erreur', `Veuillez entrer un numéro de pièce d'identité pour le passager ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const generateRandomId = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePayment = async () => {
    // Validation du formulaire
    if (!validateForm()) return;

    setLoading(true);
    console.log('Début du processus de paiement...');

    try {
      // Génération d'IDs uniques
      const reservationId = generateRandomId(20);
      const paiementId = Math.floor(Math.random() * 10000).toString();
      
      console.log('IDs générés:', { reservationId, paiementId });

      // Traitement de chaque passager
      const reservationPromises = passengers.map(async (passenger, index) => {
        // Construction des données à enregistrer pour ce passager
        const ticketData = {
          userId: currentUser ? currentUser.uid : 0,
          voyageId: voyageData.voyageId,
          reservationId: `${reservationId}-${index}`,
          paiementId: paiementId,
          fullName: passenger.fullName,
          email: passenger.email,
          phone: passenger.phone,
          pieceIdentite: passenger.pieceIdentite,
          typePlace: reservationData.seatType,
          placeNumber: passenger.seatLabel,
          prixTotal: (reservationData.price / passengers.length).toString(),
          dateReservation: formattedDate,
          heureReservation: formattedTime,
          ticketId: Math.floor(Math.random() * 1000) + 1
        };

        console.log(`Données du ticket pour le passager ${index + 1}:`, ticketData);

        // Enregistrement dans Firestore
        return firestore()
          .collection('reservations')
          .doc(`${reservationId}-${index}`)
          .set(ticketData)
          .then(() => {
            console.log(`Réservation enregistrée pour le passager ${index + 1}`);
            return ticketData;
          });
      });

      // Attendre que toutes les réservations soient enregistrées
      const ticketsData = await Promise.all(reservationPromises);
      console.log('Toutes les réservations ont été enregistrées');

      // Mise à jour des places disponibles dans le voyage
      const voyageRef = firestore().collection('voyages').doc(voyageData.voyageId);
      console.log('Mise à jour des places disponibles pour le voyage:', voyageData.voyageId);
      
      const voyageDoc = await voyageRef.get();
      
      if (voyageDoc.exists) {
        console.log('Document de voyage trouvé, mise à jour des places...');
        const seatsToUpdate = reservationData.seatType === 'Classique' 
          ? { availableClassicSeats: firestore.FieldValue.increment(-reservationData.selectedSeats.length) }
          : { availableVIPSeats: firestore.FieldValue.increment(-reservationData.selectedSeats.length) };
        
        await voyageRef.update(seatsToUpdate);
        console.log('Places mises à jour avec succès');
      } else {
        console.warn('Document de voyage non trouvé!');
      }

      // Navigation vers la page de ticket avec les données
      console.log('Navigation vers l\'écran Ticket...');
      navigation.navigate('Ticket', { 
        ticketData: ticketsData[0], // Utiliser les données du premier ticket pour la compatibilité
        allTickets: ticketsData,    // Envoyer tous les tickets
        voyageData: voyageData,
        reservationData: reservationData
      });
    } catch (error) {
      console.error('Erreur détaillée lors de l\'enregistrement de la réservation:', error);
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Stack:', error.stack);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la réservation. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const updatePassengerField = (index, field, value) => {
    const updatedPassengers = [...passengers];
    updatedPassengers[index] = {
      ...updatedPassengers[index],
      [field]: value
    };
    setPassengers(updatedPassengers);
  };

  const formatPrice = (price) => {
    return `${Number(price).toLocaleString('fr-FR')} FCFA`;
  };

  const renderPassengerForms = () => {
    return passengers.map((passenger, index) => (
      <View key={`passenger-${index}`} style={styles.formCard}>
        <Text style={styles.formTitle}>
          {passengers.length > 1 
            ? `Passager ${index + 1} - Siège ${passenger.seatLabel}` 
            : 'Informations du voyageur'}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Nom complet</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le nom complet"
            value={passenger.fullName}
            onChangeText={(text) => updatePassengerField(index, 'fullName', text)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez l'adresse email"
            value={passenger.email}
            onChangeText={(text) => updatePassengerField(index, 'email', text)}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Téléphone</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le numéro de téléphone"
            value={passenger.phone}
            onChangeText={(text) => updatePassengerField(index, 'phone', text)}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pièce d'identité (CNI, Passeport)</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le numéro de pièce d'identité"
            value={passenger.pieceIdentite}
            onChangeText={(text) => updatePassengerField(index, 'pieceIdentite', text)}
          />
        </View>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finaliser la réservation</Text>
        <View style={styles.backButton} />
      </View>

      {!userDataLoaded ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Chargement des informations...</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView}>
            {/* Résumé de la réservation */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Résumé de votre voyage</Text>

              <View style={styles.journeyCard}>
                <Text style={styles.cityName}>{voyageData.departure}</Text>
                <View style={styles.directionIconContainer}>
                  <MaterialCommunityIcons name="arrow-right-thick" size={24} color="white" />
                </View>
                <Text style={styles.cityName}>{voyageData.destination}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-clock" size={18} color="#555" />
                <Text style={styles.infoText}>Départ: {voyageData.departureTime}, {new Date(voyageData.dateDepart).toLocaleDateString('fr-FR')}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="bus" size={18} color="#555" />
                <Text style={styles.infoText}>Agence: {voyageData.agencyName}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="seat-passenger" size={18} color="#555" />
                <Text style={styles.infoText}>
                  {reservationData.seatType} ({reservationData.selectedSeats.length} siège{reservationData.selectedSeats.length > 1 ? 's' : ''})
                  : {reservationData.selectedSeats.map(seat => seat.label).join(', ')}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total à payer:</Text>
                <Text style={styles.totalPrice}>{formatPrice(reservationData.price)}</Text>
              </View>
            </View>

            {/* Formulaire des informations des passagers */}
            {renderPassengerForms()}

            {/* Méthodes de paiement */}
            <View style={styles.paymentMethodCard}>
              <Text style={styles.paymentTitle}>Méthode de paiement</Text>
              
              <View style={styles.paymentOption}>
                <MaterialCommunityIcons name="cash" size={24} color="#007bff" />
                <Text style={styles.paymentOptionText}>Paiement à l'agence</Text>
                <MaterialCommunityIcons name="check-circle" size={20} color="#007bff" />
              </View>
              
              <Text style={styles.paymentInfo}>
                Vous payerez directement à l'agence avant le départ. Votre place est réservée pendant 24h.
              </Text>
            </View>
          </ScrollView>

          {/* Bouton de validation */}
          <TouchableOpacity 
            style={styles.payButton}
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>Confirmer la réservation</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    elevation: 2,
  },
  backButton: {
    padding: 5,
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  journeyCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
  },
  cityName: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  directionIconContainer: {
    backgroundColor: '#0056b3',
    padding: 5,
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  paymentMethodCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentOptionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  paymentInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 5,
  },
  payButton: {
    backgroundColor: '#007bff',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default PaymentScreen;