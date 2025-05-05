import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/Home';
import { NavigationContainer } from '@react-navigation/native';
import EventScreen from './screens/Events';
import MoreScreen from './screens/More';
import Feather from 'react-native-vector-icons/Feather';
import SearchResultsScreen from './screens/SearchResults';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const App = () => {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hide();
    }, 500);
  }, []);

  function MyTabs() {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color }) => {
            let iconName;

            if (route.name === 'Acceuil') {
              iconName = 'home';
            } else if (route.name === 'Aide') {
              iconName = 'compass';
            } else if (route.name === 'Profile') {
              iconName = 'user';
            } else if (route.name === 'Reservation') {
              iconName = 'calendar';
            }

            return (
              <View style={styles.iconContainer}>
                <Feather name={iconName} size={18} color={color} />
              </View>
            );
          },
          tabBarActiveTintColor: '#5e17eb',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Acceuil" component={HomeScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Reservation" component={MoreScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Profile" component={MoreScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Aide" component={EventScreen} options={{ headerShown: false }} />
        
      </Tab.Navigator>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar backgroundColor="#5e17eb" barStyle="light-content" />
      <Stack.Navigator>
        {/* Incluez MyTabs comme un écran dans le Stack.Navigator */}
        <Stack.Screen name="Main" component={MyTabs} options={{ headerShown: false }} />
        <Stack.Screen name="event" component={EventScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="more" component={MoreScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ headerShown: false }}/>
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,   // Largeur pour l'icône
    height: 40,  // Hauteur pour l'icône
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
