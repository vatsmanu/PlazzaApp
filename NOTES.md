# NOTES.md — Plazza Customer App

## Assumptions

- **Android 13+ only** — `POST_NOTIFICATIONS` is a runtime permission on API 33+; the app requests it via `expo-notifications`.
- **No reverse geocoding** — location is displayed as raw `lat, lng` coordinates as specified.
- **No backend** — all data (catalog, cart, coupons, recent searches) lives on-device.
- **One coupon at a time** — applying a new coupon replaces the previous one.
- **FIRST100 "used" state** — mocked locally in AsyncStorage; resets only on a fresh install.
- **Search is synchronous** — a 300 ms artificial delay simulates async UX without a real network call.
- **Dark mode** — the existing theme system is preserved; all new UI uses hardcoded light-mode colors consistent with the Plazza brand blue (`#208AEF`). Full dark-mode theming would be a follow-up.

---

## Key Design Decisions & Trade-offs

### State — Zustand
Zustand was chosen over Context + useReducer for three reasons:
1. Zero boilerplate for selectors — components subscribe to only the slice they need, preventing unnecessary re-renders.
2. The store is a plain JS object, making it trivially testable without React wrappers.
3. `create()` returns a hook directly, so no Provider wrapping is needed.

### Persistence — Versioned AsyncStorage
The persisted shape is wrapped in `{ version: number, ...data }`. On hydration, if the version doesn't match `STORAGE_VERSION`, the saved data is silently discarded and the app starts fresh. This prevents crashes from corrupt or schema-mismatched data. The hydration function catches all JSON parse errors and falls back to defaults.

### Coupon & Bill Logic — Pluggable Rules Engine (`src/engine/couponRules.ts`)
Each coupon is a `CouponRule` object implementing three pure functions:
- `isValid(itemTotal, usedOneTime)` — validation
- `computeDiscount(itemTotal)` — discount amount
- `computeDeliveryFee(itemTotal, baseDeliveryFee)` — delivery after coupon

**Adding a new coupon type touches only `couponRules.ts` and `src/types/index.ts`** — the cart store calls `COUPON_RULES[code]` generically, and the Cart screen renders from the `COUPONS` array. No cart or bill rendering code changes.

`computeBill()` is a pure function that takes `(items, coupon, usedOneTime)` and returns a `BillBreakdown`. This makes it fully unit-testable without any React or store setup.

### Auto-removal of Invalid Coupons
The Cart screen runs `revalidateCoupon()` inside a `useEffect` that depends on `cartItems`. When the cart changes and the active coupon is no longer valid, the store clears `appliedCoupon` and returns the human-readable `invalidReason` from the rule. The screen then shows a Toast with that reason.

### Permissions Lifecycle
`usePermissions` maps Expo's permission result to a 4-state enum (`undetermined | granted | denied | blocked`). It re-checks on every `AppState` change to `active`, so returning from OS Settings immediately reflects the new state. "Blocked" renders a deep-link button to `Linking.openSettings()`.

### Recent Searches
Stored as a string array (max 5) in the persisted state. New searches are prepended and duplicates are deduplicated before slicing to 5.

---

## What I Would Do Differently With More Time

1. **Full dark-mode support** — wire all new components through `useTheme()` instead of hardcoded hex values.
2. **Optimistic UI for cart** — debounce AsyncStorage writes (currently every mutation writes immediately).
3. **Prescription upload flow** — the `rx: true` badge is shown but no upload modal exists; would add a bottom sheet with camera/gallery picker.
4. **Search debouncing** — replace the submit-on-enter model with a 300 ms debounced live search for a smoother UX.
5. **Notification scheduling** — use `expo-notifications` to send a local push ("Your order is on the way!") after placing an order.
6. **E2E tests** — add Detox tests covering the full add-to-cart → apply coupon → place order flow on a real emulator.
7. **Error boundaries** — wrap screens in React error boundaries so a rendering crash doesn't take down the whole app.
8. **Accessibility audit** — run TalkBack on a real device and fix any focus-order or announcement issues beyond the labels already added.
