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
  PermissionsAndroid
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

  // Récupérer les données avec des valeurs par défaut pour éviter l'erreur
  const {
    ticketData = {},
    allTickets = [],
    voyageData = {},
    reservationData = {}
  } = route.params || {};

  const handleShare = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      const fileName = `ticket_${ticketData.reservationId || 'voyage'}_${new Date().getTime()}.png`;
      const { dirs } = RNFetchBlob.fs;
      const filePath = `${dirs.CacheDir}/${fileName}`;
      
      await RNFetchBlob.fs.writeFile(filePath, uri.replace('data:image/png;base64,', ''), 'base64');

      await RNFetchBlob.fs.writeFile(filePath, uri.replace('data:image/png;base64,', ''), 'base64');
      
      RNFetchBlob.ios.previewDocument(filePath);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager le billet');
    }
  };

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

  const downloadTicket = async () => {
    try {
      setLoading(true);

      if (Platform.OS === 'android' && Platform.Version < 29) {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
          Alert.alert(
            'Permission refusée', 
            'Impossible de télécharger le ticket sans permission de stockage',
            [
              {
                text: 'Réessayer',
                onPress: () => downloadTicket()
              },
              {
                text: 'OK'
              }
            ]
          );
          setLoading(false);
          return;
        }
      }

      if (!viewShotRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer le ticket');
        setLoading(false);
        return;
      }

      const uri = await viewShotRef.current.capture();
      const fileName = `ticket_${ticketData.reservationId || 'voyage'}_${new Date().getTime()}.png`;
      const { dirs } = RNFetchBlob.fs;
      let dirPath, filePath;
      
      if (Platform.OS === 'ios') {
        dirPath = dirs.DocumentDir;
        filePath = `${dirPath}/${fileName}`;
      } else {
        dirPath = dirs.DownloadDir || dirs.DocumentDir;
        filePath = `${dirPath}/${fileName}`;
      }
      
      await RNFetchBlob.fs.writeFile(filePath, uri.replace('data:image/png;base64,', ''), 'base64');
      
      if (Platform.OS === 'ios') {
        await RNFetchBlob.ios.previewDocument(filePath);
      } else {
        try {
          await RNFetchBlob.android.actionViewIntent(filePath, 'image/png');
        } catch (e) {
          Alert.alert(
            'Succès',
            `Ticket téléchargé avec succès dans ${dirPath}/${fileName}`,
            [{ text: 'OK' }]
          );
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      Alert.alert(
        'Erreur', 
        'Impossible de télécharger le ticket',
        [
          {
            text: 'Réessayer',
            onPress: () => downloadTicket()
          },
          {
            text: 'OK'
          }
        ]
      );
      setLoading(false);
    }
  };

  const sendEmailWithTicket = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    try {
      setLoading(true);
      
      const uri = await viewShotRef.current.capture();
      const fileName = `ticket_${ticketData.reservationId || 'voyage'}_${new Date().getTime()}.png`;
      const { dirs } = RNFetchBlob.fs;
      const filePath = `${dirs.CacheDir}/${fileName}`;
      
      await RNFetchBlob.fs.writeFile(filePath, uri.replace('data:image/png;base64,', ''), 'base64');
      
      Mailer.mail({
        subject: `Votre billet de voyage ${voyageData.departure || ''} - ${voyageData.destination || ''}`,
        recipients: [email],
        body: `Bonjour,<br><br>Voici votre billet pour le voyage de ${voyageData.departure || ''} à ${voyageData.destination || ''} prévu le ${formatDate(voyageData.dateDepart)} à ${voyageData.departureTime || 'N/A'}.<br><br>Bon voyage!`,
        isHTML: true,
        attachment: {
          path: filePath,
          type: 'png',
          name: fileName
        }
      }, (error, event) => {
        setLoading(false);
        setEmailModalVisible(false);
        
        if (error) {
          Alert.alert(
            'Erreur', 
            'Impossible d\'envoyer l\'email',
            [
              {
                text: 'Télécharger à la place',
                onPress: () => downloadTicket()
              },
              {
                text: 'OK'
              }
            ]
          );
        }
      });
    } catch (error) {
      console.error('Erreur envoi email:', error);
      setLoading(false);
      Alert.alert('Erreur', 'Impossible de préparer l\'email');
    }
  };

  const renderTickets = () => {
    if (!Array.isArray(allTickets) || allTickets.length === 0) {
      return renderSingleTicket(ticketData);
    }

    return allTickets.map((ticket, index) => (
      <View key={`ticket-${index}`} style={styles.ticketContainer}>
        {renderSingleTicket(ticket)}
        {index < allTickets.length - 1 && <View style={styles.ticketSeparator} />}
      </View>
    ));
  };

  const renderSingleTicket = (ticket) => {
    if (!ticket) return null;

    return (
      <View style={styles.ticketContent}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketTitle}>E-TICKET</Text>
          <Text style={styles.ticketReference}>REF: {ticket.reservationId || 'N/A'}</Text>
        </View>

        <View style={styles.journeyCard}>
          <Text style={styles.cityName}>{voyageData.departure || 'Départ'}</Text>
          <View style={styles.directionIconContainer}>
            <MaterialCommunityIcons name="arrow-right-thick" size={24} color="white" />
          </View>
          <Text style={styles.cityName}>{voyageData.destination || 'Destination'}</Text>
        </View>

        <View style={styles.ticketRow}>
          <View style={styles.ticketInfo}>
            <Text style={styles.infoLabel}>Voyageur</Text>
            <Text style={styles.infoValue}>{ticket.fullName || 'N/A'}</Text>
          </View>
          <View style={styles.ticketInfo}>
            <Text style={styles.infoLabel}>Siège</Text>
            <Text style={styles.infoValue}>{ticket.placeNumber || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.ticketRow}>
          <View style={styles.ticketInfo}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(voyageData.dateDepart)}</Text>
          </View>
          <View style={styles.ticketInfo}>
            <Text style={styles.infoLabel}>Heure</Text>
            <Text style={styles.infoValue}>{voyageData.departureTime || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.ticketRow}>
          <View style={styles.ticketInfo}>
            <Text style={styles.infoLabel}>Type de siège</Text>
            <Text style={styles.infoValue}>{ticket.typePlace || 'Standard'}</Text>
          </View>
          <View style={styles.ticketInfo}>
            <Text style={styles.infoLabel}>Prix</Text>
            <Text style={styles.infoValue}>{formatPrice(ticket.prixTotal)}</Text>
          </View>
        </View>

        <View style={styles.ticketRow}>
          <View style={styles.ticketInfo}>
            <Text style={styles.infoLabel}>Agence</Text>
            <Text style={styles.infoValue}>{voyageData.agencyName || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.qrCodeContainer}>
          <QRCode
            value={JSON.stringify({
              ref: ticket.reservationId,
              name: ticket.fullName,
              seat: ticket.placeNumber,
              voyage: `${voyageData.departure}-${voyageData.destination}`
            })}
            size={120}
          />
        </View>

        <Text style={styles.ticketNote}>
          Présentez ce ticket à l'agence avant l'embarquement
        </Text>
      </View>
    );
  };

  const renderEmailModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={emailModalVisible}
      onRequestClose={() => setEmailModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Envoyer par email</Text>

          <TextInput
            style={styles.emailInput}
            placeholder="Entrez l'adresse email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setEmailModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.confirmButton]} 
              onPress={sendEmailWithTicket}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.modalButtonText}>Envoyer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoToHome} style={styles.backButton}>
          <Icon name="home" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Votre billet</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Icon name="share-2" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Traitement en cours...</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.successMessage}>
          <Icon name="check-circle" size={50} color="#4CAF50" />
          <Text style={styles.successText}>Réservation confirmée!</Text>
          <Text style={styles.successSubtext}>
            Votre réservation a été enregistrée avec succès
          </Text>
        </View>

        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          {renderTickets()}
        </ViewShot>
        
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Pour télécharger ou envoyer votre ticket:
          </Text>
          <View style={styles.instructionItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.instructionText}>
              L'application a besoin d'accéder au stockage
            </Text>
          </View>
          {Platform.OS === 'android' && (
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={requestStoragePermission}
            >
              <Text style={styles.permissionButtonText}>
                Accorder la permission
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={downloadTicket}
            disabled={loading}
          >
            <Icon name="download" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Télécharger</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setEmailModalVisible(true)}
            disabled={loading}
          >
            <Icon name="mail" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Envoyer par email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.returnButton} onPress={handleGoToHome}>
        <Text style={styles.returnButtonText}>Retour à l'accueil</Text>
      </TouchableOpacity>

      {renderEmailModal()}
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
  },
  shareButton: {
    padding: 5,
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
  successMessage: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 15,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  ticketContainer: {
    marginBottom: 20,
  },
  ticketContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketReference: {
    fontSize: 14,
    color: '#666',
  },
  journeyCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
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
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  ticketInfo: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  ticketNote: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  ticketSeparator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 15,
  },
  returnButton: {
    backgroundColor: '#007bff',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    opacity: 1,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 10,
    color: '#007bff',
    fontWeight: 'bold',
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  instructionsText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#333',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  instructionText: {
    fontSize: 13,
    marginLeft: 8,
    color: '#555',
  },
  permissionButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default TicketScreen;