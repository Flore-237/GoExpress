import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import firestore from '@react-native-firebase/firestore';
import * as Animatable from 'react-native-animatable';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { ViewShotProperties, captureRef } from 'react-native-view-shot';
import { ROUTES } from '../constants/routes';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const { width, height } = Dimensions.get('window');

// Types pour les paramètres de route
type RootStackParamList = {
  Ticket: {
    ticketData?: {
      agencyName: string;
      logoUrl: string;
      departure: string;
      destination: string;
      departureTime: string;
      departureDate: string;
      seatType: string;
      numberOfSeats: number;
      totalPrice: number;
      seats: Array<{ number: string }>;
      fullName: string;
      email: string;
      phone: string;
      gender: string;
      reservationId: string;
      paymentMethod: string;
      confirmedAt: Date;
    };
    reservationId?: string;
  };
};

type TicketScreenRouteProp = RouteProp<RootStackParamList, 'Ticket'>;

// Types pour les données utilisateur
interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

const TicketScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<TicketScreenRouteProp>();
  const { user } = useAuth();
  const viewShotRef = useRef<ViewShot>(null);
  
  const { ticketData, reservationId } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // État pour les données du ticket
  const [ticket, setTicket] = useState({
    agencyName: '',
    logoUrl: '',
    departure: '',
    destination: '',
    departureTime: '',
    departureDate: '',
    seatType: '',
    numberOfSeats: 0,
    totalPrice: 0,
    seats: [] as Array<{ number: string }>,
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    reservationId: '',
    paymentMethod: '',
    confirmedAt: null as Date | null,
    qrData: '',
    ticketNumber: ''
  });

  // Récupération des données de réservation
  useEffect(() => {
    const fetchTicketData = async () => {
      if (ticketData) {
        const userData = user as UserData | null;
        setTicket({
          agencyName: ticketData.agencyName || 'Agence inconnue',
          logoUrl: ticketData.logoUrl || 'https://via.placeholder.com/60',
          departure: ticketData.departure || '',
          destination: ticketData.destination || '',
          departureTime: ticketData.departureTime || '',
          departureDate: ticketData.departureDate || '',
          seatType: ticketData.seatType || '',
          numberOfSeats: ticketData.numberOfSeats || ticketData.seats?.length || 0,
          totalPrice: ticketData.totalPrice || 0,
          seats: ticketData.seats || [],
          fullName: ticketData.fullName || `${userData?.firstName || ''} ${userData?.lastName || ''}`,
          email: ticketData.email || userData?.email || '',
          phone: ticketData.phone || userData?.phone || '',
          gender: ticketData.gender || '',
          reservationId: ticketData.reservationId || reservationId || '',
          paymentMethod: ticketData.paymentMethod || '',
          confirmedAt: ticketData.confirmedAt || new Date(),
          qrData: `TICKET-${ticketData.reservationId || reservationId}-${Date.now()}`,
          ticketNumber: `TK${(ticketData.reservationId || reservationId || '').slice(-6).toUpperCase()}`
        });
        setIsLoading(false);
      } else if (reservationId) {
        const unsubscribe = firestore()
          .collection('reservations')
          .doc(reservationId)
          .onSnapshot(doc => {
            if (doc.exists) {
              const data = doc.data();
              const userData = user as UserData | null;
              setTicket({
                agencyName: data?.nomAgence || 'Agence inconnue',
                logoUrl: data?.logoAgence || 'https://via.placeholder.com/60',
                departure: data?.villeDepart || data?.departure || '',
                destination: data?.villeArrivee || data?.destination || '',
                departureTime: data?.heureDepart || '',
                departureDate: data?.dateVoyage || data?.departureDate || '',
                seatType: data?.seatType || data?.typePlace || '',
                numberOfSeats: data?.numberOfSeats || data?.seats?.length || 0,
                totalPrice: data?.prixTotal || data?.totalPrice || 0,
                seats: data?.seats || [],
                fullName: data?.passengerInfo ? 
                  `${data.passengerInfo.firstName || ''} ${data.passengerInfo.lastName || ''}` :
                  `${userData?.firstName || ''} ${userData?.lastName || ''}`,
                email: data?.passengerInfo?.email || userData?.email || '',
                phone: data?.paymentPhone || data?.passengerInfo?.phone || userData?.phone || '',
                gender: data?.passengerInfo?.gender || '',
                reservationId: reservationId,
                paymentMethod: data?.paymentMethod || '',
                confirmedAt: data?.confirmedAt?.toDate() || new Date(),
                qrData: `TICKET-${reservationId}-${Date.now()}`,
                ticketNumber: `TK${reservationId.slice(-6).toUpperCase()}`
              });
              setIsLoading(false);
            }
          });

        return () => unsubscribe();
      }
    };

    fetchTicketData();
  }, [ticketData, reservationId, user]);

  // Formatage de la date
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Formatage du prix
  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `${Number(numPrice).toLocaleString('fr-FR')} FCFA`;
  };

  // Téléchargement du billet en PDF
  const downloadTicketPDF = async () => {
    try {
      setIsDownloading(true);
      
      const viewShot = viewShotRef.current;
      if (!viewShot) {
        throw new Error('ViewShot reference is not available');
      }

      const uri = await captureRef(viewShot, {
        format: 'jpg',
        quality: 0.9,
      });
      
      // Demander la permission pour Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission refusée', 'Impossible de télécharger le billet sans permission');
          return;
        }
      }

      // Créer le nom du fichier
      const fileName = `Ticket_${ticket.ticketNumber}_${Date.now()}.pdf`;
      // S'assurer que le fichier va dans le dossier Téléchargements
      const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

      // Créer le contenu HTML pour le PDF avec toutes les informations importantes
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Billet de Voyage - ${ticket.ticketNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .ticket { max-width: 600px; margin: 0 auto; border: 2px solid #1976D2; border-radius: 12px; overflow: hidden; }
              .header { background: #1976D2; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .row { display: flex; justify-content: space-between; margin: 10px 0; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
              .route { text-align: center; margin: 20px 0; font-size: 24px; color: #1976D2; }
              .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
              .qr-section { text-align: center; margin: 20px 0; }
              .price { font-size: 18px; font-weight: bold; color: #1976D2; text-align: right; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <div class="header">
                <h1>${ticket.agencyName}</h1>
                <p>Billet N° ${ticket.ticketNumber}</p>
              </div>
              
              <div class="content">
                <div class="route">
                  ${ticket.departure} → ${ticket.destination}
                </div>
                <div class="row">
                  <span class="label">Date de départ:</span>
                  <span class="value">${formatDate(ticket.departureDate)}</span>
                </div>
                <div class="row">
                  <span class="label">Heure de départ:</span>
                  <span class="value">${ticket.departureTime}</span>
                </div>
                <div class="row">
                  <span class="label">Type de place:</span>
                  <span class="value">${ticket.seatType}</span>
                </div>
                <div class="row">
                  <span class="label">Numéros de siège:</span>
                  <span class="value">${ticket.seats.map(seat => seat.number).join(', ')}</span>
                </div>
                <div class="row">
                  <span class="label">Nombre de places:</span>
                  <span class="value">${ticket.numberOfSeats}</span>
                </div>
                <div class="row">
                  <span class="label">Méthode de paiement:</span>
                  <span class="value">${ticket.paymentMethod === 'OM' ? 'Orange Money' : ticket.paymentMethod === 'MoMo' ? 'Mobile Money' : ticket.paymentMethod}</span>
                </div>
                <hr style="margin: 20px 0; border: 1px dashed #ccc;">
                <h3>Informations Passager</h3>
                <div class="row">
                  <span class="label">Nom complet:</span>
                  <span class="value">${ticket.fullName}</span>
                </div>
                <div class="row">
                  <span class="label">Email:</span>
                  <span class="value">${ticket.email}</span>
                </div>
                <div class="row">
                  <span class="label">Téléphone:</span>
                  <span class="value">${ticket.phone}</span>
                </div>
                <div class="price">
                  Prix total: ${formatPrice(ticket.totalPrice)}
                </div>
              </div>
              <div class="footer">
                <p>Ce billet est valide uniquement pour la date et l'heure indiquées.</p>
                <p>Merci de voyager avec ${ticket.agencyName}!</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Convertir le HTML en PDF et sauvegarder
      await RNFS.writeFile(filePath, htmlContent, 'utf8');
      
      // Partager le PDF
      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        title: 'Télécharger le billet',
        message: `Billet n°${ticket.ticketNumber} - ${ticket.departure} → ${ticket.destination}`,
      });

      Alert.alert(
        'Succès',
        'Le billet a été téléchargé avec succès dans Téléchargements',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le billet');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Chargement du billet...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1976D2" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billet de Voyage</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <ViewShot ref={viewShotRef} style={styles.ticketContainer}>
          <View style={styles.ticket}>
            <View style={styles.ticketHeader}>
              <Image
                source={{ uri: ticket.logoUrl }}
                style={styles.agencyLogo}
                defaultSource={require('../assets/images/GoExpress.png')}
              />
              <Text style={styles.agencyName}>{ticket.agencyName}</Text>
              <Text style={styles.ticketNumber}>Billet N° {ticket.ticketNumber}</Text>
            </View>

            <View style={styles.routeContainer}>
              <View style={styles.routeInfo}>
                <Text style={styles.cityName}>{ticket.departure}</Text>
                <View style={styles.directionContainer}>
                  <Icon name="arrow-forward" size={24} color="#1976D2" />
                </View>
                <Text style={styles.cityName}>{ticket.destination}</Text>
              </View>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.dateTimeText}>
                  {formatDate(ticket.departureDate)} à {ticket.departureTime}
                </Text>
              </View>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.dateTimeText}>
                  Méthode de paiement : {ticket.paymentMethod === 'OM' ? 'Orange Money' : ticket.paymentMethod === 'MoMo' ? 'Mobile Money' : ticket.paymentMethod}
                </Text>
              </View>
            </View>

            <View style={styles.seatInfoContainer}>
              <Text style={styles.seatInfoTitle}>Détails des places</Text>
              <View style={styles.seatDetails}>
                <Text style={styles.seatType}>{ticket.seatType}</Text>
                <Text style={styles.seatNumbers}>
                  Places: {ticket.seats.map(seat => seat.number).join(', ')}
                </Text>
              </View>
            </View>

            <View style={styles.passengerInfoContainer}>
              <Text style={styles.passengerInfoTitle}>Informations Passager</Text>
              <View style={styles.passengerDetails}>
                <Text style={styles.passengerName}>{ticket.fullName}</Text>
                <Text style={styles.passengerContact}>{ticket.email}</Text>
                <Text style={styles.passengerContact}>{ticket.phone}</Text>
              </View>
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={ticket.qrData}
                size={120}
                color="#1976D2"
                backgroundColor="white"
              />
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Prix total</Text>
              <Text style={styles.priceValue}>{formatPrice(ticket.totalPrice)}</Text>
            </View>
          </View>
        </ViewShot>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={downloadTicketPDF}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="download-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Télécharger le billet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1976D2',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  ticketContainer: {
    padding: 15,
  },
  ticket: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  agencyLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 5,
  },
  ticketNumber: {
    fontSize: 14,
    color: '#666',
  },
  routeContainer: {
    marginBottom: 20,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  directionContainer: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 20,
  },
  dateTimeContainer: {
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
  },
  seatInfoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  seatInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  seatDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seatType: {
    fontSize: 14,
    color: '#666',
  },
  seatNumbers: {
    fontSize: 14,
    color: '#666',
  },
  passengerInfoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  passengerInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  passengerDetails: {
    gap: 5,
  },
  passengerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  passengerContact: {
    fontSize: 14,
    color: '#666',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  actionButtons: {
    padding: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  downloadButton: {
    backgroundColor: '#1976D2',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default TicketScreen;