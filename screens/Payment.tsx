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
  
  // Récupération des paramètres avec protection contre les valeurs undefined
  const { reservationData, reservationId } = route.params || {};

  console.log('Paramètres reçus:', { reservationData, reservationId });

  // Utilisateur actuel
  const [currentUser, setCurrentUser] = useState(null);
  
  // États pour les passagers
  const [passengers, setPassengers] = useState([]);
  
  // État de chargement
  const [loading, setLoading] = useState(false);
  // État pour suivre si les données utilisateur ont été chargées
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // Données normalisées avec valeurs par défaut
  const normalizedReservationData = {
    id: reservationData?.id || reservationId || 'default_reservation_id',
    voyageId: reservationData?.voyageId || 'default_voyage_id',
    agencyId: reservationData?.agencyId || 'default_agency_id',
    seatType: reservationData?.seatType || reservationData?.typePlace || 'Classique',
    seats: reservationData?.seats || [],
    numberOfSeats: reservationData?.numberOfSeats || (reservationData?.seats?.length || 1),
    totalPrice: reservationData?.totalPrice || reservationData?.prixTotal || 0,
    pricePerSeat: reservationData?.pricePerSeat || 0,
    departure: reservationData?.departure || reservationData?.villeDepart || 'Ville inconnue',
    destination: reservationData?.destination || reservationData?.villeArrivee || 'Ville inconnue',
    departureDate: reservationData?.departureDate || reservationData?.dateVoyage || new Date().toISOString(),
    departureTime: reservationData?.departureTime || reservationData?.heureDepart || '--:--',
    agencyName: reservationData?.nomAgence || 'Agence inconnue',
    agencyLogo: reservationData?.logoAgence || 'https://via.placeholder.com/50',
  };

  console.log('Données normalisées:', normalizedReservationData);

  // Date et heure actuelles
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const formattedTime = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;

  // Récupération de l'utilisateur actuel et chargements des données
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
          
          // Initialiser les passagers avec les sièges sélectionnés
          if (normalizedReservationData.seats && normalizedReservationData.seats.length > 0) {
            const initialPassengers = normalizedReservationData.seats.map((seat, index) => {
              // Pour le premier passager, récupérer les données de l'utilisateur
              if (index === 0) {
                if (documentSnapshot.exists) {
                  const userData = documentSnapshot.data();
                  console.log('Données utilisateur récupérées:', userData);
                  
                  return {
                    fullName: userData.fullName || userData.nom || '',
                    email: userData.email || user.email || '',
                    phone: userData.phone || userData.telephone || '',
                    pieceIdentite: userData.pieceIdentite || userData.cni || '',
                    seatLabel: seat.label || seat.number || `Siège ${index + 1}`
                  };
                } else {
                  console.log('Aucune donnée utilisateur trouvée dans Firestore');
                  return {
                    fullName: '',
                    email: user.email || '',
                    phone: '',
                    pieceIdentite: '',
                    seatLabel: seat.label || seat.number || `Siège ${index + 1}`
                  };
                }
              } else {
                // Pour les autres passagers, champs vides
                return {
                  fullName: '',
                  email: '',
                  phone: '',
                  pieceIdentite: '',
                  seatLabel: seat.label || seat.number || `Siège ${index + 1}`
                };
              }
            });
            
            console.log('Passagers initialisés:', initialPassengers);
            setPassengers(initialPassengers);
          } else {
            // Cas où il n'y a pas de sièges définis, créer un passager par défaut
            console.log('Aucun siège défini, création d\'un passager par défaut');
            const userData = documentSnapshot.exists ? documentSnapshot.data() : {};
            setPassengers([{
              fullName: userData.fullName || userData.nom || '',
              email: userData.email || user.email || '',
              phone: userData.phone || userData.telephone || '',
              pieceIdentite: userData.pieceIdentite || userData.cni || '',
              seatLabel: 'Siège 1'
            }]);
          }
          
          setUserDataLoaded(true);
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des informations utilisateur:', error);
          
          // Initialiser les passagers même en cas d'erreur
          const defaultPassengers = normalizedReservationData.seats && normalizedReservationData.seats.length > 0
            ? normalizedReservationData.seats.map((seat, index) => ({
                fullName: index === 0 ? '' : '',
                email: index === 0 ? (user.email || '') : '',
                phone: '',
                pieceIdentite: '',
                seatLabel: seat.label || seat.number || `Siège ${index + 1}`
              }))
            : [{
                fullName: '',
                email: user.email || '',
                phone: '',
                pieceIdentite: '',
                seatLabel: 'Siège 1'
              }];
          
          setPassengers(defaultPassengers);
          setUserDataLoaded(true);
        });
    } else {
      console.log('Aucun utilisateur connecté');
      
      // Initialiser les passagers sans données utilisateur
      const defaultPassengers = normalizedReservationData.seats && normalizedReservationData.seats.length > 0
        ? normalizedReservationData.seats.map((seat, index) => ({
            fullName: '',
            email: '',
            phone: '',
            pieceIdentite: '',
            seatLabel: seat.label || seat.number || `Siège ${index + 1}`
          }))
        : [{
            fullName: '',
            email: '',
            phone: '',
            pieceIdentite: '',
            seatLabel: 'Siège 1'
          }];
      
      setPassengers(defaultPassengers);
      setUserDataLoaded(true);
    }
  }, []);

  const handleGoBack = () => navigation.goBack();

  const validateForm = () => {
    console.log('Validation du formulaire...');
    
    // Vérifier chaque passager
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      const passengerNumber = i + 1;
      
      if (!passenger.fullName.trim()) {
        Alert.alert('Erreur', `Veuillez entrer le nom complet du passager ${passengerNumber}`);
        return false;
      }
      if (!passenger.email.trim() || !passenger.email.includes('@')) {
        Alert.alert('Erreur', `Veuillez entrer une adresse email valide pour le passager ${passengerNumber}`);
        return false;
      }
      if (!passenger.phone.trim() || passenger.phone.length < 8) {
        Alert.alert('Erreur', `Veuillez entrer un numéro de téléphone valide pour le passager ${passengerNumber}`);
        return false;
      }
      if (!passenger.pieceIdentite.trim()) {
        Alert.alert('Erreur', `Veuillez entrer un numéro de pièce d'identité pour le passager ${passengerNumber}`);
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
      // Utiliser l'ID de réservation existant ou en générer un nouveau
      const finalReservationId = normalizedReservationData.id !== 'default_reservation_id' 
        ? normalizedReservationData.id 
        : generateRandomId(20);
      
      const paiementId = Math.floor(Math.random() * 10000).toString();
      
      console.log('IDs utilisés:', { finalReservationId, paiementId });

      // Mise à jour de la réservation existante avec les informations des passagers
      const reservationUpdateData = {
        statut: 'confirmé',
        statutPaiement: 'en_attente',
        paymentStatus: 'en_attente',
        passagers: passengers.map((passenger, index) => ({
          fullName: passenger.fullName,
          email: passenger.email,
          phone: passenger.phone,
          pieceIdentite: passenger.pieceIdentite,
          seatLabel: passenger.seatLabel,
          passengerNumber: index + 1
        })),
        paiementId: paiementId,
        dateConfirmation: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      console.log('Mise à jour de la réservation:', reservationUpdateData);

      // Mettre à jour la réservation existante
      await firestore()
        .collection('reservations')
        .doc(finalReservationId)
        .update(reservationUpdateData);

      console.log('Réservation mise à jour avec succès');

      // Mise à jour des places disponibles dans le voyage
      if (normalizedReservationData.voyageId !== 'default_voyage_id') {
        const voyageRef = firestore().collection('voyages').doc(normalizedReservationData.voyageId);
        console.log('Mise à jour des places disponibles pour le voyage:', normalizedReservationData.voyageId);
        
        try {
          const voyageDoc = await voyageRef.get();
          
          if (voyageDoc.exists) {
            console.log('Document de voyage trouvé, mise à jour des places...');
            const seatsToUpdate = normalizedReservationData.seatType === 'Classique' 
              ? { placesClassiqueDisponibles: firestore.FieldValue.increment(-normalizedReservationData.numberOfSeats) }
              : { placesVIPDisponibles: firestore.FieldValue.increment(-normalizedReservationData.numberOfSeats) };
            
            await voyageRef.update(seatsToUpdate);
            console.log('Places mises à jour avec succès');
          } else {
            console.warn('Document de voyage non trouvé!');
          }
        } catch (voyageError) {
          console.error('Erreur lors de la mise à jour du voyage:', voyageError);
          // Ne pas bloquer le processus si la mise à jour du voyage échoue
        }
      }

      // Récupérer les données complètes de la réservation pour le ticket
      const updatedReservationDoc = await firestore()
        .collection('reservations')
        .doc(finalReservationId)
        .get();

      const completeReservationData = updatedReservationDoc.exists 
        ? updatedReservationDoc.data() 
        : normalizedReservationData;

      // Préparer les données pour le ticket
      const ticketData = {
        ...completeReservationData,
        reservationId: finalReservationId,
        paiementId: paiementId,
        passengers: passengers,
        // Données du voyage normalisées
        departure: normalizedReservationData.departure,
        destination: normalizedReservationData.destination,
        departureDate: normalizedReservationData.departureDate,
        departureTime: normalizedReservationData.departureTime,
        agencyName: normalizedReservationData.agencyName,
        agencyLogo: normalizedReservationData.agencyLogo,
        seatType: normalizedReservationData.seatType,
        totalPrice: normalizedReservationData.totalPrice,
        numberOfSeats: normalizedReservationData.numberOfSeats,
        seats: normalizedReservationData.seats
      };

      console.log('Données du ticket préparées:', ticketData);

      // Navigation vers la page de ticket avec les données complètes
      navigation.navigate('Ticket', { 
        ticketData: ticketData,
        reservationId: finalReservationId
      });

    } catch (error) {
      console.error('Erreur détaillée lors du processus de paiement:', error);
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Stack:', error.stack);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la confirmation de la réservation. Veuillez réessayer.');
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
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `${Number(numericPrice || 0).toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (e) {
      return '';
    }
  };

  const renderPassengerForms = () => {
    return passengers.map((passenger, index) => (
      <View key={`passenger-${index}`} style={styles.formCard}>
        <Text style={styles.formTitle}>
          {passengers.length > 1 
            ? (index === 0 
                ? `Vos informations - Siège ${passenger.seatLabel}` 
                : `Passager ${index + 1} - Siège ${passenger.seatLabel}`)
            : `Vos informations - Siège ${passenger.seatLabel}`}
        </Text>

        {/* Afficher un message informatif pour le premier passager */}
        {index === 0 && currentUser && (
          <Text style={styles.infoMessage}>
            ℹ️ Vos informations ont été pré-remplies. Vous pouvez les modifier si nécessaire.
          </Text>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Nom complet *</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le nom complet"
            value={passenger.fullName}
            onChangeText={(text) => updatePassengerField(index, 'fullName', text)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez l'adresse email"
            value={passenger.email}
            onChangeText={(text) => updatePassengerField(index, 'email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Téléphone *</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le numéro de téléphone"
            value={passenger.phone}
            onChangeText={(text) => updatePassengerField(index, 'phone', text)}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pièce d'identité (CNI, Passeport) *</Text>
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

  // Vérification des données avant le rendu
  if (!normalizedReservationData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={50} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Erreur de données</Text>
          <Text style={styles.errorText}>Les données de réservation sont manquantes.</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
                <Text style={styles.cityName}>{normalizedReservationData.departure}</Text>
                <View style={styles.directionIconContainer}>
                  <MaterialCommunityIcons name="arrow-right-thick" size={24} color="white" />
                </View>
                <Text style={styles.cityName}>{normalizedReservationData.destination}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-clock" size={18} color="#555" />
                <Text style={styles.infoText}>
                  Départ: {normalizedReservationData.departureTime}, {formatDate(normalizedReservationData.departureDate)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="bus" size={18} color="#555" />
                <Text style={styles.infoText}>Agence: {normalizedReservationData.agencyName}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="seat-passenger" size={18} color="#555" />
                <Text style={styles.infoText}>
                  {normalizedReservationData.seatType} ({normalizedReservationData.numberOfSeats} siège{normalizedReservationData.numberOfSeats > 1 ? 's' : ''})
                  {normalizedReservationData.seats && normalizedReservationData.seats.length > 0 && 
                    `: ${normalizedReservationData.seats.map(seat => seat.label || seat.number).join(', ')}`
                  }
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total à payer:</Text>
                <Text style={styles.totalPrice}>{formatPrice(normalizedReservationData.totalPrice)}</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
    flex: 1,
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
  infoMessage: {
    fontSize: 12,
    color: '#007bff',
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
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