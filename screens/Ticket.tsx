import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const TicketScreen = ({ route }) => {
  const { ticketIds, voyageData, passengers, paymentMethod, paymentReference } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vos tickets</Text>
      </View>

      {ticketIds.map((ticketId, index) => (
        <View key={ticketId} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Image 
              source={require('../assets/images/GoExpress.png')} 
              style={styles.agencyLogo} 
            />
            <Text style={styles.ticketId}>Ticket #{ticketId.substring(0, 8)}</Text>
          </View>

          <View style={styles.routeContainer}>
            <Text style={styles.cityText}>{voyageData.departure}</Text>
            <View style={styles.arrowContainer}>
              <Icon name="arrow-right" size={24} color="#000" />
            </View>
            <Text style={styles.cityText}>{voyageData.destination}</Text>
          </View>

          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{passengers[index].name}</Text>
            <Text style={styles.passengerDetail}>{passengers[index].age} ans - {passengers[index].gender}</Text>
            <Text style={styles.passengerDetail}>Siège: {index + 1}{String.fromCharCode(65 + index)}</Text>
          </View>

          <View style={styles.ticketDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{voyageData.dateDepart}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Heure:</Text>
              <Text style={styles.detailValue}>{voyageData.departureTime}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{voyageData.seatType}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Prix:</Text>
              <Text style={styles.detailValue}>{voyageData.totalPrice / voyageData.seatCount} FCFA</Text>
            </View>
          </View>

          <View style={styles.paymentInfo}>
            <Text style={styles.paymentMethod}>Payé par: {paymentMethod}</Text>
            <Text style={styles.paymentReference}>Référence: {paymentReference}</Text>
          </View>

          <View style={styles.barcodeContainer}>
            <Text style={styles.barcodeText}>TICKET-{ticketId.substring(0, 8)}</Text>
          </View>
        </View>
      ))}

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Instructions importantes</Text>
        <Text style={styles.instruction}>- Présentez ce ticket à l'embarquement</Text>
        <Text style={styles.instruction}>- Arrivez au moins 30 minutes avant le départ</Text>
        <Text style={styles.instruction}>- Ayez une pièce d'identité valide</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  agencyLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  ticketId: {
    fontSize: 14,
    color: '#64748B',
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
    color: '#000',
  },
  arrowContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    padding: 5,
  },
  passengerInfo: {
    marginBottom: 15,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  passengerDetail: {
    fontSize: 14,
    color: '#64748B',
  },
  ticketDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  paymentInfo: {
    marginBottom: 15,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#64748B',
  },
  paymentReference: {
    fontSize: 14,
    color: '#64748B',
  },
  barcodeContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  barcodeText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  instructions: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  instruction: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
});

export default TicketScreen;