import React, { useEffect, useState } from 'react';
import { View, StatusBar, ActivityIndicator } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import auth from '@react-native-firebase/auth';

// Importation des écrans
import HomeScreen from './screens/Home';
import SearchResultsScreen from './screens/SearchResults';
import SeatSelection from './screens/Seat_selection';
import DetailReservation from './screens/DetailReservation';
import ReservationsScreen from './screens/Reservations';
import HelpScreen from './screens/Help';
import ProfileScreen from './screens/Profile';
import AgencySelect from './screens/AgencySelect';
import AgencyDetailScreen from './screens/AgencyDetail';
import SignupScreen from './screens/SignupScreen';
import LoginScreen from './screens/LoginScreen';
import PaymentScreen from './screens/Payment';

// Création des navigateurs
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function AuthStackScreen() {
  return (
    <AuthStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right' 
      }}
      initialRouteName="Login"
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen 
        name="SeatSelectionScreen" 
        component={SeatSelection} 
        options={{ title: 'Sélection des sièges' }}
      />
      <Stack.Screen name="SelectAgency" component={AgencySelect} />
      <Stack.Screen name="AgencyDetails" component={AgencyDetailScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
}

function ReservationsStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Reservations" component={ReservationsScreen} />
      <Stack.Screen name="DetailReservation" component={DetailReservation} />
    </Stack.Navigator>
  );
}

function MainAppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Accueil':
              iconName = 'home';
              break;
            case 'Reservations':
              iconName = 'calendar';
              break;
            case 'Aide':
              iconName = 'help-circle';
              break;
            case 'Profil':
              iconName = 'user';
              break;
          }
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#5e17eb',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: { fontSize: 12, paddingBottom: 3 },
        tabBarStyle: { height: 60, paddingTop: 5 },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Accueil" 
        component={HomeStackScreen} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Réinitialise la pile de navigation quand on clique sur l'onglet Accueil
            navigation.navigate('Accueil', { screen: 'Home' });
          },
        })}
      />
      <Tab.Screen name="Reservations" component={ReservationsStackScreen} />
      <Tab.Screen name="Aide" component={HelpScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const App = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    SplashScreen.hide();
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5e17eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar backgroundColor="#5e17eb" barStyle="light-content" />
      {user ? <MainAppTabs /> : <AuthStackScreen />}
    </NavigationContainer>
  );
};

export default App;