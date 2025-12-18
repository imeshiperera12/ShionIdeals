// functions/index.js
// Install: npm install firebase-functions firebase-admin nodemailer

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure email transporter (using Gmail as example)
// For production, use SendGrid, AWS SES, or similar service
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email.user, // Set via: firebase functions:config:set email.user="your-email@gmail.com"
    pass: functions.config().email.pass, // Set via: firebase functions:config:set email.pass="your-app-password"
  },
});

// Trigger when a new approval request is created
exports.sendApprovalEmail = functions.firestore
  .document("approvalRequests/{requestId}")
  .onCreate(async (snap, context) => {
    const requestId = context.params.requestId;
    const data = snap.data();

    const { action, requestingAdmin, superAdminEmails } = data;

    // Generate approval/rejection links
    const approvalLink = `https://shionideals.vercel.app/admin/approvals/${requestId}?action=approve`;
    const rejectLink = `https://shionideals.vercel.app/admin/approvals/${requestId}?action=reject`;

    const mailOptions = {
      from: functions.config().email.user,
      to: superAdminEmails.join(","),
      subject: `🔔 Approval Request: ${action.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Approval Request</h2>
          <p><strong>Action:</strong> ${action}</p>
          <p><strong>Requested by:</strong> ${requestingAdmin}</p>
          <p><strong>Request ID:</strong> ${requestId}</p>
          
          <h3>Details:</h3>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
${JSON.stringify(data.data, null, 2)}
          </pre>

          <div style="margin-top: 30px;">
            <a href="${approvalLink}" 
               style="background: #4CAF50; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; margin-right: 10px;">
              ✅ Approve
            </a>
            <a href="${rejectLink}" 
               style="background: #f44336; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px;">
              ❌ Reject
            </a>
          </div>

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Or visit the admin panel to review: 
            <a href="https://shionideals.vercel.app/admin/dashboard">Admin Dashboard</a>
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Approval email sent for request ${requestId}`);
      return null;
    } catch (error) {
      console.error("Error sending approval email:", error);
      return null;
    }
  });

// Trigger when approval status changes
exports.sendApprovalStatusUpdate = functions.firestore
  .document("approvalRequests/{requestId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send email if status changed
    if (before.status === after.status) {
      return null;
    }

    const requestId = context.params.requestId;
    const { status, requestingAdmin, action, notes } = after;

    const statusEmoji = status === "approved" ? "✅" : "❌";
    const statusColor = status === "approved" ? "#4CAF50" : "#f44336";

    const mailOptions = {
      from: functions.config().email.user,
      to: requestingAdmin,
      subject: `${statusEmoji} Your Request Has Been ${status.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Request ${status.toUpperCase()}</h2>
          <p><strong>Request ID:</strong> ${requestId}</p>
          <p><strong>Action:</strong> ${action}</p>
          <p><strong>Status:</strong> <span style="color: ${statusColor};">${status}</span></p>
          
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}

          ${
            status === "approved"
              ? `
            <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0;">
                ✅ Your request has been approved. You can now proceed with the ${action} operation.
              </p>
            </div>
          `
              : `
            <div style="background: #ffebee; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0;">
                ❌ Your request has been rejected. Please contact the super admin for more details.
              </p>
            </div>
          `
          }

          <p style="margin-top: 30px;">
            <a href="https://shionideals.vercel.app/admin/dashboard" 
               style="color: #2196F3; text-decoration: none;">
              Go to Admin Dashboard →
            </a>
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Status update email sent to ${requestingAdmin}`);
      return null;
    } catch (error) {
      console.error("Error sending status update email:", error);
      return null;
    }
  });

// HTTP function for manual email triggers (optional)
exports.sendApprovalEmailHTTP = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { requestId, action, superAdminEmails, requestingAdmin, data } = req.body;

  const approvalLink = `https://shionideals.vercel.app/admin/approvals/${requestId}?action=approve`;
  const rejectLink = `https://shionideals.vercel.app/admin/approvals/${requestId}?action=reject`;

  const mailOptions = {
    from: functions.config().email.user,
    to: superAdminEmails.join(","),
    subject: `🔔 Approval Request: ${action.toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Approval Request</h2>
        <p><strong>Action:</strong> ${action}</p>
        <p><strong>Requested by:</strong> ${requestingAdmin}</p>
        <p><strong>Request ID:</strong> ${requestId}</p>
        
        <div style="margin-top: 30px;">
          <a href="${approvalLink}" 
             style="background: #4CAF50; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; margin-right: 10px;">
            ✅ Approve
          </a>
          <a href="${rejectLink}" 
             style="background: #f44336; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px;">
            ❌ Reject
          </a>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});