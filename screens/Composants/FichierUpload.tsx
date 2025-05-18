import axios from 'axios';

const uploadImage = async (uri: string) => {
  const currentUser = auth().currentUser;
  if (!currentUser) return;

  setUploading(true);

  try {
    const data = new FormData();
    const fileName = uri.split('/').pop();

    data.append('file', {
      uri,
      type: 'image/jpeg',
      name: fileName,
    } as any);

    data.append('upload_preset', 'Mes images'); 
  data.append('cloud_name', 'dk97bi6xf'); 
    const res = await axios.post('https://api.cloudinary.com/v1_1/ton_cloud_name/image/upload', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const imageUrl = res.data.secure_url;

    // Mettre à jour Firestore avec l’URL Cloudinary
    await firestore().collection('users').doc(currentUser.uid).update({
      profileImage: imageUrl,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    setProfileImage(imageUrl);
    Alert.alert('Succès', 'Photo de profil mise à jour');

  } catch (error) {
    console.error('Erreur Cloudinary:', error);
    Alert.alert('Erreur', 'Téléversement échoué');
  } finally {
    setUploading(false);
  }
};
