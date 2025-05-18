import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../screens/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../App';

const RegistrationScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires.');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit avoir au moins 6 caractères.');
      return false;
    }

    return true;
  };

  const handleRegistration = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Extraire prénom et nom
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const userData = {
        uid: user.uid,
        id: user.uid,
        email,
        fullName: name.trim(),
        firstName,
        lastName,
        phone,
        role: 'client',
        status: 'active',
        createdAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      await AsyncStorage.setItem('authToken', user.uid);
      await AsyncStorage.setItem('userId', user.uid);

      Alert.alert('Succès', 'Inscription réussie !');
      navigation.navigate(ROUTES.MAIN_TABS);
    } catch (error) {
      let message = "Erreur lors de l'inscription.";

      if (error.code === 'auth/email-already-in-use') {
        message = 'Cet email est déjà utilisé.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Email invalide.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Le mot de passe doit contenir au moins 6 caractères.';
      }

      console.error("Erreur d'inscription:", error);
      Alert.alert('Erreur', message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate(ROUTES.LOGIN);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Animatable.View animation="fadeInUp" duration={1000} style={styles.formContainer}>
            <Image
              source={require('../assets/images/GoExpress.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Inscription</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="gray"
                  style={styles.icon}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="gray"
                  style={styles.icon}
                />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleRegistration}>
                <Text style={styles.buttonText}>S'inscrire</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>
                Vous avez déjà un compte ? <Text style={styles.loginText}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </Animatable.View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
  },
  icon: {
    marginLeft: 10,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
  loginLink: {
    color: '#333',
    marginTop: 10,
  },
  loginText: {
    color: '#000000',
    fontWeight: 'bold',
  },
});

export default RegistrationScreen;
