# Meta Developer App Configuration Guide

Follow these steps to configure an official Meta Developer Application for **InstaConnect**:

## Step 1: Create a Meta Business App
1. Go to [Meta for Developers](https://developers.facebook.com/apps/).
2. Click **Create App** → Select **Other** → Select **Business**.
3. Enter your App Name and link your Business Portfolio if applicable.

## Step 2: Add Instagram Product
1. In the App Dashboard sidebar, click **Add Product** and choose **Instagram**.
2. Select **API setup with Instagram login**.
3. Record the **Instagram App ID** and **Instagram App Secret** shown under *Configure Instagram business login*.

## Step 3: Configure OAuth Redirect URIs
Under **Business login settings**:
- **Redirect URI**: `http://localhost:3000/api/instagram/callback` (and your production HTTPS callback URL).
- **Deauthorize callback URL**: `https://yourdomain.com/api/instagram/disconnect`
- **Data Deletion Request URL**: `https://yourdomain.com/api/instagram/disconnect`

## Step 4: Add Instagram Testers (Development Mode)
While your app is in **Development Mode**:
1. Navigate to **App Roles → Roles**.
2. Click **Add People** → Select **Instagram Tester** and enter your Instagram Professional account username.
3. On your Instagram account, go to **Settings and privacy → Website permissions → Apps and websites → Tester Invites** and accept the invitation.

## Step 5: App Review for Production (Live Mode)
To allow external Business/Creator users to connect:
1. Complete **Business Verification**.
2. Request Advanced Access for `instagram_business_basic` (and `instagram_business_manage_insights` if using Insights).
3. Switch the app mode from **Development** to **Live**.

