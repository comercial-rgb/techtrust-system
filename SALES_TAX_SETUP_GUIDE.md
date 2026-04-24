# TechTrust — Sales Tax Setup Guide (Marketplace Facilitator)

## Overview

TechTrust is classified as a **Marketplace Facilitator** in Florida under FL Statute §212.0596. This means TechTrust (not the provider/shop) is responsible for collecting and remitting sales tax on transactions processed through the platform.

### Tax Rules (Florida)
- **Base state rate**: 6%
- **County discretionary surtax**: 0% to 2.5% (varies by county)
- **Taxable items**: Parts, shop supplies (tangible personal property)
- **Exempt items**: Labor/services, travel fees, diagnostic fees, tire/battery environmental fees

---

## 1. Stripe Tax Setup

### 1.1 Enable Stripe Tax
1. Go to [Stripe Dashboard → Tax](https://dashboard.stripe.com/tax)
2. Click **"Get started"** or **"Enable Stripe Tax"**
3. Set your **Tax registrations**:
   - Country: **United States**
   - State: **Florida**
   - Registration type: **Sales tax**
   - Registration number: Your FL sales tax registration number (from DR-1 form)

### 1.2 Configure Origin Address
1. Go to **Settings → Tax → Origin address**
2. Set to:
   - **Street**: [Your business address]
   - **City**: Port St. Lucie
   - **State**: FL
   - **ZIP**: [Your ZIP code]
3. This tells Stripe where you're operating from

### 1.3 Set Tax Behavior
1. In **Tax Settings**, set:
   - **Tax behavior**: `exclusive` (tax added on top of price)
   - **Product tax codes**: 
     - Parts: `txcd_99999999` (General - Tangible Goods)
     - Labor: `txcd_20060000` (General Services — exempt in FL)

### 1.4 Environment Variable
Add to your `.env`:
```
STRIPE_TAX_ENABLED=true
```

When this is `true`, the system uses Stripe Tax API for precise calculations. When `false`, it falls back to the built-in FL county surtax table.

---

## 2. QuickBooks Online Setup

### 2.1 Create QuickBooks Account
1. Sign up at [quickbooks.intuit.com](https://quickbooks.intuit.com)
2. Select **QuickBooks Online Simple Start** or higher
3. Complete company setup with TechTrust business info

### 2.2 Configure Sales Tax in QuickBooks
1. Go to **Taxes → Sales Tax → Set up sales tax**
2. Select **Florida** as your state
3. Enter your FL sales tax registration number
4. QuickBooks will configure the base 6% rate
5. Add county surtax rates as applicable

### 2.3 Create Required Items in QuickBooks
Create the following **Products/Services** in QBO:
| Item Name | Type | Income Account | Taxable |
|-----------|------|---------------|---------|
| Parts | Non-inventory | Sales Revenue | ✅ Yes |
| Shop Supplies | Non-inventory | Sales Revenue | ✅ Yes |
| Labor | Service | Service Revenue | ❌ No |
| Travel Fee | Service | Service Revenue | ❌ No |
| App Service Fee | Service | Platform Fee Revenue | ❌ No |

### 2.4 API Integration (OAuth 2.0)
1. Go to [developer.intuit.com](https://developer.intuit.com)
2. Create an app → Select **Accounting** scope
3. Get your OAuth credentials
4. Add to `.env`:
```
QBO_CLIENT_ID=your_client_id
QBO_CLIENT_SECRET=your_client_secret
QBO_REDIRECT_URI=https://yourdomain.com/api/v1/quickbooks/callback
QBO_REALM_ID=your_company_id
QBO_ACCESS_TOKEN=initial_access_token
QBO_REFRESH_TOKEN=initial_refresh_token
QBO_ENVIRONMENT=production
```

### 2.5 Item Reference IDs
After creating items in QBO, note their IDs and add to `.env`:
```
QBO_ITEM_PARTS=1
QBO_ITEM_SUPPLIES=2
QBO_ITEM_LABOR=3
QBO_ITEM_TRAVEL=4
QBO_ITEM_APP_FEE=5
```

---

## 3. Tax Filing (DR-15)

### 3.1 Filing Schedule
- **Monthly** if estimated tax ≥ $1,000/month
- **Quarterly** if estimated tax < $1,000/month
- Florida DOR assigns your filing frequency

### 3.2 DR-15 Form
1. File online at [floridarevenue.com](https://floridarevenue.com)
2. Use **QuickBooks Sales Tax Liability Report** as your source
3. Key lines on DR-15:
   - **Line 1**: Gross sales (total transaction amounts)
   - **Line 2**: Exempt sales (labor/service portions)
   - **Line 3**: Taxable amount (parts + supplies)
   - **Line 4**: Tax due (6% of taxable amount)
   - **Line 5**: Surtax due (county rates on applicable amounts)

### 3.3 Quarterly Reconciliation
Run in the TechTrust admin dashboard:
1. Go to **Configurações → Taxas e Valores**
2. Review the Sales Tax section
3. Cross-reference with QuickBooks Tax Summary Report
4. File DR-15 with FL DOR

---

## 4. System Architecture

### Flow Diagram
```
Provider creates Quote
  → partsCost, laborCost (NO manual taxAmount)
  
Customer approves Quote
  → Backend calls tax.service.calculateSalesTax()
  → Gets customer county from service location coordinates
  → Calculates: parts × (6% + county surtax)
  → Adds salesTax to totalClientPays
  
Payment via Stripe
  → PaymentIntent includes salesTaxAmountCents in metadata
  → Stripe records tax for reporting
  
Payment captured
  → Receipt shows Sales Tax as separate line
  → QuickBooks sync via quickbooks.service.ts
  → QBO marks parts as TAX, labor as NON
  
Filing time
  → QBO Sales Tax Liability Report
  → Fill DR-15 form
  → Submit to FL DOR
```

### Key Files
- `techtrust-backend/src/services/tax.service.ts` — Tax calculation engine
- `techtrust-backend/src/services/quickbooks.service.ts` — QuickBooks API integration
- `techtrust-backend/src/services/stripe.service.ts` — Stripe payment processing
- `techtrust-backend/src/config/businessRules.ts` — Fee breakdown with sales tax
- `techtrust-backend/src/controllers/service-flow.controller.ts` — Payment flow

### Environment Variables
```env
# Stripe Tax
STRIPE_TAX_ENABLED=true          # Use Stripe Tax API (false = manual FL table)

# QuickBooks Online
QBO_CLIENT_ID=
QBO_CLIENT_SECRET=
QBO_REDIRECT_URI=
QBO_REALM_ID=
QBO_ACCESS_TOKEN=
QBO_REFRESH_TOKEN=
QBO_ENVIRONMENT=production        # sandbox | production
QBO_ITEM_PARTS=1
QBO_ITEM_SUPPLIES=2
QBO_ITEM_LABOR=3
QBO_ITEM_TRAVEL=4
QBO_ITEM_APP_FEE=5
```
