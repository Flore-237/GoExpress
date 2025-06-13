import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PaymentMethodSelector = ({ selectedMethod, onSelect }) => {
  const methods = [
    {
      id: 'orange_money',
      name: 'Orange Money',
      icon: 'cellphone',
      color: '#FF7900'
    },
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      icon: 'cellphone',
      color: '#5D2D86'
    }
  ];

  return (
    <View style={styles.container}>
      {methods.map(method => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.methodButton,
            selectedMethod === method.id && styles.selectedMethod,
            { borderColor: method.color }
          ]}
          onPress={() => onSelect(method.id)}u
        >
          <View style={styles.methodContent}>
            <Icon 
              name={method.icon} 
              size={24} 
              color={method.color} 
              style={styles.methodIcon} 
            />
            <Text style={styles.methodText}>{method.name}</Text>
          </View>
          {selectedMethod === method.id && (
            <Icon name="check-circle" size={24} color={method.color} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  selectedMethod: {
    backgroundColor: '#f5f5f5',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    marginRight: 12,
  },
  methodText: {
    fontSize: 16,
    color: '#2c3e50',
  },
});

export default PaymentMethodSelector;