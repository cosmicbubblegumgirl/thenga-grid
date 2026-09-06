import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import BarChart3 from "lucide-react-native/icons/chart-no-axes-column-increasing";
import Box from "lucide-react-native/icons/box";
import Check from "lucide-react-native/icons/check";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleDollarSign from "lucide-react-native/icons/circle-dollar-sign";
import Clock3 from "lucide-react-native/icons/clock-3";
import Flame from "lucide-react-native/icons/flame";
import Grid3X3 from "lucide-react-native/icons/grid-3x3";
import Heart from "lucide-react-native/icons/heart";
import LocateFixed from "lucide-react-native/icons/locate-fixed";
import LogOut from "lucide-react-native/icons/log-out";
import MapPin from "lucide-react-native/icons/map-pin";
import Minus from "lucide-react-native/icons/minus";
import Navigation from "lucide-react-native/icons/navigation";
import PackageCheck from "lucide-react-native/icons/package-check";
import Plus from "lucide-react-native/icons/plus";
import Radio from "lucide-react-native/icons/radio";
import Search from "lucide-react-native/icons/search";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import ShoppingBasket from "lucide-react-native/icons/shopping-basket";
import Store from "lucide-react-native/icons/store";
import Target from "lucide-react-native/icons/target";
import UserRound from "lucide-react-native/icons/user-round";
import Users from "lucide-react-native/icons/users";
import Zap from "lucide-react-native/icons/zap";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import ShopMap from "./components/ShopMap";
import {
  runLocalInterledgerPayment,
  type InterledgerReceipt,
  type InterledgerStage,
} from "./lib/interledger";

type Role = "customer" | "owner";
type User = { id: string; email: string; displayName: string; role: Role };
type Stock = {
  id: string;
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  category: string;
};
type Drop = {
  id: string;
  productName: string;
  priceCents: number;
  originalPriceCents: number;
  quantity: number;
};
type Shop = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  pickupMinutes: number;
  distanceKm: number | null;
  inventory: Stock[];
  drops: Drop[];
  source?: string;
};
type OwnerData = {
  shop: { name: string; address: string; isOpen: boolean };
  inventory: Stock[];
  orders: Array<{
    id: string;
    status: OrderStatus;
    pickupCode: string;
    productName: string;
    customerName: string;
    priceCents?: number;
    createdAt?: number;
    payment?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    paidAmountValue?: string;
  }>;
  demand: Array<{ query: string; searches: number }>;
};
type Position = { latitude: number; longitude: number };
type CustomerTab = "grid" | "basket" | "drops" | "community";
type MerchantTab = "overview" | "orders" | "stock";
type OrderStatus =
  | "reserved"
  | "received"
  | "packing"
  | "sold_out"
  | "bag_tied"
  | "ready"
  | "collected"
  | "cancelled";
type MobileOrder = {
  id: string;
  shopName: string;
  productName: string;
  amountCents: number;
  pickupCode: string;
  status: OrderStatus;
  payment: "pickup" | "interledger_test" | "open_payments_test";
  latitude: number;
  longitude: number;
  receipt?: InterledgerReceipt;
};
type CheckoutDrop = { drop: Drop; shop: Shop };

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const DEFAULT_ROLE: Role = process.env.EXPO_PUBLIC_DEFAULT_ROLE === "owner" ? "owner" : "customer";
const DEFAULT_POSITION = { latitude: -30.8874, longitude: 30.35 };
const palette = {
  ink: "#111512",
  paper: "#f3f1e8",
  card: "#fffef8",
  lime: "#d9ff43",
  teal: "#009c83",
  orange: "#ff6734",
  blue: "#426cff",
  line: "#d9d7cd",
  grey: "#6d736e",
  muted: "#8b918c",
  soft: "#e9e7de",
  softTeal: "#e5f5f1",
  softOrange: "#fff0e7",
  coal: "#202621",
};
const TOKEN_KEY = "thenga-grid-session";
const DEMO_USER_KEY = "thenga-grid-local-user";
const LOCAL_DEMO = /localhost|127\.0\.0\.1/.test(API_URL);
const SPAZA_FUND_URL = "https://www.spazashopfund.co.za/";
const ORDER_STEPS: Array<{ id: OrderStatus; label: string }> = [
  { id: "received", label: "Received" },
  { id: "packing", label: "Packing" },
  { id: "bag_tied", label: "Bag tied" },
  { id: "ready", label: "Ready" },
];
const STATUS_LABELS: Record<OrderStatus, string> = {
  reserved: "Reserved",
  received: "Received",
  packing: "Packing",
  sold_out: "Sold out",
  bag_tied: "Bag tied",
  ready: "Ready",
  collected: "Collected",
  cancelled: "Cancelled",
};

async function getStoredValue(key: string) {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

const demoProducts = [
  ["Brown bread", 1699, "Bakery"],
  ["Full cream milk", 2359, "Dairy"],
  ["Large eggs", 2369, "Dairy"],
  ["Super maize meal", 4479, "Pantry"],
  ["Long-grain rice", 3719, "Pantry"],
  ["White sugar", 5429, "Pantry"],
  ["Chicken portions", 5899, "Butchery"],
  ["Potatoes 2kg", 2499, "Fresh"],
  ["Spinach bunch", 1299, "Fresh"],
  ["Tomato sauce", 1549, "Pantry"],
  ["Cooking oil 2L", 6799, "Pantry"],
  ["Apples 1kg", 2899, "Fresh"],
] as const;

const demoShopSeeds = [
  ["harbour-basket", "Harbour Basket", "Ramsgate Beach", 0.0017, 0.0014, 4.8, 5],
  ["bidstone-pantry", "Bidstone Pantry", "Bidstone Road area", -0.0011, -0.0015, 4.7, 6],
  ["lagoon-fresh", "Lagoon Fresh Stop", "Ramsgate South", -0.0037, 0.0023, 4.9, 4],
  ["marine-tuck", "Marine Tuck Shop", "Marine Drive", 0.0036, 0.0051, 4.5, 8],
  ["south-coast-save", "South Coast Save", "Ramsgate", 0.0031, -0.0041, 4.6, 7],
  ["bilanhlolo-market", "Bilanhlolo Market", "Lagoon area", -0.0061, 0.0064, 4.8, 9],
  ["coastal-corner", "Coastal Corner Store", "Ramsgate North", 0.0063, 0.0084, 4.4, 5],
  ["ocean-view", "Ocean View Grocer", "Ramsgate Beach", -0.0005, 0.0111, 4.7, 10],
  ["family-foods", "Ramsgate Family Foods", "Ramsgate West", -0.0043, -0.0091, 4.9, 6],
  ["green-valley", "Green Valley Spaza", "Ramsgate West", 0.0011, -0.0121, 4.6, 8],
] as const;

const DEMO_SHOPS: Shop[] = demoShopSeeds.map(
  ([id, name, area, latOffset, lngOffset, rating, pickupMinutes], shopIndex) => {
    const inventory = demoProducts.map(([productName, basePrice, category], productIndex) => ({
      id: `${id}-${productIndex}`,
      productId: `product-${productIndex}`,
      name: productName,
      priceCents: basePrice + shopIndex * 23 - (productIndex % 3) * 17,
      quantity: 3 + ((shopIndex * 7 + productIndex * 5) % 27),
      category,
    }));
    const deal = inventory[shopIndex % inventory.length];
    return {
      id,
      name,
      address: `${area}, Ramsgate`,
      latitude: DEFAULT_POSITION.latitude + latOffset,
      longitude: DEFAULT_POSITION.longitude + lngOffset,
      rating,
      pickupMinutes,
      distanceKm: Number((0.4 + shopIndex * 0.32).toFixed(1)),
      inventory,
      drops:
        shopIndex < 7
          ? [
              {
                id: `demo-drop-${id}`,
                productName: deal.name,
                priceCents: Math.round(deal.priceCents * 0.78),
                originalPriceCents: deal.priceCents,
                quantity: 5 + ((shopIndex * 3) % 14),
              },
            ]
          : [],
      source: "local-demo",
    };
  },
);

const DEMO_OWNER_DATA: OwnerData = {
  shop: { name: "Harbour Basket", address: "Ramsgate Beach demo", isOpen: true },
  inventory: DEMO_SHOPS[0].inventory,
  orders: [
    {
      id: "order-101",
      status: "ready",
      pickupCode: "1842",
      productName: "Brown bread Drop",
      customerName: "Nandi K.",
      priceCents: 1500,
      payment: "SIMULATED TEST PAYMENT",
    },
    {
      id: "order-102",
      status: "packing",
      pickupCode: "7391",
      productName: "Dinner for four",
      customerName: "Thabo M.",
    },
    {
      id: "order-103",
      status: "received",
      pickupCode: "5260",
      productName: "Maize meal group buy",
      customerName: "Zanele N.",
    },
  ],
  demand: [
    { query: "Size 5 nappies", searches: 42 },
    { query: "Paraffin", searches: 37 },
    { query: "Brown bread", searches: 31 },
    { query: "Electricity vouchers", searches: 28 },
  ],
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredValue(TOKEN_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "The Grid could not complete that request.");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [areaName, setAreaName] = useState("Ramsgate Beach demo Grid");

  useEffect(() => {
    void (async () => {
      const savedDemoUser = await getStoredValue(DEMO_USER_KEY);
      if (LOCAL_DEMO && savedDemoUser) {
        setUser(JSON.parse(savedDemoUser) as User);
      } else if (!LOCAL_DEMO) {
        try {
          const session = await api<{ user: User | null }>("/api/auth/session");
          setUser(session.user);
        } catch {
          if (savedDemoUser) setUser(JSON.parse(savedDemoUser) as User);
          await deleteStoredValue(TOKEN_KEY);
        }
      }
      setBooting(false);
    })();
  }, []);

  async function useDeviceLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location not enabled",
          "Ramsgate Beach demo mode remains active. You can enable location later in device settings.",
        );
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setPosition(next);
      const address = await Location.reverseGeocodeAsync(next);
      setAreaName(
        address[0]?.district || address[0]?.subregion || address[0]?.city || "Your current area",
      );
    } catch {
      Alert.alert(
        "Location unavailable",
        "The device could not read your current location. Demo mode remains active.",
      );
    }
  }

  if (booting)
    return (
      <SafeAreaView style={styles.boot}>
        <StatusBar style="light" />
        <Logo />
        <ActivityIndicator color={palette.lime} />
        <Text style={styles.bootText}>Connecting to your neighbourhood...</Text>
      </SafeAreaView>
    );
  if (!user) return <Auth onAuthenticated={setUser} position={position} />;
  return user.role === "owner" ? (
    <MerchantApp user={user} onSignOut={() => setUser(null)} />
  ) : (
    <CustomerApp
      user={user}
      position={position}
      areaName={areaName}
      onUseLocation={useDeviceLocation}
      onSignOut={() => setUser(null)}
    />
  );
}

