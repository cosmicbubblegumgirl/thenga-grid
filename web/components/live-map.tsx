'use client';

import { useEffect, useRef } from 'react';
import type { Position, Shop } from '@/lib/types';

type Props = {
  shops: Shop[];
  selectedId: string | null;
  location: Position;
  onSelect: (id: string) => void;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character);
}

export function LiveMap({ shops, selectedId, location, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const layerRef = useRef<import('leaflet').LayerGroup | null>(null);

  useEffect(() => {
    let active = true;
    async function mountMap() {
      if (!containerRef.current || mapRef.current) return;
      const L = await import('leaflet');
      if (!active || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true }).setView([location.latitude, location.longitude], 14);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
    }
    void mountMap();
    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    void import('leaflet').then((L) => {
      layer.clearLayers();
      const userIcon = L.divIcon({
        className: 'map-user-icon',
        html: '<span aria-hidden="true"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([location.latitude, location.longitude], { icon: userIcon, zIndexOffset: 1000 })
        .bindTooltip('You are here', { direction: 'top' })
        .addTo(layer);

      shops.forEach((shop) => {
        const initials = shop.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
        const icon = L.divIcon({
          className: `map-shop-icon${shop.id === selectedId ? ' selected' : ''}${shop.source ? ' external' : ''}`,
          html: `<span>${escapeHtml(initials)}</span><i></i>`,
          iconSize: [46, 52],
          iconAnchor: [23, 48],
        });
        const marker = L.marker([shop.latitude, shop.longitude], { icon })
          .bindTooltip(`<strong>${escapeHtml(shop.name)}</strong><br>${escapeHtml(shop.address)}`, { direction: 'top' })
          .on('click', () => onSelect(shop.id))
          .addTo(layer);
        if (shop.id === selectedId) marker.openTooltip();
      });
      map.setView([location.latitude, location.longitude], 14, { animate: true });
    });
  }, [shops, selectedId, location, onSelect]);

  return <div ref={containerRef} className="leaflet-host" aria-label="Interactive map of nearby shops" />;
}
