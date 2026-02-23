# PartsTech Integration — Provider Setup Guide

## What is PartsTech?

PartsTech is a **B2B parts ordering platform** used by auto repair shops to search real-time parts availability and wholesale pricing from multiple suppliers simultaneously.

**Cost to the provider**: **$0** — PartsTech is free for repair shops. Suppliers pay PartsTech for access to the marketplace.

**What you get**:
- Real-time wholesale parts pricing
- Search parts by VIN (vehicle-specific fitment)
- Access to 30,000+ suppliers
- Exact part numbers, brand, availability

---

## How to Get Your PartsTech API Key

### Step 1: Create a PartsTech Account

1. Go to [https://www.partstech.com](https://www.partstech.com)
2. Click **"Sign Up"** or **"Get Started"**
3. Fill in your shop information:
   - Shop Name
   - Address
   - Phone
   - Email
4. Select your preferred parts suppliers (you can add more later)
5. Complete the registration

### Step 2: Get API Access

1. Once logged in, go to **Settings** → **Integrations** → **API Access**
2. Request an API key for your shop
3. PartsTech will review and approve (usually within 24-48 hours)
4. Once approved, you'll see your:
   - **API Key**: `pt_live_xxxxxxxxxxxxxxxx`
   - **Account ID**: `ACCT-XXXXX` (optional, may be auto-detected)

### Step 3: Connect to TechTrust

1. Open the **TechTrust Provider Dashboard**
2. Go to **Settings** → **Integrations** → **PartsTech**
3. Paste your **API Key**
4. (Optional) Paste your **Account ID**
5. Click **Connect**
6. You'll see a ✅ confirmation if the connection is successful

---

## Using PartsTech in TechTrust

### When Creating a Quote

1. Open a Service Request and click **Create Quote**
2. In the **Parts** section, click **🔍 Search PartsTech**
3. The system will automatically:
   - Use the customer's VIN for vehicle-specific parts
   - Search your connected suppliers
   - Show wholesale prices and availability
4. Select the parts you want to add
5. Set your **sell price** (what the customer pays)
6. The system keeps your wholesale cost private — the customer only sees the sell price

### Cost vs Sell Price

| Field | Visible To | Description |
|-------|-----------|-------------|
| **Wholesale Price** | Provider only | Your cost from the supplier via PartsTech |
| **Sell Price** | Customer + Provider | What you charge the customer |
| **Margin** | Provider only | Sell Price - Wholesale = Your profit |

---

## Troubleshooting

### "Invalid API Key"
- Make sure you're using the **live** key (starts with `pt_live_`)
- Check that your PartsTech account is active and approved
- Contact PartsTech support if the key was recently issued

### "No parts found"
- Try searching with a broader term (e.g., "brake pad" instead of "ceramic brake pad front left")
- Verify the VIN is correct
- Some specialty parts may not be available through PartsTech suppliers

### "Connection failed"
- Check your internet connection
- PartsTech may be temporarily down — try again in a few minutes
- If persistent, disconnect and reconnect using a fresh API key

---

## FAQ

**Q: Does PartsTech charge me anything?**
A: No. PartsTech is free for shops. Suppliers pay for marketplace access.

**Q: Can I use my existing PartsTech account?**
A: Yes. Any active PartsTech account with API access works.

**Q: Will customers see my wholesale prices?**
A: No. Wholesale prices are never shown to customers. Only the sell price you set is visible.

**Q: What if I don't have PartsTech?**
A: You can still create quotes manually by typing part names and prices. TechTrust's organic catalog will also suggest parts and average pricing based on historical data.

**Q: Can I disconnect PartsTech later?**
A: Yes. Go to Settings → Integrations → PartsTech → Disconnect. Your existing quotes won't be affected.

---

## Support

- **PartsTech Support**: support@partstech.com | (888) 727-8732
- **TechTrust Support**: support@techtrust.app
