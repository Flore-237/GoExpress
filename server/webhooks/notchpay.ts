import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();

router.post('/notchpay-webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    // Vérifier la signature du webhook (à implémenter selon la doc NotchPay)
    // const isValid = verifyNotchPaySignature(req.headers, req.body);
    // if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

    switch (event) {
      case 'payment.success':
        // Mettre à jour la transaction
        await admin.firestore().collection('transactions').doc(data.reference).update({
          status: 'success',
          paymentDetails: data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour la réservation
        const transaction = await admin.firestore().collection('transactions').doc(data.reference).get();
        const transactionData = transaction.data();
        
        if (transactionData) {
          await admin.firestore().collection('reservations').doc(transactionData.reservationId).update({
            statut: 'confirmé',
            statutPaiement: 'confirmé',
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentDetails: {
              method: 'NotchPay',
              transactionId: data.reference,
              amount: data.amount,
              currency: data.currency
            }
          });
        }
        break;

      case 'payment.failed':
        // Mettre à jour la transaction
        await admin.firestore().collection('transactions').doc(data.reference).update({
          status: 'failed',
          errorDetails: data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour la réservation
        const failedTransaction = await admin.firestore().collection('transactions').doc(data.reference).get();
        const failedTransactionData = failedTransaction.data();
        
        if (failedTransactionData) {
          await admin.firestore().collection('reservations').doc(failedTransactionData.reservationId).update({
            statut: 'échec',
            statutPaiement: 'échec',
            errorDetails: data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        break;

      default:
        console.log('Event non géré:', event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erreur webhook NotchPay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 