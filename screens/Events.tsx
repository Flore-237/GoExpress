import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, FlatList, Modal, TouchableOpacity, Button, Linking, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Feather from 'react-native-vector-icons/Feather';


interface Workshop {
  id: string;
  domaine: string;
  prixAtelier: number;
  photo: string;
  maxParticipants: number;
  bio: string;
  lienGroupe: string;
  nom: string;
}

const EventScreen = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('encadreurs')
      .onSnapshot(snapshot => {
        const fetchedWorkshops: Workshop[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          fetchedWorkshops.push({
            id: doc.id,
            domaine: data.domaine,
            prixAtelier: data.prixAtelier,
            photo: data.photo,
            maxParticipants: data.maxParticipants,
            bio: data.bio,
            lienGroupe: data.lienGroupe,
            nom: data.nom
          });
        });
        setWorkshops(fetchedWorkshops);
      });

    return () => unsubscribe();
  }, []);

  const renderWorkshop = ({ item }: { item: Workshop }) => (
    <TouchableOpacity
      style={styles.workshopContainer}
      onPress={() => {
        setSelectedWorkshop(item);
        setModalVisible(true);
      }}
    >
      <Image source={{ uri: item.photo }} style={styles.photo} />
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{item.domaine}</Text>
        <Text style={styles.price}>Prix: {item.prixAtelier} CFA</Text>
        <Text style={styles.participants}>Places disponibles: {item.maxParticipants}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleJoinGroup = () => {
    if (selectedWorkshop?.lienGroupe) {
      Linking.openURL(selectedWorkshop.lienGroupe);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Ateliers 2023-2024</Text>
      <FlatList
        data={workshops}
        keyExtractor={item => item.id}
        renderItem={renderWorkshop}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false} // Masque la barre de défilement
      />

      {selectedWorkshop && (
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image source={{ uri: selectedWorkshop.photo }} style={styles.modalImage} />
              <View>
                <Text style={{textAlign:'center',fontWeight:'regular'}}>{selectedWorkshop.nom}</Text>
                <Text style={styles.priceText}>{selectedWorkshop.prixAtelier} CFA</Text>
                <Text style={styles.modalBio}>{selectedWorkshop.bio}</Text>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={handleJoinGroup}>
                  <Feather name="message-square" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Rejoindre le groupe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buyButton]} onPress={() => Alert.alert('Atelier acheté !')}>
                  <Feather name="shopping-cart" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Acheter l'atelier</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
    <Feather name="x" size={18} color="#333" />
    <Text style={styles.closeButtonText}>Fermer</Text>
  </TouchableOpacity>            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default EventScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  workshopContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: '#5e17eb',
    marginBottom: 4,
  },
  participants: {
    fontSize: 14,
    color: '#555',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    height:'80%',
    margin:16,
    justifyContent:'center'
  },
  modalImage: {
    width: 160,
    height: 160,
    borderRadius: 60,
    marginBottom: 16,
  },
  modalBio: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    flexDirection: 'row',
    marginVertical: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5e17eb',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    width: '48%',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buyButton: {
    backgroundColor: '#ff6600', // Couleur différente pour le bouton d'achat
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  priceText: {
    fontSize: 28,           // Taille plus grande pour un effet prononcé
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Roboto-Bold',  // Exemple de fontFamily, remplacez par le nom de votre police
    color: 'pink',           // Optionnel : couleur pour améliorer la lisibilité
    marginVertical: 10,      // Espacement vertical pour aérer
  },
});
