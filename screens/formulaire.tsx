import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PropTypes from 'prop-types';

const PassengerForm = ({ passengers, activePassengerIndex, onPassengerChange, onPassengerSelect }) => {
  const passenger = passengers[activePassengerIndex] || {};

  return (
    <View style={styles.formContainer}>
      {/* Onglets des passagers */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.passengerTabsContainer}
      >
        {passengers.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.passengerTab,
              activePassengerIndex === index && styles.activePassengerTab,
            ]}
            onPress={() => onPassengerSelect(index)}
          >
            <Text
              style={[
                styles.passengerTabText,
                activePassengerIndex === index && styles.activePassengerTabText,
              ]}
            >
              {index === 0 ? 'Vous' : `Passager ${index + 1}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Formulaire du passager actif */}
      <View style={styles.passengerInputContainer}>
        <View style={styles.formHeader}>
          <Text style={styles.formHeaderText}>
            {activePassengerIndex === 0
              ? 'Vos informations'
              : `Informations du passager ${activePassengerIndex + 1}`}
          </Text>
          <Icon name="account-details" size={20} color="#2563EB" />
        </View>

        {/* Nom & Prénom */}
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.input, styles.halfInput, { marginRight: 10 }]}
            placeholder="Prénom*"
            value={passenger.firstName || ''}
            onChangeText={(text) => onPassengerChange(activePassengerIndex, 'firstName', text)}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Nom*"
            value={passenger.lastName || ''}
            onChangeText={(text) => onPassengerChange(activePassengerIndex, 'lastName', text)}
          />
        </View>

        {/* Âge */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Âge*</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez l'âge"
            keyboardType="numeric"
            value={passenger.age || ''}
            onChangeText={(text) => onPassengerChange(activePassengerIndex, 'age', text)}
          />
        </View>

        {/* Genre */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Genre*</Text>
          <View style={styles.genderContainer}>
            {['Masculin', 'Féminin'].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderButton,
                  passenger.gender === gender && styles.selectedGender,
                ]}
                onPress={() => onPassengerChange(activePassengerIndex, 'gender', gender)}
              >
                <Icon
                  name={gender === 'Masculin' ? 'gender-male' : 'gender-female'}
                  size={18}
                  color={passenger.gender === gender ? '#fff' : '#64748B'}
                  style={styles.genderIcon}
                />
                <Text
                  style={
                    passenger.gender === gender
                      ? styles.selectedGenderText
                      : styles.genderButtonText
                  }
                >
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Téléphone */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Téléphone*</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 6XXXXXXXX"
            keyboardType="phone-pad"
            value={passenger.phone || ''}
            onChangeText={(text) => onPassengerChange(activePassengerIndex, 'phone', text)}
          />
          <Text style={styles.inputHint}>Format: 9 chiffres minimum</Text>
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="exemple@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={passenger.email || ''}
            onChangeText={(text) => onPassengerChange(activePassengerIndex, 'email', text)}
          />
        </View>

        {/* CNI */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Numéro CNI (facultatif)</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le numéro de CNI"
            value={passenger.cni || ''}
            onChangeText={(text) => onPassengerChange(activePassengerIndex, 'cni', text)}
          />
        </View>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Passager {activePassengerIndex + 1} sur {passengers.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((activePassengerIndex + 1) / passengers.length) * 100}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

PassengerForm.propTypes = {
  passengers: PropTypes.arrayOf(PropTypes.object).isRequired,
  activePassengerIndex: PropTypes.number.isRequired,
  onPassengerChange: PropTypes.func.isRequired,
  onPassengerSelect: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: 20,
  },
  passengerTabsContainer: {
    paddingBottom: 10,
  },
  passengerTab: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  activePassengerTab: {
    backgroundColor: '#2563EB',
  },
  passengerTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activePassengerTabText: {
    color: '#fff',
  },
  passengerInputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  formHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  halfInput: {
    flex: 1,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  selectedGender: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  genderButtonText: {
    color: '#64748B',
    marginLeft: 5,
  },
  selectedGenderText: {
    color: '#fff',
    marginLeft: 5,
  },
  genderIcon: {
    marginRight: 5,
  },
  inputHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
});

export default PassengerForm;
