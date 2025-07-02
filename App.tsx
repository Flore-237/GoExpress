import React, { useEffect, useState } from 'react';
import { StyleSheet, StatusBar, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from 'react-native-splash-screen';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Feather from 'react-native-vector-icons/Feather';
import { COLORS } from './constants/colors';
import { ROUTES } from './constants/routes';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import des écrans
import HomeScreen from './screens/Home';
import AgencyDetail from './screens/AgencyDetail';
import AgencySelect from './screens/AgencySelect';
import DetailReservation from './screens/DetailReservation';
import Help from './screens/Help';
import HoraireScreen from './screens/HoraireScreen';
import Payment from './screens/Payment';
import Profile from './screens/Profile';
import SearchResults from './screens/SearchResults';
import SeatSelection from './screens/Seat_selectionClassique';
import Ticket from './screens/Ticket';
import WelcomeScreen from './screens/WelcomScreen';
import FeaturesScreen from './screens/FutureScreen';
import FeaturesScreen3 from './screens/FutureScreen3';
import LoginScreen from './screens/Login';
import RegistrationScreen from './screens/singUp';
import HistoriqueReservation from './screens/HistoriqueReservation';
import SeatSelectionVipScreen from './screens/SeatSelectionVipScreen';
import SeatSelectionClassiqScreen from './screens/Seat_selectionClassique';

// Initialisation des navigateurs
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();

function OnboardingNavigator({ route }: { route: RouteProp<any, any> }) {
  const onFinishOnboarding = route?.params?.onFinishOnboarding || (() => {});
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name={ROUTES.WELCOME}>
        {(props) => <WelcomeScreen {...props} onNext={() => props.navigation.navigate(ROUTES.FEATURES)} />}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name={ROUTES.FEATURES}>
        {(props) => <FeaturesScreen {...props} onNext={() => props.navigation.navigate(ROUTES.FEATURES3)} />}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name={ROUTES.FEATURES3}>
        {(props) => <FeaturesScreen3 {...props} onNext={onFinishOnboarding} />}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.HOME} component={HomeScreen} />
      <Stack.Screen name={ROUTES.SEARCH_RESULTS} component={SearchResults} />
      <Stack.Screen name={ROUTES.AGENCY_SELECT} component={AgencySelect} />
      <Stack.Screen name={ROUTES.AGENCY_DETAIL} component={AgencyDetail} />
      <Stack.Screen name={ROUTES.SEAT_SELECTION} component={SeatSelection} />
      <Stack.Screen name={ROUTES.SEAT_SELECTION_VIP} component={SeatSelectionVipScreen} />
      <Stack.Screen name={ROUTES.SEAT_SELECTION_CLASSIQUE} component={SeatSelectionClassiqScreen} />
      <Stack.Screen name={ROUTES.PAYMENT} component={Payment} />
      <Stack.Screen name={ROUTES.TICKET} component={Ticket} />
      <Stack.Screen 
        name={ROUTES.HISTORIQUE_RESERVATION} 
        component={HistoriqueReservation}
        options={{ headerShown: true }}
      />
      <Stack.Screen 
        name={ROUTES.DETAIL_RESERVATION} 
        component={DetailReservation}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}

function ReservationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.HISTORIQUE_RESERVATION} component={HistoriqueReservation} />
      <Stack.Screen name={ROUTES.DETAIL_RESERVATION} component={DetailReservation} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.PROFILE} component={Profile} />
    
    </Stack.Navigator>
  );
}

function HelpStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.HELP} component={Help} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, focused }) => {
          const iconMap = {
            [ROUTES.HOME_TAB]: 'home',
            [ROUTES.RESERVATION_TAB]: 'calendar',
            [ROUTES.HELP_TAB]: 'help-circle',
            [ROUTES.PROFILE_TAB]: 'user'
          };

          const iconName = iconMap[route.name];

          return (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Feather name={iconName} size={22} color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          );
        },
        tabBarActiveTintColor: '#5e17eb',
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen 
        name={ROUTES.HOME_TAB}
        component={MainStackNavigator}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen 
        name={ROUTES.RESERVATION_TAB}
        component={ReservationStack}
        options={{ title: 'Réservations' }}
      />
      <Tab.Screen 
        name={ROUTES.HELP_TAB}
        component={HelpStack}
        options={{ title: 'Aide' }}
      />
      <Tab.Screen 
        name={ROUTES.PROFILE_TAB}
        component={ProfileStack}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <MainAppNavigator />
    </AuthProvider>
  );
};

const MainAppNavigator: React.FC = () => {
  const { isLoggedIn, loading } = useAuth();
  const [hasOnboarded, setHasOnboarded] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const initialize = async () => {
      try {
        const hasOnboardedValue = await AsyncStorage.getItem('hasOnboarded');
        setHasOnboarded(hasOnboardedValue === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsLoading(false);
        SplashScreen.hide();
      }
    };
    initialize();
  }, []);

  if (isLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabs} />
        ) : !hasOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} initialParams={{ onFinishOnboarding: () => setHasOnboarded(true) }} />
        ) : (
          <Stack.Screen name={ROUTES.AUTH} component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AuthNavigator: React.FC = () => {
  const { isLoggedIn } = useAuth();

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <AuthStack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
          <AuthStack.Screen name={ROUTES.REGISTER} component={RegistrationScreen} />
        </>
      ) : (
        <AuthStack.Screen name={ROUTES.MAIN_TABS} component={MainTabs} />
      )}
    </AuthStack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    height: 60,
    paddingBottom: 5,
  },
  tabBarLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5e17eb',
  },
});

export default App;