# SAFE Mobile App Assets

## Directory Structure

```
src/assets/
├── brand/             # SAFE branding (logo, shield)
│   ├── safe-logo-full.png     # Main SAFE logo (1024px)
│   └── safe-logo-512.png      # Smaller variant
├── payment/           # Payment provider logos
│   ├── airtel-money.png        # ← PLACE HERE (Airtel Money branded logo)
│   ├── mtn-mobile-money.png    # ← PLACE HERE (MTN Mobile Money branded logo)
│   ├── visa.png                # ← PLACE HERE (Visa logo)
│   └── mastercard.png          # ← PLACE HERE (Mastercard logo)
├── transport/         # Bus/vehicle/route illustrations
│   ├── bus-hero-city.png       # ← PLACE HERE (green city bus illustration)
│   ├── verified-vehicle.png    # ← PLACE HERE (verified vehicle badge)
│   ├── route-strip-bus.png     # ← PLACE HERE (route with bus markers)
│   ├── safe-road-background.png
│   └── share-track-map.png
├── map/               # Map-related assets
│   ├── route-map-bus-hero.png        # ← PLACE HERE
│   ├── user-location-marker.png      # ← PLACE HERE
│   ├── offline-map-placeholder.png   # ← PLACE HERE
│   └── lusaka-night-aerial.png
├── qr/                # QR scanning assets
│   └── qr-scan-frame.png      # ← PLACE HERE
├── cover/             # Cover/protection illustrations
├── claims/            # Claims-related illustrations
├── empty-states/      # Empty state illustrations
└── icons/             # Action icons (camera, wallet, etc.)
```

## How to Replace Inline SVGs with Real Assets

The app currently uses inline SVG components for:
- Payment logos (`src/components/PaymentLogos.jsx`)
- Bus illustration (`src/components/BusIllustration.jsx`)

When real PNG/SVG brand assets are available:

1. Place them in the appropriate directory above
2. Update imports in `App.jsx` or the relevant component
3. Replace the SVG component usage with `<img src={importedAsset} />`

The inline SVG components serve as functional placeholders that match the design direction.
