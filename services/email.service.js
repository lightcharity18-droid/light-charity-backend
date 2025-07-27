const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendPasswordResetEmail(email, resetToken, resetURL) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `Light Charity <${process.env.EMAIL_FROM || 'onboarding@resend.dev'}>`,
        to: [email],
        subject: 'Password Reset Request - Light Charity',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - Light Charity</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 2px solid #f0f0f0;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #dc2626;
                margin-bottom: 10px;
              }
              .content {
                padding: 30px 0;
              }
              .reset-button {
                display: inline-block;
                background-color: #dc2626;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
              }
              .reset-button:hover {
                background-color: #b91c1c;
              }
              .warning {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                padding: 20px 0;
                border-top: 1px solid #f0f0f0;
                color: #666;
                font-size: 14px;
              }
              .alternative-link {
                word-break: break-all;
                background-color: #f9f9f9;
                padding: 10px;
                border-radius: 3px;
                margin: 10px 0;
                font-family: monospace;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">🩸 Light Charity</div>
              <p>Saving Lives Through Blood Donation</p>
            </div>
            
            <div class="content">
              <h2>Password Reset Request</h2>
              
              <p>Hello,</p>
              
              <p>We received a request to reset the password for your Light Charity account associated with this email address.</p>
              
              <p>To reset your password, click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${resetURL}" class="reset-button">Reset Your Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Information:</strong>
                <ul>
                  <li>This link will expire in <strong>10 minutes</strong> for security reasons</li>
                  <li>If you didn't request this password reset, please ignore this email</li>
                  <li>Your password will remain unchanged if you don't click the link</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <div class="alternative-link">${resetURL}</div>
              
              <p>If you have any questions or need help, please contact our support team.</p>
              
              <p>Best regards,<br>The Light Charity Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>Light Charity - Connecting donors with those in need</p>
              <p>If you received this email by mistake, please ignore it.</p>
            </div>
          </body>
          </html>
        `,
        text: `
          Light Charity - Password Reset Request
          
          Hello,
          
          We received a request to reset the password for your Light Charity account.
          
          To reset your password, visit this link: ${resetURL}
          
          Important: This link will expire in 10 minutes for security reasons.
          
          If you didn't request this password reset, please ignore this email.
          
          Best regards,
          The Light Charity Team
          
          ---
          This email was sent to ${email}
        `
      });

      if (error) {
        console.error('Resend API error:', error);
        
        // Handle domain verification error specifically
        if (error.message && error.message.includes('verify a domain')) {
          console.log('\n🔧 RESEND SETUP REQUIRED:');
          console.log('To send emails to any recipient, you need to:');
          console.log('1. Visit https://resend.com/domains');
          console.log('2. Add and verify your domain');
          console.log('3. Update EMAIL_FROM to use your verified domain');
          console.log('   Example: EMAIL_FROM=noreply@yourdomain.com');
          console.log('\nAlternatively, for testing, update EMAIL_FROM to your verified email address.');
          console.log(`   Example: EMAIL_FROM=${process.env.EMAIL_FROM || 'your-email@gmail.com'}\n`);
        }
        
        throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
      }

      console.log('Password reset email sent successfully via Resend:', data.id);
      return { success: true, messageId: data.id };

    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendGeneralMessage(recipientEmail, subject, message, sender) {
    try {
      const senderName = sender.name || 
                        `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 
                        sender.email || 
                        'Light Charity Team';

      const { data, error } = await this.resend.emails.send({
        from: `Light Charity <${process.env.EMAIL_FROM || 'onboarding@resend.dev'}>`,
        to: [recipientEmail],
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject} - Light Charity</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 2px solid #f0f0f0;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #dc2626;
                margin-bottom: 10px;
              }
              .content {
                padding: 30px 0;
              }
              .message-content {
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #dc2626;
              }
              .sender-info {
                background-color: #f0f9ff;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border: 1px solid #e0f2fe;
              }
              .footer {
                text-align: center;
                padding: 20px 0;
                border-top: 1px solid #f0f0f0;
                color: #666;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">🩸 Light Charity</div>
              <p>Connecting Donors with Those in Need</p>
            </div>
            
            <div class="content">
              <h2>${subject}</h2>
              
              <div class="sender-info">
                <strong>From:</strong> ${senderName}<br>
                <strong>Date:</strong> ${new Date().toLocaleDateString()}
              </div>
              
              <div class="message-content">
                ${message.replace(/\n/g, '<br>')}
              </div>
              
              <p><em>This message was sent through the Light Charity platform.</em></p>
            </div>
            
            <div class="footer">
              <p>This email was sent to ${recipientEmail}</p>
              <p>Light Charity - Saving Lives Through Blood Donation</p>
            </div>
          </body>
          </html>
        `,
        text: `
          ${subject}
          
          From: ${senderName}
          Date: ${new Date().toLocaleDateString()}
          
          ${message}
          
          ---
          This message was sent through the Light Charity platform.
          This email was sent to ${recipientEmail}
        `
      });

      if (error) {
        console.error('Resend API error:', error);
        
        // Handle domain verification error specifically
        if (error.message && error.message.includes('verify a domain')) {
          console.log('\n🔧 RESEND SETUP REQUIRED:');
          console.log('To send emails to any recipient, you need to:');
          console.log('1. Visit https://resend.com/domains');
          console.log('2. Add and verify your domain');
          console.log('3. Update EMAIL_FROM to use your verified domain');
          console.log('   Example: EMAIL_FROM=noreply@yourdomain.com');
          console.log('\nAlternatively, for testing, update EMAIL_FROM to your verified email address.');
          console.log(`   Example: EMAIL_FROM=${process.env.EMAIL_FROM || 'your-email@gmail.com'}\n`);
        }
        
        throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
      }

      console.log('Message sent successfully via Resend:', data.id);
      return { success: true, messageId: data.id };

    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  async verifyConnection() {
    try {
      // Test the API key by trying to get domains
      const { data, error } = await this.resend.domains.list();
      
      if (error) {
        console.error('Resend connection failed:', error);
        return false;
      }
      
      console.log('Resend email service is ready');
      if (data && data.length > 0) {
        console.log('Verified domains:', data.map(domain => domain.name).join(', '));
      } else {
        console.log('⚠️  No verified domains found. Using default domain with limitations.');
      }
      return true;
    } catch (error) {
      console.error('Resend connection test failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 