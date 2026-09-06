import { ActivityIndicator, StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

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
      {loading ? (
        <ActivityIndicator color="#009c83" />
      ) : (
        <MapView
          key={`${position.latitude}-${position.longitude}`}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...position, latitudeDelta: 0.045, longitudeDelta: 0.045 }}
          showsUserLocation
          showsMyLocationButton
        >
          {shops.map((shop) => (
            <Marker
              key={shop.id}
              coordinate={shop}
              title={shop.name}
              description={shop.address}
              pinColor={shop.id === selectedId ? "#ff6734" : "#009c83"}
              onPress={() => onSelect(shop.id)}
            />
          ))}
        </MapView>
      )}
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
    backgroundColor: "#dce0d7",
  },
});
