import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import firestore from '@react-native-firebase/firestore';

interface NotchPayPaymentProps {
  amount: number;
  email: string;
  currency?: string;
  description?: string;
  reservationId: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

const NotchPayPayment: React.FC<NotchPayPaymentProps> = ({
  amount,
  email,
  currency = 'XAF',
  description = 'Paiement GoExpress',
  reservationId,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useAuth();

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // Générer une référence unique pour la transaction
      const transactionRef = `GOEXPRESS-${Date.now()}`;
      
      // Mettre à jour le statut de la réservation
      await firestore().collection('reservations').doc(reservationId).update({
        statut: 'en attente de paiement',
        transactionRef: transactionRef,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      const response = await fetch("https://api.notchpay.co/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "pk.4ynuCkosXYPYNkQpQ4Jnw8GcfENZP4XWWgQV64Kun5Qxq2zWebgGhwxqMIOlw3gH7j0PAzoB1YCM2AbDNFiYELVa3ri6H6KWFyKqm0useQQij1JRNL2yIqN84sRrp",
        },
        body: JSON.stringify({
          email,
          amount: Number(amount),
          currency,
          description,
          reference: transactionRef,
          callback: "https://goexpress.cm/payment-callback",
          metadata: {
            source: "GoExpress App",
            reservationId: reservationId
          },
        }),
      });

      const result = await response.json();
      
      if (result.status && result.authorization_url) {
        // Enregistrer la transaction dans Firestore
        await firestore().collection('transactions').doc(transactionRef).set({
          reservationId,
          amount,
          currency,
          status: 'pending',
          paymentUrl: result.authorization_url,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });

        // Ouvrir l'URL de paiement
        Linking.openURL(result.authorization_url);
        
        toast.success("Redirection vers la page de paiement", {
          description: "Veuillez compléter votre paiement dans la fenêtre qui s'ouvre",
        });
        
        onSuccess?.();
      } else {
        throw new Error(result.message || "Une erreur est survenue lors de l'initialisation du paiement");
      }
    } catch (error) {
      console.error("Erreur de paiement:", error);
      toast.error("Erreur de paiement", {
        description: "Une erreur est survenue lors du traitement de votre paiement. Veuillez réessayer.",
      });
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.payButton, loading && styles.disabledButton]}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.payButtonText}>Payer {amount} {currency}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 15,
  },
  payButton: {
    backgroundColor: '#4169E1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default NotchPayPayment; 