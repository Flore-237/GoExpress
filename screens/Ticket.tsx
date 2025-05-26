import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Share,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import RNFetchBlob from 'rn-fetch-blob';
import ViewShot from 'react-native-view-shot';
import Mailer from 'react-native-mail';
import { ROUTES } from '../App';

const TicketScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const viewShotRef = React.useRef();
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(null);

  // Récupérer les données avec des valeurs par défaut
  const { ticketData = {}, reservationId } = route.params || {};

  console.log('Données reçues dans TicketScreen:', { ticketData, reservationId });

  // Créer les tickets individuels à partir des données
  const createTicketsFromData = () => {
    if (!ticketData.passengers || ticketData.passengers.length === 0) {
      return [{
        reservationId: ticketData.reservationId || reservationId || 'N/A',
        fullName: ticketData.fullName || 'N/A',
        email: ticketData.email || 'N/A',
        phone: ticketData.phone || 'N/A',
        pieceIdentite: ticketData.pieceIdentite || 'N/A',
        placeNumber: ticketData.seatLabel || ticketData.placeNumber || 'N/A',
        typePlace: ticketData.seatType || 'Classique',
        prixTotal: ticketData.totalPrice || ticketData.pricePerSeat || 0
      }];
    }

    return ticketData.passengers.map((passenger, index) => ({
      reservationId: ticketData.reservationId || reservationId || 'N/A',
      fullName: passenger.fullName || 'N/A',
      email: passenger.email || 'N/A',
      phone: passenger.phone || 'N/A',
      pieceIdentite: passenger.pieceIdentite || 'N/A',
      placeNumber: passenger.seatLabel || `Siège ${index + 1}`,
      typePlace: ticketData.seatType || 'Classique',
      prixTotal: ticketData.pricePerSeat || (ticketData.totalPrice / ticketData.passengers.length) || 0
    }));
  };

  const tickets = createTicketsFromData();

  // Données du voyage normalisées
  const voyageData = {
    departure: ticketData.departure || 'Ville inconnue',
    destination: ticketData.destination || 'Ville inconnue',
    dateDepart: ticketData.departureDate || new Date().toISOString(),
    departureTime: ticketData.departureTime || 'N/A',
    agencyName: ticketData.agencyName || 'Agence inconnue',
    agencyLogo: 'assets/images/logo.png'
  };

  console.log('Tickets créés:', tickets);
  console.log('Données voyage:', voyageData);

  const handleGoToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.MAIN_TABS }],
    });
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
      return dateString;
    }
  };

  const formatPrice = (price) => {
    if (!price) return '0 FCFA';
    return `${Number(price).toLocaleString('fr-FR')} FCFA`;
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          return true;
        }
        
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Permission de stockage",
            message: "L'application a besoin d'accéder au stockage pour enregistrer votre ticket.",
            buttonNeutral: "Demander plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error("Erreur de permission:", err);
        return false;
      }
    }
    return true;
  };

  const captureTicket = async (ticketIndex = null) => {
    try {
      if (!viewShotRef.current) {
        throw new Error('Référence ViewShot non disponible');
      }

      const uri = await viewShotRef.current.capture();
      return uri;
    } catch (error) {
      console.error('Erreur capture:', error);
      throw error;
    }
  };

  const downloadSingleTicket = async (ticketIndex) => {
    try {
      setLoading(true);
      setSelectedTicketIndex(ticketIndex);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission refusée', 'Impossible de télécharger sans permission de stockage');
        return;
      }

      const uri = await captureTicket(ticketIndex);
      const ticket = tickets[ticketIndex] || {};
      const fileName = `ticket_${ticket.reservationId || ticketIndex}_${new Date().getTime()}.png`;
      
      const { dirs } = RNFetchBlob.fs;
      let filePath;
      
      if (Platform.OS === 'ios') {
        filePath = `${dirs.DocumentDir}/${fileName}`;
      } else {
        filePath = `${dirs.DownloadDir}/${fileName}`;
      }
      
      await RNFetchBlob.fs.writeFile(
        filePath, 
        uri.replace('data:image/png;base64,', ''), 
        'base64'
      );
      
      if (Platform.OS === 'ios') {
        await Share.share({
          url: `file://${filePath}`,
          title: 'Ticket de voyage'
        });
      } else {
        Alert.alert(
          'Succès',
          `Ticket téléchargé avec succès dans le dossier Téléchargements`,
          [
            {
              text: 'Ouvrir',
              onPress: () => {
                RNFetchBlob.android.actionViewIntent(filePath, 'image/png')
                  .catch(() => console.log('Impossible d\'ouvrir le fichier'));
              }
            },
            { text: 'OK' }
          ]
        );
      }
      
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      Alert.alert(
        'Erreur', 
        'Impossible de télécharger le ticket. Vérifiez les permissions.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setSelectedTicketIndex(null);
    }
  };

  const downloadAllTickets = async () => {
    try {
      setLoading(true);
      
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission refusée', 'Impossible de télécharger sans permission de stockage');
        return;
      }

      for (let i = 0; i < tickets.length; i++) {
        await downloadSingleTicket(i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      Alert.alert('Succès', `${tickets.length} ticket(s) téléchargé(s) avec succès`);
      
    } catch (error) {
      console.error('Erreur téléchargement multiple:', error);
      Alert.alert('Erreur', 'Erreur lors du téléchargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailWithTicket = async (ticketIndex = null) => {
    if (!email || !email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    try {
      setLoading(true);
      
      const uri = await captureTicket(ticketIndex);
      const ticket = ticketIndex !== null ? tickets[ticketIndex] : tickets[0];
      const fileName = `ticket_${ticket.reservationId || 'voyage'}_${new Date().getTime()}.png`;
      
      const { dirs } = RNFetchBlob.fs;
      const filePath = `${dirs.CacheDir}/${fileName}`;
      
      await RNFetchBlob.fs.writeFile(
        filePath, 
        uri.replace('data:image/png;base64,', ''), 
        'base64'
      );
      
      const subject = ticketIndex !== null 
        ? `Votre billet de voyage ${voyageData.departure} - ${voyageData.destination}`
        : `Vos billets de voyage ${voyageData.departure} - ${voyageData.destination}`;
        
      const body = `Bonjour,<br><br>Voici votre${ticketIndex !== null ? '' : 's'} billet${ticketIndex !== null ? '' : 's'} pour le voyage de ${voyageData.departure} à ${voyageData.destination} prévu le ${formatDate(voyageData.dateDepart)} à ${voyageData.departureTime}.<br><br>Bon voyage!`;

      Mailer.mail({
        subject,
        recipients: [email],
        body,
        isHTML: true,
        attachment: {
          path: filePath,
          type: 'png',
          name: fileName
        }
      }, (error, event) => {
        setLoading(false);
        setEmailModalVisible(false);
        setEmail('');
        
        if (error) {
          console.error('Erreur mail:', error);
          Alert.alert(
            'Erreur d\'envoi', 
            'Impossible d\'envoyer l\'email. Vérifiez qu\'une application mail est configurée.',
            [
              {
                text: 'Télécharger à la place',
                onPress: () => ticketIndex !== null ? downloadSingleTicket(ticketIndex) : downloadAllTickets()
              },
              { text: 'OK' }
            ]
          );
        } else {
          Alert.alert('Succès', 'Email envoyé avec succès!');
        }
      });
      
    } catch (error) {
      console.error('Erreur préparation email:', error);
      setLoading(false);
      Alert.alert('Erreur', 'Impossible de préparer l\'email');
    }
  };

  const handleShare = async () => {
    try {
      const uri = await captureTicket();
      
      if (Platform.OS === 'ios') {
        await Share.share({
          url: uri,
          title: 'Ticket de voyage'
        });
      } else {
        const fileName = `ticket_${new Date().getTime()}.png`;
        const { dirs } = RNFetchBlob.fs;
        const filePath = `${dirs.CacheDir}/${fileName}`;
        
        await RNFetchBlob.fs.writeFile(
          filePath, 
          uri.replace('data:image/png;base64,', ''), 
          'base64'
        );
        
        await Share.share({
          url: `file://${filePath}`,
          title: 'Ticket de voyage'
        });
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le billet');
    }
  };

  const renderSingleTicket = (ticket, index) => {
    if (!ticket) return null;

    return (
      <View key={`ticket-${index}`} style={styles.ticketContainer}>
        
        {/* Header moderne avec dégradé */}
        <View style={styles.ticketHeader}>
          <View style={styles.headerGradient}>
            <View style={styles.logoSection}>
              <Image 
                source={require('../assets/images/logo.png')}
                style={styles.companyLogo}
                resizeMode="contain"
              />
              <View style={styles.headerText}>
                <Text style={styles.eTicketTitle}>E-BILLET</Text>
                <Text style={styles.companyName}>{voyageData.agencyName}</Text>
              </View>
            </View>
            <View style={styles.referenceBox}>
              <Text style={styles.refLabel}>REF</Text>
              <Text style={styles.refNumber}>{ticket.reservationId}</Text>
            </View>
          </View>
        </View>

        {/* Section voyage moderne */}
        <View style={styles.journeySection}>
          <View style={styles.journeyHeader}>
            <Text style={styles.journeyTitle}>ITINÉRAIRE</Text>
          </View>
          
          <View style={styles.routeContainer}>
            <View style={styles.cityInfo}>
              <Text style={styles.cityCode}>{voyageData.departure.substring(0, 3).toUpperCase()}</Text>
              <Text style={styles.cityName}>{voyageData.departure}</Text>
              <Text style={styles.locationLabel}>Départ</Text>
            </View>
            
            <View style={styles.routeLine}>
              <View style={styles.routeDot} />
              <View style={styles.routePath} />
              <View style={styles.routeDot} />
            </View>
            
            <View style={styles.cityInfo}>
              <Text style={styles.cityCode}>{voyageData.destination.substring(0, 3).toUpperCase()}</Text>
              <Text style={styles.cityName}>{voyageData.destination}</Text>
              <Text style={styles.locationLabel}>Arrivée</Text>
            </View>
          </View>
        </View>

        {/* Informations passager stylées */}
        <View style={styles.passengerCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-circle" size={20} color="#2c3e50" />
            <Text style={styles.cardTitle}>PASSAGER</Text>
          </View>
          <View style={styles.passengerDetails}>
            <Text style={styles.passengerName}>{ticket.fullName}</Text>
            <Text style={styles.idDocument}>ID: {ticket.pieceIdentite}</Text>
          </View>
        </View>

        {/* Détails du voyage en grille moderne */}
        <View style={styles.tripDetailsGrid}>
          <View style={styles.detailCard}>
            <MaterialCommunityIcons name="calendar-month" size={24} color="#e74c3c" />
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(voyageData.dateDepart)}</Text>
          </View>
          
          <View style={styles.detailCard}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#f39c12" />
            <Text style={styles.detailLabel}>Heure</Text>
            <Text style={styles.detailValue}>{voyageData.departureTime}</Text>
          </View>
          
          <View style={styles.detailCard}>
            <MaterialCommunityIcons name="seat" size={24} color="#9b59b6" />
            <Text style={styles.detailLabel}>Siège</Text>
            <Text style={styles.detailValue}>{ticket.placeNumber}</Text>
          </View>
          
          <View style={styles.detailCard}>
            <MaterialCommunityIcons name="crown" size={24} color="#27ae60" />
            <Text style={styles.detailLabel}>Classe</Text>
            <Text style={styles.detailValue}>{ticket.typePlace}</Text>
          </View>
        </View>

        {/* Prix stylé */}
        <View style={styles.priceSection}>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>TARIF</Text>
            <Text style={styles.priceAmount}>{formatPrice(ticket.prixTotal)}</Text>
          </View>
        </View>

        {/* QR Code moderne */}
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>CODE DE VALIDATION</Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={JSON.stringify({
                ref: ticket.reservationId,
                name: ticket.fullName,
                seat: ticket.placeNumber,
                voyage: `${voyageData.departure}-${voyageData.destination}`,
                date: voyageData.dateDepart,
                time: voyageData.departureTime
              })}
              size={80}
              backgroundColor="white"
              color="#2c3e50"
            />
          </View>
        </View>

        {/* Note importante moderne */}
        <View style={styles.importantNotice}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#e67e22" />
          <Text style={styles.noticeText}>
            Présentez ce billet à l'embarquement. Arrivée recommandée 30 min avant le départ.
          </Text>
        </View>

        {/* Actions individuelles */}
        <View style={styles.ticketActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.downloadBtn]} 
            onPress={() => downloadSingleTicket(index)}
            disabled={loading && selectedTicketIndex === index}
          >
            {loading && selectedTicketIndex === index ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="download" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Télécharger</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, styles.emailBtn]} 
            onPress={() => {
              setSelectedTicketIndex(index);
              setEmailModalVisible(true);
            }}
            disabled={loading}
          >
            <MaterialCommunityIcons name="email-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Partager</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmailModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={emailModalVisible}
      onRequestClose={() => {
        setEmailModalVisible(false);
        setSelectedTicketIndex(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Envoyer par email</Text>
            <TouchableOpacity 
              onPress={() => {
                setEmailModalVisible(false);
                setSelectedTicketIndex(null);
              }}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            {selectedTicketIndex !== null 
              ? `Billet n°${selectedTicketIndex + 1}`
              : 'Tous les billets'
            }
          </Text>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#666" />
            <TextInput
              style={styles.emailInput}
              placeholder="Adresse email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.cancelBtn]} 
              onPress={() => {
                setEmailModalVisible(false);
                setSelectedTicketIndex(null);
                setEmail('');
              }}
            >
              <Text style={styles.modalBtnText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalBtn, styles.sendBtn]} 
              onPress={() => sendEmailWithTicket(selectedTicketIndex)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={[styles.modalBtnText, { color: 'white' }]}>Envoyer</Text>
              )}
            </TouchableOpacity>
          </View>
         </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header moderne */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoToHome} style={styles.headerBtn}>
          <MaterialCommunityIcons name="home-outline" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vos Billets</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <MaterialCommunityIcons name="share-variant-outline" size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>

      {/* Overlay de chargement */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Traitement en cours...</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Message de confirmation moderne */}
        <View style={styles.successBanner}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check-circle" size={40} color="#27ae60" />
          </View>
          <View style={styles.successContent}>
            <Text style={styles.successTitle}>Réservation Confirmée</Text>
            <Text style={styles.successMessage}>Vos billets sont prêts pour le voyage</Text>
          </View>
        </View>

        {/* Conteneur des tickets */}
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          <View style={styles.ticketsWrapper}>
            {tickets.map((ticket, index) => (
              <View key={`ticket-wrapper-${index}`}>
                {renderSingleTicket(ticket, index)}
                {index < tickets.length - 1 && <View style={styles.ticketDivider} />}
              </View>
            ))}
          </View>
        </ViewShot>

        {/* Actions globales pour plusieurs tickets */}
        {tickets.length > 1 && (
          <View style={styles.globalActions}>
            <Text style={styles.globalTitle}>Actions groupées</Text>
            <View style={styles.globalBtns}>
              <TouchableOpacity 
                style={[styles.globalBtn, styles.downloadAllBtn]} 
                onPress={downloadAllTickets}
                disabled={loading}
              >
                <MaterialCommunityIcons name="download-multiple" size={20} color="#fff" />
                <Text style={styles.globalBtnText}>Télécharger tout</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.globalBtn, styles.emailAllBtn]} 
                onPress={() => {
                  setSelectedTicketIndex(null);
                  setEmailModalVisible(true);
                }}
                disabled={loading}
              >
                <MaterialCommunityIcons name="email-multiple-outline" size={20} color="#fff" />
                <Text style={styles.globalBtnText}>Envoyer tout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bouton retour fixe */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.homeButton} onPress={handleGoToHome}>
          <MaterialCommunityIcons name="home" size={20} color="#fff" />
          <Text style={styles.homeButtonText}>Retour Accueil</Text>
        </TouchableOpacity>
      </View>

      {renderEmailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  successIcon: {
    marginRight: 16,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  successMessage: {
    fontSize: 14,
    color: '#64748b',
  },
  ticketsWrapper: {
    marginTop: 16,
  },
  ticketContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  ticketHeader: {
    overflow: 'hidden',
  },
  headerGradient: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    width: 50,
    height: 30,
    marginRight: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
  },
  headerText: {},
  eTicketTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  companyName: {
    fontSize: 12,
    color: '#bde4ff',
    marginTop: 2,
  },
  referenceBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  refLabel: {
    fontSize: 10,
    color: '#bde4ff',
    fontWeight: '600',
  },
  refNumber: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
    marginTop: 2,
  },
  journeySection: {
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  journeyHeader: {
    marginBottom: 16,
  },
  journeyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityInfo: {
    flex: 1,
    alignItems: 'center',
  },
  cityCode: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  cityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  routeLine: {
    flexDirection: 'row',
      routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  routePath: {
    flex: 1,
    height: 2,
    backgroundColor: '#cbd5e1',
  },
  passengerCard: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 8,
    letterSpacing: 1,
  },
  passengerDetails: {},
  passengerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  idDocument: {
    fontSize: 12,
    color: '#64748b',
  },
  tripDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  detailCard: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  priceSection: {
    padding: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  priceCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  priceLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  qrSection: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    letterSpacing: 1,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  importantNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fffaf0',
    borderTopWidth: 1,
    borderColor: '#fef3c7',
  },
  noticeText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  ticketActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  downloadBtn: {
    backgroundColor: '#3498db',
  },
  emailBtn: {
    backgroundColor: '#10b981',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  ticketDivider: {
    height: 16,
  },
  globalActions: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  globalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'center',
  },
  globalBtns: {
    flexDirection: 'row',
  },
  globalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  downloadAllBtn: {
    backgroundColor: '#3b82f6',
  },
  emailAllBtn: {
    backgroundColor: '#10b981',
  },
  globalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  bottomActions: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 8,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#1e293b',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#3498db',
    marginLeft: 8,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  }
});


export default TicketScreen;