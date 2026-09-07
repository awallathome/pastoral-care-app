import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme/theme";
import { RootStackParamList, MainTabParamList } from "./types";
import { TodayScreen } from "../screens/TodayScreen";
import { PeopleListScreen } from "../screens/PeopleListScreen";
import { PersonDetailScreen } from "../screens/PersonDetailScreen";
import { VisitDetailScreen } from "../screens/VisitDetailScreen";
import { AddVisitScreen } from "../screens/AddVisitScreen";
import { AddPersonScreen } from "../screens/AddPersonScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="People" component={PeopleListScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTintColor: colors.accent }}>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="PersonDetail" component={PersonDetailScreen} options={{ title: "" }} />
        <Stack.Screen name="VisitDetail" component={VisitDetailScreen} options={{ title: "Visit" }} />
        <Stack.Screen
          name="AddVisit"
          component={AddVisitScreen}
          options={{ title: "Schedule a visit", presentation: "modal" }}
        />
        <Stack.Screen
          name="AddPerson"
          component={AddPersonScreen}
          options={{ title: "New parishioner", presentation: "modal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
