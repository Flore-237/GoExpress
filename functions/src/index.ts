import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass
  }
});

// Fonction pour envoyer l'email de confirmation
export const sendReservationConfirmation = functions.firestore
  .document('reservations/{reservationId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    // Vérifier si le statut est passé à "confirmé"
    if (newData.statut === 'confirmé' && previousData.statut !== 'confirmé') {
      try {
        // Préparer les données pour l'email
        const reservationId = context.params.reservationId;
        const { userEmail, passengersInfo, voyageInfo } = newData;

        // Créer le contenu de l'email
        const emailContent = `
          <h1>Confirmation de Réservation - GoExpress</h1>
          <p>Cher client,</p>
          <p>Votre réservation a été confirmée avec succès.</p>
          
          <h2>Détails de la réservation :</h2>
          <ul>
            <li>Numéro de réservation : ${reservationId}</li>
            <li>Trajet : ${voyageInfo.departure} → ${voyageInfo.destination}</li>
            <li>Date : ${voyageInfo.departureDate}</li>
            <li>Heure de départ : ${voyageInfo.departureTime}</li>
          </ul>

          <h2>Passagers :</h2>
          <ul>
            ${passengersInfo.map((passenger: any) => `
              <li>${passenger.firstName} ${passenger.lastName}</li>
            `).join('')}
          </ul>

          <p>Merci d'avoir choisi GoExpress pour votre voyage.</p>
          <p>Cordialement,<br>L'équipe GoExpress</p>
        `;

        // Envoyer l'email
        await transporter.sendMail({
          from: 'GoExpress <noreply@goexpress.com>',
          to: userEmail,
          subject: 'Confirmation de Réservation - GoExpress',
          html: emailContent
        });

        console.log(`Email de confirmation envoyé pour la réservation ${reservationId}`);
      } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        throw new functions.https.HttpsError('internal', 'Erreur lors de l\'envoi de l\'email');
      }
    }
  }); 