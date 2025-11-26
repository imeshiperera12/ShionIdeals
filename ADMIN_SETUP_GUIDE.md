# Shion Ideals Admin Panel - Setup Guide

## Overview
This guide walks through setting up and deploying the complete admin panel for Shion Ideals with all features including dark/light theme, approval workflows, and Firebase integration.

## Prerequisites

- Node.js 16+ and npm/yarn
- Firebase project with Firestore, Storage, and Authentication enabled
- Vercel account (for deployment)
- Git for version control

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Name it "shionideals-74748" (or your preferred name)
4. Select your region and create the project

### 1.2 Enable Firestore
1. In Firebase Console, click "Firestore Database"
2. Click "Create database"
3. Start in **Test mode** for development
4. Choose your region (closest to your location)

### 1.3 Enable Storage
1. Click "Storage" in the left menu
2. Click "Get started"
3. Accept the default rules and create

### 1.4 Enable Authentication
1. Click "Authentication" in the left menu
2. Click "Get started"
3. Click "Email/Password"
4. Toggle "Enable Email/Password" and click "Save"

### 1.5 Get Firebase Config
1. Go to Project Settings (gear icon)
2. Copy your Web API credentials
3. Replace the values in `frontend/src/firebase.js`

## Step 2: Configure CORS for Firebase Storage

**IMPORTANT: This step is required for image uploads to work**

1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install

2. In the project root, a `cors.json` file is provided. Run this command in Google Cloud Shell:

\`\`\`bash
gsutil cors set cors.json gs://YOUR_BUCKET_NAME.appspot.com
\`\`\`

Replace `YOUR_BUCKET_NAME` with your Firebase Storage bucket name (e.g., `shionideals-74748`).

3. Verify CORS is set:
\`\`\`bash
gsutil cors get gs://YOUR_BUCKET_NAME.appspot.com
\`\`\`

## Step 3: Environment Variables

1. Copy `frontend/.env.example` to `frontend/.env.local`
2. Fill in all Firebase credentials
3. Set `REACT_APP_SUPER_ADMIN_EMAILS` with your super admin emails (comma-separated)

Example:
\`\`\`
REACT_APP_FIREBASE_API_KEY=AIzaSyDCI6kMj9Ov5e440BzikqTR5jIViZlLfU0
REACT_APP_FIREBASE_PROJECT_ID=shionideals-74748
REACT_APP_SUPER_ADMIN_EMAILS=imeshiperera18@gmail.com,vish96san@gmail.com
\`\`\`

## Step 4: Install Dependencies

\`\`\`bash
cd frontend
npm install
\`\`\`

## Step 5: Create Firestore Collections

Create the following collections in Firestore (they'll auto-populate with data):
- `selling`
- `buying`
- `revenue`
- `expenses`
- `approvalRequests` (for edit/delete workflows)

## Step 6: Admin Users

The following accounts are configured in `frontend/src/config/adminConfig.js`:

| Email | Password | Role |
|-------|----------|------|
| imeshiperera18@gmail.com | imeshishion321 | Super Admin |
| vish96san@gmail.com | vishwashion321 | Super Admin |
| dilshan@gmail.com | dilshanshion321 | Admin |

**Important:** Change these passwords immediately in Firebase Console after first login.

## Step 7: Run Locally

\`\`\`bash
cd frontend
npm start
\`\`\`

Access at `http://localhost:3000/admin`

## Step 8: Deploy to Vercel

### 8.1 Push to GitHub
\`\`\`bash
git add .
git commit -m "Initial admin panel setup"
git push origin main
\`\`\`

### 8.2 Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Select your GitHub repository
4. Configure environment variables:
   - Add all `REACT_APP_*` variables from `.env.local`
5. Click "Deploy"

## Features

### Dark/Light Theme
- Toggle button in top-right corner of navbar
- Automatically saves preference to localStorage
- Smooth transitions between themes

### Auto-Load Buying Details
- In Selling form, select from existing buying items
- Automatically populates: Object Type, Identifier, Buying Price, Supplier

### Edit/Delete Approval Workflow
- Regular admins can request edits/deletes
- Super admins receive approval requests in `approvalRequests` collection
- Once approved, changes are applied

### Report Generation
- PDF reports in landscape orientation with tables
- Excel exports with formatted columns
- Includes summary data and totals

### Image Uploads for Expenses
- Multiple image upload support
- CORS-enabled Firebase Storage
- Image viewer modal to preview attachments

## Troubleshooting

### CORS Error on Image Upload
**Error:** `CORS policy: Response to preflight request doesn't pass access control check`

**Solution:** 
1. Run the CORS setup command (Step 2)
2. Wait 5 minutes for changes to propagate
3. Clear browser cache and retry

### Authentication Not Working
**Error:** `Not authorized. Only admin users can access this panel.`

**Solution:**
1. Verify email is in `ADMIN_CREDENTIALS` in `adminConfig.js`
2. Check Firebase has email/password auth enabled
3. Verify user account exists in Firebase Console > Authentication

### Form Styles Look Transparent
**Solution:** Ensure `AdminTheme.css` is imported in all admin pages. The theme system uses CSS variables that must be defined.

### Dark Mode Not Persisting
**Solution:** Check if localStorage is enabled in your browser. The theme preference is saved to `localStorage.getItem('admin-theme')`.

## Security Best Practices

1. **Use Row Level Security (RLS)** in Firestore for production
2. **Update default passwords** immediately after first login
3. **Restrict API keys** in Firebase Console:
   - Restrict to specific domains
   - Enable only needed APIs
4. **Use environment variables** - never commit credentials
5. **Monitor Firestore** usage for unusual activity
6. **Regular backups** of Firestore data

## API Integration Points

### Approval Email Notifications
The system currently stores approval requests in Firestore. To enable email notifications:

1. Set up SendGrid or similar service
2. Create a Cloud Function to send emails on new approval requests
3. Update `emailService.js` with your email service

Example Cloud Function:
\`\`\`javascript
exports.sendApprovalEmail = functions.firestore
  .document('approvalRequests/{docId}')
  .onCreate(async (snap) => {
    // Send email to super admins
    // Email should include approval/rejection links
  });
\`\`\`

## File Structure

\`\`\`
frontend/
├── src/
│   ├── screens/
│   │   ├── AdminLogin.js
│   │   ├── AdminSelling.js
│   │   ├── AdminBuying.js
│   │   ├── AdminRevenue.js
│   │   ├── AdminExpenses.js
│   │   └── AdminDashboard.js
│   ├── components/
│   │   ├── AdminNavbar.js
│   │   └── ProtectedRoute.js
│   ├── utils/
│   │   ├── reportGenerator.js
│   │   ├── emailService.js
│   │   ├── buyingService.js
│   │   └── themeManager.js
│   ├── styles/
│   │   ├── AdminTheme.css
│   │   ├── AdminTable.css
│   │   ├── AdminLogin.css
│   │   └── AdminNavbar.css
│   ├── config/
│   │   └── adminConfig.js
│   └── firebase.js
├── .env.local
├── .env.example
└── cors.json
\`\`\`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firestore rules in Firebase Console
3. Check browser console for error messages
4. Verify environment variables are correctly set

## Version History

**v1.0.0** - Initial release
- Admin login and authentication
- Complete CRUD operations for Selling, Buying, Revenue, Expenses
- Dark/light theme support
- PDF/Excel report generation
- Image upload for expenses
- Auto-load buying details
- Edit/Delete approval workflow
- Dashboard with analytics charts
\`\`\`

\`\`\`css file="" isHidden
