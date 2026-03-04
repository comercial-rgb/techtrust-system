# Apple App Store Review Response — TechTrust Auto Solutions

**App Name:** TechTrust Auto Solutions  
**Bundle ID:** com.techtrustautosolutions.mobile  
**Version:** 1.0.15  

---

## Guideline 2.1 — Information Needed (PassKit / Apple Pay)

**Response:**

The app integrates the Stripe React Native SDK (`@stripe/stripe-react-native`) for payment processing. The Stripe SDK internally bundles the PassKit framework to support Apple Pay through Stripe's payment sheet.

**Apple Pay is now fully implemented** in the app's Payment Screen. When a customer proceeds to pay for a completed auto service, the Apple Pay button is displayed on supported iOS devices. The payment flow uses Stripe's `presentApplePay` and `confirmApplePayPayment` APIs with the configured merchant identifier `merchant.com.techtrustautosolutions`.

**Where to find it:**
1. Log in as a Customer
2. Navigate to **Services** tab → select an active Work Order
3. Tap **Pay** to go to the Payment Screen
4. The **Apple Pay** button appears at the top of the payment method selection (on supported devices)
5. Alternatively, go to **Profile** → **Payment Methods** → **Add Payment Method** to see the Apple Pay integration information

---

## Guideline 5.1.2 — App Tracking Transparency

**Response:**

We have implemented the App Tracking Transparency (ATT) framework using `expo-tracking-transparency`. The app now requests the user's permission via the native iOS ATT dialog before any tracking-related data collection occurs.

**Where to find the ATT prompt:**
- The ATT permission dialog is displayed **on app launch** (after the splash screen), the first time the user opens the app on iOS 14.5+
- The dialog message reads: *"TechTrust uses your data to provide personalized service recommendations and improve your experience. Your data is never sold to third parties."*

**Technical details:**
- The `NSUserTrackingUsageDescription` key has been added to the app's `Info.plist` via `app.json`
- The `expo-tracking-transparency` plugin is configured in the Expo plugins array
- The permission request is called via `requestTrackingPermissionsAsync()` in `App.tsx` on iOS only
- The app respects the user's choice — if tracking is denied, no tracking identifiers are collected

---

## Guideline 5.1.1 — Data Collection and Storage (Registration Requirement)

**Response:**

The TechTrust app **does NOT require registration to access general information**. The app's home screen (Landing Screen) is fully accessible without any account and provides the following features to unauthenticated users:

**Features available WITHOUT an account:**
- Browse the full list of verified auto service providers
- Search providers by service type, state, and city
- View provider ratings, contact information, and service offerings
- Read informational articles about auto maintenance
- View special offers and promotions from providers
- Browse the Popular Services grid (Oil Change, Brakes, Diagnostics, A/C, Tires, Car Wash)
- Access the app's benefits and trust information
- View the Car Wash Map
- Change app language (English, Portuguese, Spanish)

**Where to verify guest access:**
1. Open the app — the Landing Screen is displayed immediately
2. On the Login screen, there is a **"Continue as Guest"** button that returns users to the Landing Screen
3. All general information, provider search, articles, and offers are freely browsable

**Why registration exists:**
- Account creation is **free** and enables personalized features: saving vehicles, requesting quotes, tracking service history, managing payment methods, and receiving notifications
- After registration, users can optionally subscribe to premium plans for additional features (more vehicle slots, priority support, etc.)
- Registration is required only for features that inherently need user identity: submitting service requests, managing vehicles, processing payments, and communicating with providers
- The app stores vehicle information, service history, and payment data that are tied to individual user accounts for security and privacy

---

## Guideline 5.1.1 — Data Collection and Storage (Phone Number)

**Response:**

We have updated the app so that the **phone number is now optional** during registration. Users can create an account with only their name, email, and password.

**Changes made:**
- The registration form now displays the phone field as **"Phone (Optional)"** with a hint: *"Add your phone number to receive SMS notifications"*
- Phone number is no longer included in form validation as a required field
- The progress bar no longer counts phone as a required field
- If no phone is provided, account verification defaults to **email OTP** instead of SMS
- The SMS verification option is disabled (grayed out) when no phone number is entered
- Backend validation has been updated to accept signups without a phone number
- The database schema has been updated to allow nullable phone numbers

**Where to verify:**
1. Open the app → Tap **Sign Up**
2. The phone field is clearly labeled as **"Phone (Optional)"**
3. Fill in only Name, Email, Password, Confirm Password → Tap **Create Account**
4. Verification code will be sent via **email** (since no phone was provided)

---

## Review Notes (for App Store Connect)

Please include the following in the **Review Notes** field when submitting:

```
APPLE PAY: Apple Pay is implemented via Stripe SDK in the Payment Screen. 
To test: Log in → Services → select a Work Order → Pay. The Apple Pay button 
appears on supported iOS devices.

APP TRACKING TRANSPARENCY: The ATT permission dialog is shown on first launch 
(after splash screen) on iOS 14.5+.

GUEST ACCESS: The Landing Screen is accessible without login. General information, 
provider search, articles, and offers are freely browsable. A "Continue as Guest" 
button is available on the Login screen.

PHONE NUMBER: Phone is optional during registration. The field is labeled 
"Phone (Optional)" and verification defaults to email when no phone is provided.
```
