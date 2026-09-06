import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type Position = { latitude: number; longitude: number };
type MapShop = Position & { id: string; name: string; address: string };

export type ShopMapProps = {
  position: Position;
  shops: MapShop[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (shopId: string) => void;
};

export default function ShopMap({
  position,
  shops,
  selectedId,
  loading,
  onSelect,
}: ShopMapProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.roadOne} />
      <View style={styles.roadTwo} />
      <View style={styles.roadThree} />
      <View style={styles.water} />
      {loading ? (
        <ActivityIndicator color="#009c83" />
      ) : (
        shops.slice(0, 10).map((shop) => {
          const left = 50 + ((shop.longitude - position.longitude) / 0.03) * 44;
          const top = 50 - ((shop.latitude - position.latitude) / 0.03) * 44;
          const selected = shop.id === selectedId;
          return (
            <Pressable
              key={shop.id}
              accessibilityLabel={`View ${shop.name}`}
              onPress={() => onSelect(shop.id)}
              style={[
                styles.pin,
                {
                  left: `${Math.max(5, Math.min(88, left))}%`,
                  top: `${Math.max(8, Math.min(84, top))}%`,
                },
                selected && styles.pinSelected,
              ]}
            >
              <Text style={[styles.pinText, selected && styles.pinTextSelected]}>
                {shop.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </Text>
            </Pressable>
          );
        })
      )}
      <View style={styles.youAreHere}>
        <View style={styles.youDot} />
        <Text style={styles.youText}>YOU ARE HERE</Text>
      </View>
      <Text style={styles.mapLabel}>NEIGHBOURHOOD GRID</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 292,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfc3ba",
    borderRadius: 22,
    backgroundColor: "#dfe5dc",
  },
  roadOne: {
    position: "absolute",
    top: 118,
    left: -30,
    width: 470,
    height: 17,
    transform: [{ rotate: "-13deg" }],
    backgroundColor: "#fffef8",
  },
  roadTwo: {
    position: "absolute",
    top: 40,
    left: 148,
    width: 15,
    height: 330,
    transform: [{ rotate: "26deg" }],
    backgroundColor: "#fffef8",
  },
  roadThree: {
    position: "absolute",
    top: 215,
    left: -10,
    width: 430,
    height: 10,
    transform: [{ rotate: "8deg" }],
    backgroundColor: "#f5f3e9",
  },
  water: {
    position: "absolute",
    right: -68,
    top: -40,
    width: 150,
    height: 390,
    borderRadius: 70,
    backgroundColor: "#c6e6df",
  },
  pin: {
    position: "absolute",
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fffef8",
    borderRadius: 17,
    backgroundColor: "#009c83",
    shadowColor: "#111512",
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  pinSelected: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#ff6734" },
  pinText: { color: "#fff", fontSize: 7, fontWeight: "900" },
  pinTextSelected: { fontSize: 9 },
  youAreHere: {
    position: "absolute",
    left: 14,
    bottom: 14,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 99,
    backgroundColor: "#111512",
  },
  youDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#d9ff43" },
  youText: { color: "#fff", fontSize: 6, fontWeight: "900", letterSpacing: 0.6 },
  mapLabel: {
    position: "absolute",
    top: 13,
    left: 14,
    color: "#5e665f",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});