function Auth({
  onAuthenticated,
  position,
}: {
  onAuthenticated: (user: User) => void;
  position: Position;
}) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [busy, setBusy] = useState(false);

  async function enterDemo(nextRole: Role) {
    const demoUser: User = {
      id: `demo-${nextRole}`,
      email: nextRole === "owner" ? "owner@thengagrid.co.za" : "customer@thengagrid.co.za",
      displayName: nextRole === "owner" ? "Lindiwe Dlamini" : "Nandi Khumalo",
      role: nextRole,
    };
    await setStoredValue(DEMO_USER_KEY, JSON.stringify(demoUser));
    onAuthenticated(demoUser);
  }

  async function submit() {
    if (!email.trim() || password.length < 6 || (mode === "signup" && !displayName.trim())) {
      Alert.alert(
        "Check your details",
        "Add your name and email, and use a password with at least 6 characters.",
      );
      return;
    }
    setBusy(true);
    try {
      if (!LOCAL_DEMO) {
        const data = await api<{ user: User; mobileToken: string }>(
          `/api/auth/${mode === "signup" ? "signup" : "login"}`,
          {
            method: "POST",
            body: JSON.stringify({
              displayName,
              email,
              password,
              role,
              shopName,
              address: "Current device location",
              ...position,
              client: "mobile",
            }),
          },
        );
        await setStoredValue(TOKEN_KEY, data.mobileToken);
        onAuthenticated(data.user);
        return;
      }

      const localUser: User = {
        id: `local-${Date.now()}`,
        email: email.trim().toLowerCase(),
        displayName:
          displayName.trim() ||
          email.split("@")[0] ||
          (role === "owner" ? "Shop owner" : "Neighbour"),
        role,
      };
      await setStoredValue(DEMO_USER_KEY, JSON.stringify(localUser));
      onAuthenticated(localUser);
    } catch (error) {
      Alert.alert(
        "Could not continue",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.authSafe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          <Logo />
          <View style={styles.authHero}>
            <Text style={styles.kicker}>YOUR NEIGHBOURHOOD. LIVE.</Text>
            <Text style={styles.authTitle}>
              {role === "owner"
                ? "Put your shop on the Grid."
                : "Shop local with better information."}
            </Text>
            <Text style={styles.authCopy}>
              {role === "owner"
                ? "Publish live stock, launch Drops and manage Grab & Go orders."
                : "Find nearby shops, compare whole baskets and reserve before you walk."}
            </Text>
          </View>
          <View style={styles.authCard}>
            <View style={styles.authCardIntro}>
              <Text style={styles.authCardTitle}>
                {mode === "signup" ? "Create your profile" : "Welcome back"}
              </Text>
              <Text style={styles.authCardCopy}>
                {mode === "signup"
                  ? "Choose the experience that fits how you use the neighbourhood Grid."
                  : "Sign in to continue where you left off."}
              </Text>
            </View>
            <View style={styles.modeTabs}>
              <Pressable
                style={[styles.modeTabsPressable, mode === "signup" && styles.modeActive]}
                onPress={() => setMode("signup")}
              >
                <Text style={[styles.modeTabsText, mode === "signup" && styles.modeTabsTextActive]}>
                  Create account
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeTabsPressable, mode === "login" && styles.modeActive]}
                onPress={() => setMode("login")}
              >
                <Text style={[styles.modeTabsText, mode === "login" && styles.modeTabsTextActive]}>
                  Sign in
                </Text>
              </Pressable>
            </View>
            {mode === "signup" && (
              <>
                <Text style={styles.fieldLabel}>I AM JOINING AS</Text>
                <View style={styles.roleRow}>
                  <RoleCard
                    active={role === "customer"}
                    icon={<UserRound size={19} color={palette.ink} />}
                    label="Customer"
                    description="Find, compare and collect"
                    onPress={() => setRole("customer")}
                  />
                  <RoleCard
                    active={role === "owner"}
                    icon={<Store size={19} color={palette.ink} />}
                    label="Shop owner"
                    description="Stock, orders and demand"
                    onPress={() => setRole("owner")}
                  />
                </View>
                <Field
                  label="Full name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </>
            )}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
            {mode === "signup" && role === "owner" && (
              <Field
                label="Shop name"
                value={shopName}
                onChangeText={setShopName}
                autoCapitalize="words"
              />
            )}
            <Pressable style={styles.primary} onPress={submit} disabled={busy}>
              <Text style={styles.primaryText}>
                {busy
                  ? "PLEASE WAIT…"
                  : mode === "signup"
                    ? `CREATE ${role === "owner" ? "SHOP OWNER" : "CUSTOMER"} ACCOUNT`
                    : "SIGN IN"}
              </Text>
              <ArrowRight size={18} color="#fff" />
            </Pressable>
            <View style={styles.secureLine}>
              <ShieldCheck size={14} color={palette.teal} />
              <Text style={styles.secureLineText}>Secure account and private session</Text>
            </View>
            {LOCAL_DEMO ? (
              <>
                <View style={styles.demoDivider}>
                  <View style={styles.demoDividerLine} />
                  <Text style={styles.demoDividerText}>EXPLORE THE DEMOS</Text>
                  <View style={styles.demoDividerLine} />
                </View>
                <View style={styles.demoEntryRow}>
                  <Pressable style={styles.demoEntry} onPress={() => void enterDemo("customer")}>
                    <UserRound size={16} color={palette.ink} />
                    <Text style={styles.demoEntryText}>CUSTOMER</Text>
                  </Pressable>
                  <Pressable style={styles.demoEntryDark} onPress={() => void enterDemo("owner")}>
                    <Store size={16} color={palette.lime} />
                    <Text style={styles.demoEntryDarkText}>SHOP OWNER</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleCard({
  active,
  icon,
  label,
  description,
  onPress,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.roleCard, active && styles.roleActive]} onPress={onPress}>
      <View style={[styles.roleIcon, active && styles.roleIconActive]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.roleTitle}>{label}</Text>
        <Text style={styles.roleDescription}>{description}</Text>
      </View>
      <View style={[styles.roleCheck, active && styles.roleCheckActive]}>
        {active && <Check size={12} color="#fff" />}
      </View>
    </Pressable>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput style={styles.input} placeholderTextColor="#969b96" {...inputProps} />
    </View>
  );
}

function PrototypeNotice() {
  return <View style={styles.prototypeNotice}><Text style={styles.prototypeNoticeTag}>DEMO DATA</Text><Text style={styles.prototypeNoticeText}>THENGA//GRID is a hackathon prototype. Shops, products, prices, locations, stock levels, reviews and orders shown in this demo may be fictional.</Text></View>;
}

function CustomerApp({
  user,
  position,
  areaName,
  onUseLocation,
  onSignOut,
}: {
  user: User;
  position: Position;
  areaName: string;
  onUseLocation: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<CustomerTab>("grid");
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("bread, milk, eggs and Coke");
  const [loading, setLoading] = useState(true);
  const [easy, setEasy] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutDrop | null>(null);
  const [activeOrder, setActiveOrder] = useState<MobileOrder | null>(null);

  useEffect(() => {
    if (LOCAL_DEMO) return;
    const handleReturn = (url: string | null) => {
      if (!url) return;
      const paymentId = new URL(url).searchParams.get("paymentId");
      const result = new URL(url).searchParams.get("payment");
      if (!paymentId) return;
      if (result === "ilp-failed") { Alert.alert("Test payment was not completed", "No real money was charged. You can try the sandbox journey again."); return; }
      void api<{ payment: { id: string; status: string; orderReference: string; pickupCode: string; productName: string; shopName: string; amountValue: string; latitude: number; longitude: number } }>(`/api/payments/interledger/status?paymentId=${encodeURIComponent(paymentId)}`).then(({ payment }) => {
        if (payment.status !== "settled") return;
        setActiveOrder({ id: payment.orderReference, shopName: payment.shopName, productName: payment.productName, amountCents: Number(payment.amountValue), pickupCode: payment.pickupCode, status: "reserved", payment: "open_payments_test", latitude: payment.latitude, longitude: payment.longitude });
        Alert.alert("Payment settled", "OPEN PAYMENTS · TEST\nSandbox transaction—no real funds transferred.");
      }).catch(() => Alert.alert("Payment status unavailable", "The sandbox payment result could not be read yet."));
    };
    void Linking.getInitialURL().then(handleReturn);
    const subscription = Linking.addEventListener("url", ({ url }) => handleReturn(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!activeOrder || ["ready", "sold_out", "collected", "cancelled"].includes(activeOrder.status))
      return;

    if (LOCAL_DEMO || activeOrder.id.startsWith("mobile-")) {
      const timer = setTimeout(() => {
        setActiveOrder((current) => {
          if (!current || current.id !== activeOrder.id) return current;
          const currentIndex = ORDER_STEPS.findIndex((item) => item.id === current.status);
          const next = ORDER_STEPS[Math.min(currentIndex + 1, ORDER_STEPS.length - 1)];
          return next ? { ...current, status: next.id } : current;
        });
      }, 6500);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      void api<{ reservations: Array<{ id: string; status: OrderStatus }> }>("/api/reservations")
        .then((result) => {
          const latest = result.reservations.find((item) => item.id === activeOrder.id);
          if (latest) setActiveOrder((current) => (current ? { ...current, status: latest.status } : current));
        })
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeOrder]);

  async function load() {
    setLoading(true);
    if (LOCAL_DEMO) {
      const localShops = DEMO_SHOPS.map((shop) => ({
        ...shop,
        latitude: position.latitude + (shop.latitude - DEFAULT_POSITION.latitude),
        longitude: position.longitude + (shop.longitude - DEFAULT_POSITION.longitude),
        address: areaName.includes("demo Grid")
          ? shop.address
          : `${areaName} · demonstration listing`,
      }));
      setShops(localShops);
      setSelectedId((current) => current ?? localShops[0].id);
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ shops: Shop[] }>(
        `/api/shops?lat=${position.latitude}&lng=${position.longitude}`,
      );
      setShops(data.shops);
      setSelectedId((current) => current ?? data.shops[0]?.id ?? null);
    } catch {
      setShops(DEMO_SHOPS);
      setSelectedId((current) => current ?? DEMO_SHOPS[0].id);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [position.latitude, position.longitude, areaName]);
  const selected = shops.find((shop) => shop.id === selectedId) ?? shops[0];
  const drops = shops.flatMap((shop) => shop.drops.map((drop) => ({ ...drop, shop })));
  const basket = useMemo(() => {
    const terms = query
      .toLowerCase()
      .split(/,|\band\b/)
      .map((value) => value.trim())
      .filter(Boolean);
    return shops
      .map((shop) => ({
        shop,
        items: terms
          .map((term) => shop.inventory.find((item) => item.name.toLowerCase().includes(term)))
          .filter(Boolean) as Stock[],
      }))
      .filter((result) => result.items.length)
      .sort(
        (a, b) =>
          b.items.length - a.items.length ||
          a.items.reduce((sum, item) => sum + item.priceCents, 0) -
            b.items.reduce((sum, item) => sum + item.priceCents, 0),
      );
  }, [query, shops]);

  async function reserve(dropId: string) {
    const match = shops
      .flatMap((shop) => shop.drops.map((drop) => ({ drop, shop })))
      .find((item) => item.drop.id === dropId);
    if (match) {
      setCheckout(match);
      return;
    }
    if (LOCAL_DEMO || dropId.startsWith("demo-drop-")) {
      Alert.alert(
        "Your crate is reserved",
        `Pickup code ${Math.floor(1000 + Math.random() * 9000)}`,
      );
      return;
    }
    try {
      const data = await api<{ reservation: { pickupCode: string } }>("/api/reservations", {
        method: "POST",
        body: JSON.stringify({ dropId }),
      });
      Alert.alert("Your crate is reserved", `Pickup code ${data.reservation.pickupCode}`);
      await load();
    } catch (error) {
      Alert.alert("Could not reserve", error instanceof Error ? error.message : "Try again.");
    }
  }
  async function completeOrder(order: MobileOrder, dropId: string) {
    if (!LOCAL_DEMO && !dropId.startsWith("demo-drop-")) {
      try {
        const data = await api<{
          reservation: { id: string; status: OrderStatus; pickupCode: string };
        }>("/api/reservations", {
          method: "POST",
          body: JSON.stringify({ dropId }),
        });
        setActiveOrder({
          ...order,
          id: data.reservation.id,
          pickupCode: data.reservation.pickupCode,
          status: data.reservation.status,
        });
      } catch (error) {
        Alert.alert(
          "Could not create the order",
          error instanceof Error ? error.message : "Please try again.",
        );
        return;
      }
    } else {
      setActiveOrder(order);
    }
    setCheckout(null);
  }
  async function startSecureTestPayment(wallet: string) {
    if (!checkout) return;
    try {
      const reservation = await api<{ reservation: { id: string } }>("/api/reservations", { method: "POST", body: JSON.stringify({ dropId: checkout.drop.id, paymentMethod: "open_payments_test" }) });
      const started = await api<{ redirect?: string; error?: string }>("/api/payments/interledger/start", { method: "POST", body: JSON.stringify({ reservationId: reservation.reservation.id, senderWalletAddress: wallet, returnUri: "thengagrid://payment" }) });
      if (!started.redirect) throw new Error(started.error || "The secure sandbox payment could not be started.");
      setCheckout(null);
      await Linking.openURL(started.redirect);
    } catch (error) {
      Alert.alert("Could not begin sandbox payment", error instanceof Error ? error.message : "Please try again.");
    }
  }
  async function logout() {
    if (!LOCAL_DEMO) await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    await Promise.all([
      deleteStoredValue(TOKEN_KEY),
      deleteStoredValue(DEMO_USER_KEY),
    ]);
    onSignOut();
  }

  return (
    <SafeAreaView style={[styles.appSafe, easy && styles.easy]}>
      <StatusBar style="dark" />
      <AppHeader
        title="THENGA//GRID"
        subtitle={areaName}
        easy={easy}
        setEasy={setEasy}
        modeLabel="CUSTOMER"
        onLogout={logout}
      />
      <PrototypeNotice />
      {activeOrder && <CustomerOrderBar order={activeOrder} />}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === "grid" && (
          <>
            <View style={styles.customerHero}>
              <View style={styles.flex}>
                <Text style={styles.heroEyebrow}>
                  HELLO, {user.displayName.split(" ")[0].toUpperCase()}
                </Text>
                <Text style={styles.customerHeroTitle}>What does home need today?</Text>
                <View style={styles.heroLocation}>
                  <MapPin size={13} color={palette.lime} />
                  <Text style={styles.heroLocationText}>{areaName}</Text>
                </View>
              </View>
              <View style={styles.heroSignal}>
                <View style={styles.heroSignalDot} />
                <Text style={styles.heroSignalValue}>{shops.length}</Text>
                <Text style={styles.heroSignalLabel}>SHOPS LIVE</Text>
              </View>
            </View>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>SEARCH YOUR NEIGHBOURHOOD</Text>
              <Text style={styles.sectionHint}>Try a whole basket</Text>
            </View>
            <View style={styles.search}>
              <Search size={18} color={palette.grey} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={() => setTab("basket")}
              />
              <Pressable style={styles.searchAction} onPress={() => setTab("basket")}>
                <ArrowRight size={17} color="#fff" />
              </Pressable>
            </View>
            <Pressable style={styles.locationRow} onPress={() => void onUseLocation()}>
              <View style={styles.locationIcon}>
                <LocateFixed size={17} color={palette.teal} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.locationRowTitle}>Use my current location</Text>
                <Text style={styles.locationRowText}>
                Refresh the map, distance and directions near you
                </Text>
              </View>
              <ChevronRight size={17} color={palette.ink} />
            </Pressable>
            <ShopMap
              position={position}
              shops={shops}
              selectedId={selectedId}
              loading={loading}
              onSelect={setSelectedId}
            />
            {selected && <ShopCard shop={selected} onReserve={reserve} />}
          </>
        )}
        {tab === "basket" && (
          <>
            <ScreenHead kicker="BASKET BATTLE" title="Your whole run, compared." />
            <View style={styles.search}>
              <Search size={18} color={palette.grey} />
              <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} />
            </View>
            {basket.map((result, index) => (
              <View
                style={[styles.routeCard, index === 0 && styles.routeBest]}
                key={result.shop.id}
              >
                <View style={styles.routeIcon}>
                  {index === 0 ? (
                    <CircleDollarSign size={20} color={palette.teal} />
                  ) : (
                    <Zap size={20} color={palette.orange} />
                  )}
                </View>
                <View style={styles.flex}>
                  <Text style={styles.kicker}>{index === 0 ? "DEMO BASKET RUN" : "DEMO QUICK RUN"}</Text>
                  <Text style={styles.cardTitle}>{result.shop.name}</Text>
                  <Text style={styles.meta}>
                    {result.items.length} items found · {result.shop.pickupMinutes} min
                  </Text>
                </View>
                <Text style={styles.price}>
                  R{(result.items.reduce((sum, item) => sum + item.priceCents, 0) / 100).toFixed(2)}
                </Text>
              </View>
            ))}
          </>
        )}
        {tab === "drops" && (
          <>
            <ScreenHead kicker="DROPS · DEMO DATA" title="Fresh demo deals." />
            {drops.map((drop) => (
              <View style={styles.dropCard} key={drop.id}>
                <View style={styles.dropVisual}>
                  <Flame size={32} color="#fff" />
                  <Text>{drop.shop.name.toUpperCase()} · DEMO DROP</Text>
                </View>
                <View style={styles.dropBody}>
                  <Text style={styles.cardTitle}>{drop.productName}</Text>
                  <Text style={styles.oldPrice}>R{(drop.originalPriceCents / 100).toFixed(2)}</Text>
                  <Text style={styles.dropPrice}>R{(drop.priceCents / 100).toFixed(2)}</Text>
                  <Text style={styles.meta}>{drop.quantity} demo units</Text>
                  <Pressable style={styles.primary} onPress={() => void reserve(drop.id)}>
                    <Text style={styles.primaryText}>RESERVE</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
        {tab === "community" && (
          <>
            <ScreenHead kicker="COMMUNITY" title="Useful things, close by." />
            <View style={styles.needCard}>
              <Radio size={22} color={palette.ink} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Can’t find something?</Text>
                <Text style={styles.meta}>Ask nearby shops to respond on Need Radar.</Text>
              </View>
              <ArrowRight size={18} />
            </View>
            <Pressable
              style={styles.supportCard}
              onPress={() => void Linking.openURL(SPAZA_FUND_URL)}
            >
              <Store size={24} color={palette.teal} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Support the Spaza Shop Fund</Text>
                <Text style={styles.meta}>
                  Open the official fund site to apply or check approved ways to contribute.
                </Text>
                <Text style={styles.tag}>spazashopfund.co.za · 011 305 8080</Text>
              </View>
              <ArrowRight size={18} color={palette.ink} />
            </Pressable>
            <View style={styles.post}>
              <View style={styles.avatar}>
                <Text>NK</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Nandi K.</Text>
                <Text style={styles.postText}>Harbour Basket has electricity vouchers again.</Text>
                <Text style={styles.tag}>Tagged · Harbour Basket</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      {checkout && (
        <MobileCheckout
          checkout={checkout}
          customerName={user.displayName}
          easy={easy}
          onSecureTestPayment={startSecureTestPayment}
          onClose={() => setCheckout(null)}
          onOrder={(order) => void completeOrder(order, checkout.drop.id)}
        />
      )}
      <BottomNav tab={tab} setTab={setTab} />
    </SafeAreaView>
  );
}

function CustomerOrderBar({ order }: { order: MobileOrder }) {
  const progressIndex = ORDER_STEPS.findIndex((item) => item.id === order.status);
  const openRoute = (travelmode: "walking" | "driving") => {
    const destination = `${order.latitude},${order.longitude}`;
    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelmode}`,
    );
  };

  return (
    <View style={styles.orderTracker}>
      <View style={styles.orderTrackerTop}>
        <View style={styles.orderTrackerIcon}>
          <PackageCheck size={18} color={palette.ink} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.orderTrackerLabel}>
            {order.status === "sold_out" ? "ACTION NEEDED · DEMO" : "DEMO PACKING STATUS"}
          </Text>
          <Text style={styles.orderTrackerTitle}>{STATUS_LABELS[order.status]}</Text>
          <Text style={styles.orderTrackerMeta} numberOfLines={1}>
            {order.shopName} · {order.productName}
          </Text>
        </View>
        <View style={styles.pickupCodePill}>
          <Text style={styles.pickupCodeLabel}>PICKUP</Text>
          <Text style={styles.pickupCodeValue}>#{order.pickupCode}</Text>
        </View>
      </View>
      {order.payment !== "pickup" ? (
        <View style={styles.mobileReceiptRow}>
          <View><Text style={styles.mobileReceiptLabel}>{order.payment === "open_payments_test" ? "OPEN PAYMENTS · TEST" : "SIMULATED TEST PAYMENT"}</Text><Text style={styles.mobileReceiptValue}>{order.payment === "open_payments_test" ? "Sandbox transaction—no real funds transferred." : "Demo payment completed—no real funds were transferred."}</Text></View>
          <View><Text style={styles.mobileReceiptLabel}>{order.payment === "open_payments_test" ? "PAYMENT SETTLED" : "DEMO ORDER"}</Text><Text style={styles.mobileReceiptValue}>{order.id}</Text></View>
          <View><Text style={styles.mobileReceiptLabel}>{order.payment === "open_payments_test" ? "AMOUNT PAID" : "DEMO AMOUNT"}</Text><Text style={styles.mobileReceiptValue}>R{(order.amountCents / 100).toFixed(2)}</Text></View>
        </View>
      ) : null}
      {order.status === "sold_out" ? (
        <View style={styles.soldOutNotice}>
          <Text style={styles.soldOutTitle}>The shop marked this item sold out.</Text>
          <Text style={styles.soldOutCopy}>Contact the shop to choose a substitute or release the order.</Text>
        </View>
      ) : (
        <View style={styles.orderSteps}>
          {ORDER_STEPS.map((item, index) => (
            <View style={styles.orderStep} key={item.id}>
              <View
                style={[
                  styles.orderStepDot,
                  index <= progressIndex && styles.orderStepDotActive,
                ]}
              >
                {index < progressIndex ? (
                  <Check size={10} color="#fff" />
                ) : (
                  <Text style={styles.orderStepNumber}>{index + 1}</Text>
                )}
              </View>
              <Text style={[styles.orderStepText, index <= progressIndex && styles.orderStepTextActive]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.routeButtons}>
        <Pressable style={styles.routeButton} onPress={() => openRoute("walking")}>
          <Navigation size={13} color={palette.ink} />
          <Text style={styles.routeButtonText}>START WALK</Text>
        </Pressable>
        <Pressable style={styles.routeButtonDark} onPress={() => openRoute("driving")}>
          <Navigation size={13} color={palette.lime} />
          <Text style={styles.routeButtonDarkText}>START DRIVE</Text>
        </Pressable>
        <View style={styles.liveBadge}>
          <Radio size={10} color={palette.teal} />
          <Text style={styles.liveBadgeText}>
            {order.payment === "open_payments_test" ? "OPEN PAYMENTS · TEST" : order.payment === "interledger_test" ? "SIMULATED TEST PAYMENT" : "PAY AT COLLECTION · DEMO ORDER"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MobileCheckout({
  checkout,
  customerName,
  easy,
  onSecureTestPayment,
  onClose,
  onOrder,
}: {
  checkout: CheckoutDrop;
  customerName: string;
  easy: boolean;
  onSecureTestPayment: (wallet: string) => Promise<void>;
  onClose: () => void;
  onOrder: (order: MobileOrder) => void;
}) {
  const [method, setMethod] = useState<"interledger" | "pickup">("interledger");
  const [wallet, setWallet] = useState("https://wallet.interledger-test.dev/customer-demo");
  const [stage, setStage] = useState<InterledgerStage | null>(null);
  const [busy, setBusy] = useState(false);
  const [easyConfirmed, setEasyConfirmed] = useState(false);
  const [error, setError] = useState("");
  const stages: Array<{ id: InterledgerStage; label: string }> = [
    { id: "wallet", label: "Wallet" },
    { id: "incoming", label: "Incoming" },
    { id: "quote", label: "Quote" },
    { id: "consent", label: "Consent" },
    { id: "outgoing", label: "Settled" },
  ];
  const stageIndex = stage ? stages.findIndex((item) => item.id === stage) : -1;
  const createOrder = (
    payment: MobileOrder["payment"],
    receipt?: InterledgerReceipt,
  ): MobileOrder => ({
    id: `mobile-${Date.now()}`,
    shopName: checkout.shop.name,
    productName: checkout.drop.productName,
    amountCents: checkout.drop.priceCents,
    pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
    status: "received",
    payment,
    latitude: checkout.shop.latitude,
    longitude: checkout.shop.longitude,
    receipt,
  });

  const payWithInterledger = async () => {
    if (easy && !easyConfirmed) { setEasyConfirmed(true); return; }
    if (!LOCAL_DEMO && !checkout.drop.id.startsWith("demo-drop-")) {
      await onSecureTestPayment(wallet);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const receipt = await runLocalInterledgerPayment(
        {
          amountCents: checkout.drop.priceCents,
          reference: checkout.drop.id,
          senderWalletAddress: wallet,
        },
        setStage,
      );
      onOrder(createOrder("interledger_test", receipt));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Interledger test payment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView
          style={styles.checkoutSheet}
          contentContainerStyle={styles.checkoutCard}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.checkoutHead}>
            <View>
              <Text style={styles.kicker}>SECURE DEMO CHECKOUT</Text>
              <Text style={styles.checkoutTitle}>Choose how to pay</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text>X</Text>
            </Pressable>
          </View>
          <View style={styles.demoNotice}>
            <ShieldCheck size={17} color={palette.teal} />
            <Text style={styles.demoNoticeText}>
              Test payment only · Sandbox funds · No real money will be charged.
            </Text>
          </View>
          <View style={styles.checkoutItem}>
            <View>
              <Text style={[styles.cardTitle, { color: "#fff" }]}>
                {checkout.drop.productName}
              </Text>
              <Text style={styles.meta}>
                {checkout.shop.name} - {customerName}
              </Text>
            </View>
            <Text style={styles.checkoutPrice}>
              R{(checkout.drop.priceCents / 100).toFixed(2)}
            </Text>
          </View>
          <View style={styles.checkoutTabs}>
            <Pressable
              style={[styles.checkoutTab, method === "interledger" && styles.checkoutTabActive]}
              onPress={() => setMethod("interledger")}
            >
              <Radio size={18} color={palette.teal} />
              <Text style={styles.cardTitle}>Pay with Open Payments – Test</Text>
              <Text style={styles.meta}>Approve with a test wallet</Text>
            </Pressable>
            <Pressable
              style={[styles.checkoutTab, method === "pickup" && styles.checkoutTabActive]}
              onPress={() => setMethod("pickup")}
            >
              <Store size={18} color={palette.teal} />
              <Text style={styles.cardTitle}>Pay at collection</Text>
              <Text style={styles.meta}>Reserve now, pay in shop</Text>
            </Pressable>
          </View>
          {method === "interledger" ? (
            <>
              <Text style={styles.checkoutHelp}>
                SIMULATED TEST PAYMENT. This local demo shows the payment journey using sandbox-style data. No real funds can move from this app.
              </Text>
              <Field
                label="Test wallet address"
                value={wallet}
                onChangeText={setWallet}
                autoCapitalize="none"
              />
              <View style={styles.ilpMobileStages}>
                {stages.map((item, index) => (
                  <View key={item.id} style={styles.ilpMobileStage}>
                    <View style={[styles.stageDot, index <= stageIndex && styles.stageDotActive]}>
                      {index < stageIndex ? (
                        <Check size={10} color="#fff" />
                      ) : (
                        <Text style={styles.stageNumber}>{index + 1}</Text>
                      )}
                    </View>
                    <Text style={styles.stageLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {easy && !easyConfirmed ? <View style={styles.easyPaymentConfirm}><Text style={styles.easyPaymentConfirmText}>You are about to test the payment journey using sandbox funds. No real money will leave your account.</Text></View> : null}
              {error ? <Text style={styles.checkoutError}>{error}</Text> : null}
              <Pressable
                style={styles.primary}
                disabled={busy}
                onPress={() => void payWithInterledger()}
              >
                <Text style={styles.primaryText}>
                  {busy
                    ? "PROCESSING ILP TEST..."
                    : easy && !easyConfirmed ? "CONFIRM SANDBOX TEST" : `COMPLETE DEMO PAYMENT · R${(checkout.drop.priceCents / 100).toFixed(2)}`}
                </Text>
                <ArrowRight size={17} color="#fff" />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.checkoutHelp}>
                PAY AT COLLECTION · DEMO ORDER. The pickup code is stored on this device; no payment is taken here.
              </Text>
              <Pressable style={styles.primary} onPress={() => onOrder(createOrder("pickup"))}>
                <Text style={styles.primaryText}>RESERVE FOR PICKUP</Text>
                <ArrowRight size={17} color="#fff" />
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ShopCard({ shop, onReserve }: { shop: Shop; onReserve: (id: string) => void }) {
  return (
    <View style={styles.shopCard}>
      <View style={styles.signalTop}>
        <View style={styles.signalLabel}>
          <View style={styles.liveDot} />
          <Text style={styles.signalLabelText}>SHOP SIGNAL · DEMO DATA</Text>
        </View>
        <Text style={styles.strong}>STRONG</Text>
      </View>
      <View style={styles.shopTop}>
        <View style={styles.shopLogo}>
          <Text style={styles.shopLogoText}>{shop.name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.meta}>
            <MapPin size={10} /> {shop.distanceKm ? `${shop.distanceKm} km · ` : ""}
            {shop.address}
          </Text>
        </View>
        <Pressable style={styles.favouriteButton}>
          <Heart size={19} color={palette.orange} />
        </Pressable>
      </View>
      <View style={styles.crates}>
        <Text style={styles.cratesText}>★★★★★</Text>
        <Text style={styles.cratesScore}>{shop.rating.toFixed(1)} CRATES · DEMO DATA</Text>
        <View style={styles.pickupChip}>
          <Clock3 size={11} color={palette.ink} />
          <Text style={styles.pickupChipText}>{shop.pickupMinutes} MIN PICKUP</Text>
        </View>
        <ShieldCheck size={13} color={palette.teal} />
      </View>
      <View style={styles.stockList}>
        {shop.inventory.slice(0, 4).map((item) => (
          <View style={styles.stockListRow} key={item.id}>
            <Text style={styles.stockName}>{item.name}</Text>
            <View
              style={[styles.stockDot, item.quantity < 5 && { backgroundColor: palette.orange }]}
            />
            <Text style={styles.stockQty}>{item.quantity} left</Text>
            <Text style={styles.stockPrice}>R{(item.priceCents / 100).toFixed(2)}</Text>
          </View>
        ))}
      </View>
      {shop.drops[0] && (
        <View style={styles.inlineDrop}>
          <Text style={styles.kicker}>DEMO DROP · {shop.drops[0].quantity} DEMO UNITS</Text>
          <Text style={styles.cardTitle}>{shop.drops[0].productName}</Text>
          <View style={styles.inlineDropBottom}>
            <View>
              <Text style={styles.inlineOldPrice}>
                R{(shop.drops[0].originalPriceCents / 100).toFixed(2)}
              </Text>
              <Text style={styles.dropPrice}>R{(shop.drops[0].priceCents / 100).toFixed(2)}</Text>
            </View>
            <Pressable style={styles.orangeButton} onPress={() => onReserve(shop.drops[0].id)}>
              <Text style={styles.orangeButtonText}>RESERVE 15 MIN</Text>
              <ArrowRight size={15} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function MerchantApp({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [data, setData] = useState<OwnerData | null>(null);
  const [tab, setTab] = useState<MerchantTab>("overview");
  const [savingId, setSavingId] = useState<string | null>(null);
  async function load() {
    if (LOCAL_DEMO) {
      setData(DEMO_OWNER_DATA);
      return;
    }
    try {
      setData(await api<OwnerData>("/api/owner/shop"));
    } catch {
      setData(DEMO_OWNER_DATA);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function logout() {
    if (!LOCAL_DEMO) await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    await Promise.all([
      deleteStoredValue(TOKEN_KEY),
      deleteStoredValue(DEMO_USER_KEY),
    ]);
    onSignOut();
  }
  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    if (!data) return;
    const previous = data;
    setSavingId(orderId);
    setData({
      ...data,
      orders: data.orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    });
    if (!LOCAL_DEMO) {
      try {
        await api("/api/owner/orders", {
          method: "PATCH",
          body: JSON.stringify({ reservationId: orderId, status }),
        });
      } catch (error) {
        setData(previous);
        Alert.alert(
          "Order was not updated",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    }
    setSavingId(null);
  }
  async function adjustInventory(inventoryId: string, direction: -1 | 1) {
    if (!data) return;
    const item = data.inventory.find((entry) => entry.id === inventoryId);
    if (!item) return;
    const quantity = Math.max(0, item.quantity + direction);
    const previous = data;
    setSavingId(inventoryId);
    setData({
      ...data,
      inventory: data.inventory.map((entry) =>
        entry.id === inventoryId ? { ...entry, quantity } : entry,
      ),
    });
    if (!LOCAL_DEMO) {
      try {
        await api("/api/owner/inventory", {
          method: "PATCH",
          body: JSON.stringify({
            inventoryId,
            quantity,
            price: item.priceCents / 100,
          }),
        });
      } catch (error) {
        setData(previous);
        Alert.alert(
          "Stock was not updated",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    }
    setSavingId(null);
  }
  async function toggleShop() {
    if (!data) return;
    const previous = data;
    const nextOpen = !data.shop.isOpen;
    setData({ ...data, shop: { ...data.shop, isOpen: nextOpen } });
    if (!LOCAL_DEMO) {
      try {
        await api("/api/owner/shop", {
          method: "PATCH",
          body: JSON.stringify({ isOpen: nextOpen }),
        });
      } catch (error) {
        setData(previous);
        Alert.alert(
          "Shop status was not updated",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    }
  }
  if (!data)
    return (
      <SafeAreaView style={styles.boot}>
        <ActivityIndicator color={palette.lime} />
        <Text style={styles.bootText}>Loading Shop Pulse...</Text>
      </SafeAreaView>
    );
  const low = data.inventory.filter((item) => item.quantity < 6).length;
  return (
    <SafeAreaView style={styles.appSafe}>
      <StatusBar style="dark" />
      <AppHeader
        title="THENGA//GRID"
        subtitle="MERCHANT GRID"
        easy={false}
        setEasy={() => undefined}
        modeLabel="SHOP OWNER"
        onLogout={logout}
      />
      <PrototypeNotice />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === "overview" && (
          <>
            <View style={styles.merchantHero}>
              <View style={styles.merchantHeroTop}>
                <View style={styles.merchantSignal}>
                  <View style={styles.merchantSignalDot} />
                  <Text style={styles.merchantKicker}>SHOP SIGNAL · STRONG</Text>
                </View>
                <Pressable
                  style={[styles.shopStatusButton, !data.shop.isOpen && styles.shopStatusButtonClosed]}
                  onPress={() => void toggleShop()}
                >
                  <Text style={styles.shopStatusButtonText}>
                    {data.shop.isOpen ? "OPEN NOW" : "CLOSED"}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.merchantTitle}>Morning, {user.displayName.split(" ")[0]}.</Text>
              <Text style={styles.merchantHeroCopy}>{data.shop.name} is visible to nearby customers.</Text>
              <View style={styles.merchantHeroFooter}>
                <Text style={styles.merchantHeroAddress}>{data.shop.address}</Text>
                <Text style={styles.merchantHeroAction}>TAP STATUS TO CHANGE</Text>
              </View>
            </View>
            <View style={styles.metrics}>
              <Metric
                icon={<Box size={19} color={palette.teal} />}
                label="LIVE PRODUCTS"
                value={String(data.inventory.length)}
              />
              <Metric
                icon={<PackageCheck size={19} color={palette.orange} />}
                label="OPEN ORDERS"
                value={String(
                  data.orders.filter((order) => !["collected", "cancelled"].includes(order.status))
                    .length,
                )}
              />
              <Metric
                icon={<Search size={19} color={palette.blue} />}
                label="NEED RADAR"
                value={String(data.demand.reduce((sum, item) => sum + Number(item.searches), 0))}
              />
              <Metric
                icon={<Zap size={19} color={palette.orange} />}
                label="LOW STOCK"
                value={String(low)}
              />
            </View>
            <ScreenHead kicker="TODAY'S PRIORITIES" title="What needs attention" />
            {data.inventory
              .filter((item) => item.quantity < 6)
              .slice(0, 3)
              .map((item) => (
                <Pressable style={styles.whisper} key={item.id} onPress={() => setTab("stock")}>
                  <View style={styles.whisperIcon}>
                    <Zap size={17} color={palette.orange} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{item.name} is running low</Text>
                    <Text style={styles.meta}>{item.quantity} left · update stock before the rush</Text>
                  </View>
                  <ChevronRight size={17} color={palette.ink} />
                </Pressable>
              ))}
            <View style={styles.demandCard}>
              <View style={styles.demandCardHead}>
                <View>
                  <Text style={styles.kicker}>NEED RADAR</Text>
                  <Text style={styles.demandTitle}>Customers are searching for</Text>
                </View>
                <Target size={24} color={palette.blue} />
              </View>
              {data.demand.slice(0, 4).map((item, index) => (
                <View style={styles.demandRow} key={item.query}>
                  <Text style={styles.demandRank}>0{index + 1}</Text>
                  <Text style={styles.demandQuery}>{item.query}</Text>
                  <View style={styles.demandBarTrack}>
                    <View style={[styles.demandBar, { width: `${Math.min(100, item.searches * 2)}%` }]} />
                  </View>
                  <Text style={styles.demandValue}>{item.searches}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {tab === "orders" && (
          <>
            <ScreenHead kicker="PACKING DESK · DEMO DATA" title="Demo orders" />
            <Text style={styles.screenIntro}>
              Demo order statuses can be updated here; no real fulfilment is taking place.
            </Text>
            {data.orders.map((order) => (
              <OrderPackingCard
                key={order.id}
                order={order}
                saving={savingId === order.id}
                onStatus={(status) => void updateOrderStatus(order.id, status)}
              />
            ))}
          </>
        )}
        {tab === "stock" && (
          <>
            <ScreenHead kicker="STOCK · DEMO DATA" title="Inventory control" />
            <View style={styles.stockSummary}>
              <Text style={styles.stockSummaryValue}>{data.inventory.length}</Text>
              <Text style={styles.stockSummaryLabel}>DEMO PRODUCTS</Text>
              <View style={styles.stockSummaryDivider} />
              <Text style={[styles.stockSummaryValue, low > 0 && { color: palette.orange }]}>{low}</Text>
              <Text style={styles.stockSummaryLabel}>LOW STOCK</Text>
            </View>
            {data.inventory.map((item) => (
              <InventoryControlCard
                key={item.id}
                item={item}
                saving={savingId === item.id}
                onAdjust={(direction) => void adjustInventory(item.id, direction)}
              />
            ))}
          </>
        )}
      </ScrollView>
      <MerchantNav tab={tab} setTab={setTab} />
    </SafeAreaView>
  );
}

function OrderPackingCard({
  order,
  saving,
  onStatus,
}: {
  order: OwnerData["orders"][number];
  saving: boolean;
  onStatus: (status: OrderStatus) => void;
}) {
  const controls: Array<{ id: OrderStatus; label: string }> = [
    { id: "received", label: "Received" },
    { id: "packing", label: "Packing" },
    { id: "sold_out", label: "Sold out" },
    { id: "bag_tied", label: "Bag tied" },
    { id: "ready", label: "Ready" },
    { id: "collected", label: "Collected" },
  ];
  const initials = order.customerName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.packingCard, order.status === "sold_out" && styles.packingCardAlert]}>
      <View style={styles.packingCardHead}>
        <View style={styles.customerAvatar}>
          <Text style={styles.customerAvatarText}>{initials}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.packingCustomer}>{order.customerName}</Text>
          <Text style={styles.packingProduct}>{order.productName}</Text>
        </View>
        <View style={styles.orderCodeBlock}>
          <Text style={styles.orderCodeLabel}>PICKUP</Text>
          <Text style={styles.orderCode}>#{order.pickupCode}</Text>
        </View>
      </View>
      <View style={styles.packingStatusRow}>
        <View
          style={[
            styles.packingStatusPill,
            order.status === "sold_out" && styles.packingStatusPillAlert,
            order.status === "ready" && styles.packingStatusPillReady,
          ]}
        >
          <View style={styles.packingStatusDot} />
          <Text style={styles.packingStatusText}>{STATUS_LABELS[order.status].toUpperCase()}</Text>
        </View>
        {order.payment ? <Text style={styles.paymentTag}>{order.payment === "PAID · OPEN PAYMENTS" ? "SIMULATED TEST PAYMENT · Demo payment completed—no real funds were transferred." : order.payment}{order.priceCents ? ` · R${(order.priceCents / 100).toFixed(2)} DEMO AMOUNT` : ""}</Text> : null}
        {saving ? <ActivityIndicator size="small" color={palette.teal} /> : null}
      </View>
      <Text style={styles.controlLabel}>MOVE ORDER TO</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.packingControls}
      >
        {controls.map((control) => (
          <Pressable
            key={control.id}
            disabled={saving}
            onPress={() => onStatus(control.id)}
            style={[
              styles.packingControl,
              order.status === control.id && styles.packingControlActive,
              control.id === "sold_out" && styles.packingControlDanger,
            ]}
          >
            {order.status === control.id ? <Check size={12} color="#fff" /> : null}
            <Text
              style={[
                styles.packingControlText,
                order.status === control.id && styles.packingControlTextActive,
              ]}
            >
              {control.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function InventoryControlCard({
  item,
  saving,
  onAdjust,
}: {
  item: Stock;
  saving: boolean;
  onAdjust: (direction: -1 | 1) => void;
}) {
  const low = item.quantity < 6;
  return (
    <View style={[styles.inventoryControl, low && styles.inventoryControlLow]}>
      <View style={styles.inventoryControlTop}>
        <View style={[styles.inventoryGlyph, low && styles.inventoryGlyphLow]}>
          <Box size={18} color={low ? palette.orange : palette.teal} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.inventoryName}>{item.name}</Text>
          <Text style={styles.inventoryCategory}>{item.category.toUpperCase()}</Text>
        </View>
        <Text style={styles.inventoryPrice}>R{(item.priceCents / 100).toFixed(2)}</Text>
      </View>
      <View style={styles.inventoryControlBottom}>
        <View style={[styles.stockState, low && styles.stockStateLow]}>
          <View style={[styles.stockStateDot, low && styles.stockStateDotLow]} />
          <Text style={styles.stockStateText}>{low ? "RESTOCK SOON" : "HEALTHY STOCK"}</Text>
        </View>
        <View style={styles.quantityControl}>
          <Pressable
            style={styles.quantityButton}
            disabled={saving || item.quantity === 0}
            onPress={() => onAdjust(-1)}
          >
            <Minus size={16} color={palette.ink} />
          </Pressable>
          <View style={styles.quantityValueWrap}>
            {saving ? (
              <ActivityIndicator size="small" color={palette.teal} />
            ) : (
              <Text style={styles.quantityValue}>{item.quantity}</Text>
            )}
            <Text style={styles.quantityUnit}>IN STOCK</Text>
          </View>
          <Pressable style={styles.quantityButtonDark} disabled={saving} onPress={() => onAdjust(1)}>
            <Plus size={16} color={palette.lime} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MerchantNav({ tab, setTab }: { tab: MerchantTab; setTab: (tab: MerchantTab) => void }) {
  const items = [
    { id: "overview" as const, label: "Pulse", Icon: BarChart3 },
    { id: "orders" as const, label: "Orders", Icon: PackageCheck },
    { id: "stock" as const, label: "Stock", Icon: Box },
  ];
  return (
    <View style={styles.merchantNav}>
      {items.map((item) => {
        const active = tab === item.id;
        return (
          <Pressable
            key={item.id}
            style={[styles.merchantNavItem, active && styles.merchantNavItemActive]}
            onPress={() => setTab(item.id)}
          >
            <item.Icon size={19} color={active ? palette.ink : "#8c938d"} />
            <Text style={[styles.merchantNavText, active && styles.merchantNavTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AppHeader({
  title,
  subtitle,
  easy,
  setEasy,
  modeLabel,
  onLogout,
}: {
  title: string;
  subtitle: string;
  easy: boolean;
  setEasy: (value: boolean) => void;
  modeLabel: "CUSTOMER" | "SHOP OWNER";
  onLogout: () => void;
}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.wordmark}>{title}</Text>
        <Text style={styles.tagline}>{subtitle.toUpperCase()}</Text>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{modeLabel}</Text>
        </View>
        {modeLabel === "CUSTOMER" ? (
          <View style={styles.easyControl}>
            <Text style={styles.easyControlText}>EASY</Text>
            <Switch
              value={easy}
              onValueChange={setEasy}
              trackColor={{ false: palette.soft, true: palette.ink }}
              thumbColor={easy ? palette.lime : "#fff"}
            />
          </View>
        ) : null}
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          style={styles.logoutButton}
          onPress={() => void onLogout()}
        >
          <LogOut size={19} color={palette.ink} />
        </Pressable>
      </View>
    </View>
  );
}
function ScreenHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={styles.screenHead}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.screenTitle}>{title}</Text>
    </View>
  );
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      {icon}
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}
function Logo() {
  return (
    <View style={styles.logo}>
      <Text style={styles.logoSlashes}>//</Text>
      <Text style={styles.logoText}>TG</Text>
    </View>
  );
}

function BottomNav({ tab, setTab }: { tab: CustomerTab; setTab: (tab: CustomerTab) => void }) {
  const items = [
    { id: "grid" as const, label: "Grid", Icon: Grid3X3 },
    { id: "basket" as const, label: "Basket", Icon: ShoppingBasket },
    { id: "drops" as const, label: "Drops", Icon: Flame },
    { id: "community" as const, label: "Community", Icon: Users },
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const active = tab === item.id;
        return (
          <Pressable
            key={item.id}
            style={[styles.navItem, active && styles.navItemActive]}
            onPress={() => setTab(item.id)}
          >
            <item.Icon size={20} color={active ? palette.ink : "#8c938d"} />
            <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: palette.ink,
  },
  bootText: { color: "#d8ded9", fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  authSafe: { flex: 1, backgroundColor: palette.ink },
  authScroll: { minHeight: "100%", paddingHorizontal: 20, paddingTop: 32, paddingBottom: 36 },
  logo: {
    width: 72,
    height: 72,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3b443d",
    borderRadius: 23,
    backgroundColor: palette.coal,
  },
  logoText: { color: palette.lime, fontSize: 25, fontWeight: "900" },
  logoSlashes: {
    position: "absolute",
    right: 8,
    top: 5,
    color: palette.orange,
    fontSize: 14,
    fontWeight: "900",
  },
  authHero: { marginTop: 32, marginBottom: 26 },
  kicker: { color: palette.teal, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  authTitle: {
    marginTop: 10,
    color: "#fff",
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 41,
    letterSpacing: -1.7,
  },
  authCopy: { marginTop: 12, color: "#b8c0ba", fontSize: 13, lineHeight: 20 },
  authCard: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: palette.paper,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  authCardIntro: { marginBottom: 15 },
  authCardTitle: { color: palette.ink, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  authCardCopy: { marginTop: 5, color: palette.grey, fontSize: 11, lineHeight: 17 },
  modeTabs: {
    height: 44,
    flexDirection: "row",
    padding: 4,
    borderRadius: 13,
    backgroundColor: "#e3e1d8",
  },
  modeTabsPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  modeTabsText: { color: palette.grey, fontSize: 11, fontWeight: "800" },
  modeTabsTextActive: { color: palette.ink },
  modeActive: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  fieldLabel: {
    marginBottom: 6,
    color: palette.grey,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  roleRow: { gap: 9, marginBottom: 14 },
  roleCard: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    backgroundColor: palette.card,
  },
  roleActive: { borderWidth: 2, borderColor: palette.ink, backgroundColor: "#f8ffd9" },
  roleIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: palette.soft,
  },
  roleIconActive: { backgroundColor: palette.lime },
  roleTitle: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  roleDescription: { marginTop: 2, color: palette.grey, fontSize: 9 },
  roleCheck: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 10,
  },
  roleCheckActive: { borderColor: palette.teal, backgroundColor: palette.teal },
  field: { marginTop: 13 },
  input: {
    height: 52,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#c8c6bc",
    borderRadius: 14,
    backgroundColor: "#fff",
    color: palette.ink,
  },
  primary: {
    minHeight: 52,
    marginTop: 17,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 15,
    backgroundColor: palette.ink,
  },
  primaryText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  secureLine: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  secureLineText: { color: palette.grey, fontSize: 9, fontWeight: "600" },
  demoDivider: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  demoDividerLine: { flex: 1, height: 1, backgroundColor: palette.line },
  demoDividerText: { color: palette.muted, fontSize: 6, fontWeight: "900", letterSpacing: 0.7 },
  demoEntryRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  demoEntry: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: palette.ink,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  demoEntryText: { color: palette.ink, fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  demoEntryDark: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: palette.ink,
  },
  demoEntryDarkText: { color: "#fff", fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  appSafe: { flex: 1, backgroundColor: palette.paper },
  easy: {},
  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    backgroundColor: palette.card,
  },
  wordmark: { color: palette.ink, fontSize: 18, fontWeight: "900", letterSpacing: -1 },
  tagline: {
    marginTop: 3,
    color: palette.grey,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 13 },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: palette.softTeal,
  },
  modeBadgeText: { color: palette.teal, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  easyControl: { flexDirection: "row", alignItems: "center", gap: 4 },
  easyControlText: { color: palette.grey, fontSize: 7, fontWeight: "900", letterSpacing: 0.6 },
  logoutButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 34 },
  customerHero: {
    minHeight: 154,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: palette.ink,
  },
  heroEyebrow: { color: palette.teal, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  customerHeroTitle: {
    maxWidth: 230,
    marginTop: 10,
    color: "#fff",
    fontSize: 29,
    fontWeight: "900",
    lineHeight: 31,
    letterSpacing: -1.1,
  },
  heroLocation: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 6 },
  heroLocationText: { flex: 1, color: "#cbd2cc", fontSize: 10, fontWeight: "700" },
  heroSignal: {
    width: 82,
    padding: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#39443c",
    borderRadius: 17,
    backgroundColor: palette.coal,
  },
  heroSignalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.lime },
  heroSignalValue: { marginTop: 10, color: palette.lime, fontSize: 26, fontWeight: "900" },
  heroSignalLabel: { marginTop: 1, color: "#b7c0b9", fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  sectionLabelRow: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { color: palette.ink, fontSize: 8, fontWeight: "900", letterSpacing: 0.9 },
  sectionHint: { color: palette.teal, fontSize: 9, fontWeight: "700" },
  search: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 13,
    paddingRight: 5,
    borderWidth: 1,
    borderColor: "#c9c7bd",
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  searchInput: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: "600" },
  searchAction: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: palette.ink,
  },
  locationRow: {
    marginVertical: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#bddbd3",
    borderRadius: 16,
    backgroundColor: palette.softTeal,
  },
  locationIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  locationRowTitle: { color: palette.ink, fontSize: 11, fontWeight: "900" },
  locationRowText: {
    marginTop: 2,
    color: palette.grey,
    fontSize: 8,
    fontWeight: "600",
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.teal },
  mapWrap: {
    height: 292,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfc3ba",
    borderRadius: 22,
    backgroundColor: "#dce0d7",
  },
  shopCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 22,
    backgroundColor: palette.card,
    shadowColor: "#111512",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  signalTop: { flexDirection: "row", justifyContent: "space-between" },
  signalLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  signalLabelText: { color: palette.teal, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  strong: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#def4e9",
    color: "#087450",
    fontSize: 8,
    fontWeight: "900",
  },
  shopTop: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  shopLogo: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 4,
    backgroundColor: palette.ink,
  },
  shopLogoText: { color: palette.lime, fontWeight: "900" },
  shopName: { color: palette.ink, fontSize: 19, fontWeight: "900" },
  meta: { marginTop: 3, color: palette.grey, fontSize: 9 },
  favouriteButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 13,
    backgroundColor: "#fff",
  },
  crates: {
    marginVertical: 13,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  cratesText: { color: palette.orange, fontSize: 10 },
  cratesScore: { color: palette.ink, fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  pickupChip: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 99,
    backgroundColor: palette.soft,
  },
  pickupChipText: { color: palette.ink, fontSize: 7, fontWeight: "900" },
  stockList: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 13,
    backgroundColor: "#fff",
  },
  stockListRow: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  stockName: { flex: 1, fontSize: 10 },
  stockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.teal },
  stockQty: { width: 41, color: palette.grey, fontSize: 8, fontWeight: "700" },
  stockPrice: { width: 58, textAlign: "right", color: palette.ink, fontSize: 10, fontWeight: "900" },
  inlineDrop: {
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f2c0a4",
    borderRadius: 15,
    backgroundColor: "#fff0e7",
  },
  inlineDropBottom: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  inlineOldPrice: { color: palette.grey, fontSize: 9, textDecorationLine: "line-through" },
  cardTitle: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  dropPrice: { marginTop: 3, color: palette.orange, fontSize: 28, fontWeight: "900" },
  orangeButton: {
    height: 42,
    minWidth: 134,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 11,
    backgroundColor: palette.orange,
  },
  orangeButtonText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  screenHead: { marginTop: 8, marginBottom: 16 },
  screenTitle: {
    marginTop: 5,
    color: palette.ink,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -1,
  },
  routeCard: {
    minHeight: 82,
    marginBottom: 10,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    backgroundColor: palette.card,
  },
  routeBest: { borderWidth: 2, borderColor: palette.ink, backgroundColor: "#f8ffd9" },
  routeIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#e5f5ed",
  },
  price: { color: palette.ink, fontSize: 17, fontWeight: "900" },
  dropCard: {
    marginBottom: 13,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    backgroundColor: palette.card,
  },
  dropVisual: {
    height: 95,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: palette.orange,
  },
  dropVisualText: { color: "#fff", fontSize: 8, fontWeight: "900" },
  dropBody: { padding: 15 },
  oldPrice: { marginTop: 8, color: palette.grey, fontSize: 10, textDecorationLine: "line-through" },
  needCard: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: palette.lime,
  },
  supportCard: {
    marginTop: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#c4d875",
    borderRadius: 16,
    backgroundColor: "#f2f9cf",
  },
  post: {
    marginTop: 12,
    padding: 15,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 16,
    backgroundColor: palette.card,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: palette.teal,
  },
  avatarText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  postText: { marginTop: 7, color: palette.ink, fontSize: 11, lineHeight: 17 },
  tag: { marginTop: 7, color: palette.teal, fontSize: 8, fontWeight: "800" },
  bottomNav: {
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 4,
    backgroundColor: palette.ink,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 15 },
  navItemActive: { backgroundColor: palette.lime },
  navText: { color: "#8c938d", fontSize: 8, fontWeight: "700" },
  navTextActive: { color: palette.ink, fontWeight: "900" },
  merchantHero: {
    padding: 19,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: palette.ink,
  },
  merchantHeroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  merchantSignal: { flexDirection: "row", alignItems: "center", gap: 6 },
  merchantSignalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.lime },
  merchantKicker: { color: palette.teal, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  shopStatusButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: palette.lime,
  },
  shopStatusButtonClosed: { backgroundColor: palette.orange },
  shopStatusButtonText: { color: palette.ink, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  merchantTitle: {
    marginTop: 18,
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  merchantHeroCopy: { marginTop: 7, color: "#bcc5be", fontSize: 11, lineHeight: 17 },
  merchantHeroFooter: {
    marginTop: 20,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#343c36",
  },
  merchantHeroAddress: { color: "#d6ddd7", fontSize: 8, fontWeight: "700" },
  merchantHeroAction: { color: palette.lime, fontSize: 6, fontWeight: "900", letterSpacing: 0.6 },
  metrics: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    width: "48.7%",
    minHeight: 104,
    padding: 13,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    backgroundColor: palette.card,
  },
  metricValue: { marginTop: "auto", color: palette.ink, fontSize: 28, fontWeight: "900" },
  screenIntro: { marginTop: -9, marginBottom: 16, color: palette.grey, fontSize: 11, lineHeight: 17 },
  whisper: {
    marginBottom: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#f2cbb6",
    borderRadius: 16,
    backgroundColor: "#fff0e8",
  },
  whisperIcon: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  demandCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 20,
    backgroundColor: palette.card,
  },
  demandCardHead: { marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  demandTitle: { marginTop: 4, color: palette.ink, fontSize: 16, fontWeight: "900" },
  demandRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  demandRank: { width: 18, color: palette.muted, fontSize: 7, fontWeight: "900" },
  demandQuery: { width: 105, color: palette.ink, fontSize: 9, fontWeight: "800" },
  demandBarTrack: { flex: 1, height: 5, overflow: "hidden", borderRadius: 4, backgroundColor: palette.soft },
  demandBar: { height: "100%", borderRadius: 4, backgroundColor: palette.blue },
  demandValue: { width: 22, textAlign: "right", color: palette.ink, fontSize: 9, fontWeight: "900" },
  packingCard: {
    marginBottom: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 20,
    backgroundColor: palette.card,
    shadowColor: "#111512",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  packingCardAlert: { borderColor: "#efb89f", backgroundColor: "#fff8f4" },
  packingCardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  customerAvatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: palette.ink,
  },
  customerAvatarText: { color: palette.lime, fontSize: 11, fontWeight: "900" },
  packingCustomer: { color: palette.ink, fontSize: 13, fontWeight: "900" },
  packingProduct: { marginTop: 3, color: palette.grey, fontSize: 9 },
  orderCodeBlock: { alignItems: "flex-end" },
  orderCodeLabel: { color: palette.muted, fontSize: 6, fontWeight: "900", letterSpacing: 0.6 },
  orderCode: { marginTop: 2, color: palette.ink, fontSize: 15, fontWeight: "900", letterSpacing: 0.7 },
  packingStatusRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  packingStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 99,
    backgroundColor: palette.softTeal,
  },
  packingStatusPillAlert: { backgroundColor: "#ffe2d5" },
  packingStatusPillReady: { backgroundColor: "#efffb0" },
  packingStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.teal },
  packingStatusText: { color: palette.ink, fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  paymentTag: { flex: 1, color: palette.grey, fontSize: 7, fontWeight: "700" },
  controlLabel: { marginTop: 14, color: palette.muted, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  packingControls: { paddingTop: 8, paddingRight: 8, gap: 7 },
  packingControl: {
    height: 36,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  packingControlActive: { borderColor: palette.teal, backgroundColor: palette.teal },
  packingControlDanger: { borderColor: "#efb89f" },
  packingControlText: { color: palette.ink, fontSize: 8, fontWeight: "800" },
  packingControlTextActive: { color: "#fff", fontWeight: "900" },
  stockSummary: {
    marginTop: -4,
    marginBottom: 13,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: palette.ink,
  },
  stockSummaryValue: { color: palette.lime, fontSize: 23, fontWeight: "900" },
  stockSummaryLabel: { color: "#b8c0ba", fontSize: 7, fontWeight: "900", letterSpacing: 0.6 },
  stockSummaryDivider: { width: 1, height: 30, marginHorizontal: 6, backgroundColor: "#3a423c" },
  inventoryControl: {
    marginBottom: 9,
    padding: 13,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    backgroundColor: palette.card,
  },
  inventoryControlLow: { borderColor: "#efc2ab", backgroundColor: "#fffaf7" },
  inventoryControlTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  inventoryGlyph: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: palette.softTeal,
  },
  inventoryGlyphLow: { backgroundColor: palette.softOrange },
  inventoryName: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  inventoryCategory: { marginTop: 3, color: palette.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.5 },
  inventoryPrice: { color: palette.ink, fontSize: 15, fontWeight: "900" },
  inventoryControlBottom: {
    marginTop: 12,
    paddingTop: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  stockState: { flexDirection: "row", alignItems: "center", gap: 5 },
  stockStateLow: {},
  stockStateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.teal },
  stockStateDotLow: { backgroundColor: palette.orange },
  stockStateText: { color: palette.grey, fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 7 },
  quantityButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  quantityButtonDark: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: palette.ink,
  },
  quantityValueWrap: { minWidth: 44, alignItems: "center" },
  quantityValue: { color: palette.ink, fontSize: 15, fontWeight: "900" },
  quantityUnit: { marginTop: 1, color: palette.muted, fontSize: 5, fontWeight: "900", letterSpacing: 0.5 },
  merchantNav: {
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.card,
  },
  merchantNavItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 15 },
  merchantNavItemActive: { backgroundColor: palette.lime },
  merchantNavText: { color: palette.muted, fontSize: 8, fontWeight: "800" },
  merchantNavTextActive: { color: palette.ink, fontWeight: "900" },
  inventoryRow: {
    minHeight: 60,
    marginBottom: 7,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    backgroundColor: palette.card,
  },
  qty: {
    minWidth: 35,
    padding: 7,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#e0f5eb",
  },
  qtyLow: { backgroundColor: "#fff0e7" },
  orderCard: {
    marginBottom: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    backgroundColor: palette.card,
  },
  pickup: { marginTop: 3, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  orderTracker: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#b8d8d1",
    borderRadius: 18,
    backgroundColor: "#eaf7f4",
    shadowColor: "#111512",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  orderTrackerTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  orderTrackerIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: palette.lime,
  },
  orderTrackerLabel: { color: palette.teal, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  orderTrackerTitle: { marginTop: 2, color: palette.ink, fontSize: 15, fontWeight: "900" },
  orderTrackerMeta: { marginTop: 1, color: palette.grey, fontSize: 8 },
  mobileReceiptRow: { flexDirection: "row", gap: 7, marginTop: 10, padding: 9, backgroundColor: palette.softTeal, borderRadius: 11 },
  mobileReceiptLabel: { color: palette.teal, fontSize: 6, fontWeight: "900", letterSpacing: 0.5 },
  mobileReceiptValue: { color: palette.ink, fontSize: 7, fontWeight: "700", marginTop: 2, maxWidth: 100 },
  pickupCodePill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 11,
    backgroundColor: palette.ink,
  },
  pickupCodeLabel: { color: "#9ba49d", fontSize: 6, fontWeight: "900", letterSpacing: 0.7 },
  pickupCodeValue: { marginTop: 2, color: palette.lime, fontSize: 13, fontWeight: "900", letterSpacing: 0.7 },
  orderSteps: { marginTop: 11, flexDirection: "row", justifyContent: "space-between" },
  orderStep: { width: "24%", alignItems: "center", gap: 4 },
  orderStepDot: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bdc9c2",
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  orderStepDotActive: { borderColor: palette.teal, backgroundColor: palette.teal },
  orderStepNumber: { color: palette.grey, fontSize: 8, fontWeight: "900" },
  orderStepText: { color: palette.grey, fontSize: 7, fontWeight: "700" },
  orderStepTextActive: { color: palette.ink, fontWeight: "900" },
  routeButtons: { marginTop: 11, flexDirection: "row", alignItems: "center", gap: 7 },
  routeButton: {
    height: 34,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: palette.ink,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  routeButtonText: { color: palette.ink, fontSize: 7, fontWeight: "900" },
  routeButtonDark: {
    height: 34,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    backgroundColor: palette.ink,
  },
  routeButtonDarkText: { color: "#fff", fontSize: 7, fontWeight: "900" },
  liveBadge: {
    marginLeft: "auto",
    paddingHorizontal: 7,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 99,
    backgroundColor: "#fff",
  },
  liveBadgeText: { color: palette.ink, fontSize: 6, fontWeight: "900" },
  soldOutNotice: { marginTop: 10, padding: 9, borderRadius: 10, backgroundColor: "#ffdfd1" },
  soldOutTitle: { color: "#7c2d12", fontSize: 9, fontWeight: "900" },
  soldOutCopy: { marginTop: 3, color: "#8d5139", fontSize: 8, lineHeight: 12 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17,21,18,.62)",
  },
  checkoutSheet: {
    maxHeight: "94%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.paper,
  },
  checkoutCard: {
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.paper,
  },
  checkoutHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutTitle: { marginTop: 5, color: palette.ink, fontSize: 29, fontWeight: "900", letterSpacing: -0.8 },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  demoNotice: {
    marginTop: 13,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 11,
    backgroundColor: "#e4f4f0",
  },
  demoNoticeText: { flex: 1, color: palette.grey, fontSize: 9, lineHeight: 14 },
  prototypeNotice: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginHorizontal: 15, marginTop: 7, padding: 8, borderRadius: 10, backgroundColor: "#fff3cd", borderWidth: 1, borderColor: "#f0d98b" },
  prototypeNoticeTag: { color: "#705400", fontSize: 7, fontWeight: "900", letterSpacing: 0.6 },
  prototypeNoticeText: { flex: 1, color: "#675523", fontSize: 8, lineHeight: 11 },
  easyPaymentConfirm: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: "#fff3cd", borderWidth: 1, borderColor: "#f0d98b" },
  easyPaymentConfirmText: { color: "#675523", fontSize: 9, lineHeight: 14, fontWeight: "700" },
  checkoutItem: {
    marginTop: 12,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    backgroundColor: palette.ink,
  },
  checkoutPrice: { color: palette.lime, fontSize: 20, fontWeight: "900" },
  checkoutTabs: { marginTop: 12, flexDirection: "row", gap: 9 },
  checkoutTab: {
    flex: 1,
    minHeight: 82,
    padding: 11,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  checkoutTabActive: { borderWidth: 2, borderColor: palette.ink, backgroundColor: "#f2fad2" },
  checkoutHelp: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#e9f5f3",
    color: palette.grey,
    fontSize: 9,
    lineHeight: 14,
  },
  ilpMobileStages: { marginTop: 13, flexDirection: "row", justifyContent: "space-between" },
  ilpMobileStage: { width: "19%", alignItems: "center", gap: 4 },
  stageDot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  stageDotActive: { borderColor: palette.teal, backgroundColor: palette.teal },
  stageNumber: { color: palette.grey, fontSize: 8, fontWeight: "900" },
  stageLabel: { color: palette.grey, fontSize: 7, fontWeight: "700" },
  checkoutError: {
    marginTop: 9,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fde9e4",
    color: "#8c2e20",
    fontSize: 9,
  },
});
