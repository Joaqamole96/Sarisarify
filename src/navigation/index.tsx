import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screen imports — stubs to be built out in UI phase
import SaleScreen from '@/screens/Sale/SaleScreen';
import ConfirmSaleScreen from '@/screens/Sale/ConfirmSaleScreen';
import ProductCatalogScreen from '@/screens/Products/ProductCatalogScreen';
import ProductFormScreen from '@/screens/Products/ProductFormScreen';
import BorrowListScreen from '@/screens/Borrows/BorrowListScreen';
import BorrowerProfileScreen from '@/screens/Borrows/BorrowerProfileScreen';
import BorrowDetailScreen from '@/screens/Borrows/BorrowDetailScreen';
import StatisticsScreen from '@/screens/Statistics/StatisticsScreen';
import SalesLogScreen from '@/screens/Statistics/SalesLogScreen';
import AssistantScreen from '@/screens/Assistant/AssistantScreen';

// ─────────────────────────────────────────────────────────────
// Type declarations (for useNavigation / useRoute typing)
// ─────────────────────────────────────────────────────────────

export type SaleStackParams = {
  Sale: undefined;
  ConfirmSale: undefined;
};

export type ProductStackParams = {
  ProductCatalog: undefined;
  ProductForm: { productId?: string }; // undefined = Add, string = Edit
};

export type BorrowStackParams = {
  BorrowList: undefined;
  BorrowerProfile: { borrowerId: string };
  BorrowDetail: { borrowId: string };
};

export type StatisticsStackParams = {
  Statistics: undefined;
  SalesLog: undefined;
};

export type AssistantStackParams = {
  Assistant: undefined;
};

// ─────────────────────────────────────────────────────────────
// Stack Navigators
// ─────────────────────────────────────────────────────────────

const SaleStack = createNativeStackNavigator<SaleStackParams>();
function SaleNavigator() {
  return (
    <SaleStack.Navigator>
      <SaleStack.Screen name="Sale" component={SaleScreen} options={{ title: 'Sale' }} />
      <SaleStack.Screen name="ConfirmSale" component={ConfirmSaleScreen} options={{ title: 'Confirm Sale' }} />
    </SaleStack.Navigator>
  );
}

const ProductStack = createNativeStackNavigator<ProductStackParams>();
function ProductNavigator() {
  return (
    <ProductStack.Navigator>
      <ProductStack.Screen name="ProductCatalog" component={ProductCatalogScreen} options={{ title: 'Products' }} />
      <ProductStack.Screen name="ProductForm" component={ProductFormScreen} options={({ route }) => ({
        title: route.params?.productId ? 'Edit Product' : 'Add Product',
      })} />
    </ProductStack.Navigator>
  );
}

const BorrowStack = createNativeStackNavigator<BorrowStackParams>();
function BorrowNavigator() {
  return (
    <BorrowStack.Navigator>
      <BorrowStack.Screen name="BorrowList" component={BorrowListScreen} options={{ title: 'Borrows' }} />
      <BorrowStack.Screen name="BorrowerProfile" component={BorrowerProfileScreen} options={{ title: 'Borrower' }} />
      <BorrowStack.Screen name="BorrowDetail" component={BorrowDetailScreen} options={{ title: 'Borrow Detail' }} />
    </BorrowStack.Navigator>
  );
}

const StatisticsStack = createNativeStackNavigator<StatisticsStackParams>();
function StatisticsNavigator() {
  return (
    <StatisticsStack.Navigator>
      <StatisticsStack.Screen name="Statistics" component={StatisticsScreen} options={{ title: 'Statistics' }} />
      <StatisticsStack.Screen name="SalesLog" component={SalesLogScreen} options={{ title: 'Sales Log' }} />
    </StatisticsStack.Navigator>
  );
}

const AssistantStack = createNativeStackNavigator<AssistantStackParams>();
function AssistantNavigator() {
  return (
    <AssistantStack.Navigator>
      <AssistantStack.Screen name="Assistant" component={AssistantScreen} options={{ title: 'Assistant' }} />
    </AssistantStack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom Tab Navigator
// ─────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

export default function RootNavigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="SaleTab"
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen
          name="SaleTab"
          component={SaleNavigator}
          options={{
            tabBarLabel: 'Sale',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cart-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="ProductsTab"
          component={ProductNavigator}
          options={{
            tabBarLabel: 'Products',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="package-variant-closed" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="BorrowsTab"
          component={BorrowNavigator}
          options={{
            tabBarLabel: 'Borrows',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-cash-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="StatisticsTab"
          component={StatisticsNavigator}
          options={{
            tabBarLabel: 'Statistics',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-bar" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="AssistantTab"
          component={AssistantNavigator}
          options={{
            tabBarLabel: 'Assistant',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="robot-outline" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
