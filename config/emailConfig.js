// emailConfig.js - UPDATED VERSION
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Remove any spaces from app password
const cleanPassword = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

console.log('📧 Email Configuration:');
console.log(`   Host: ${process.env.EMAIL_HOST}`);
console.log(`   User: ${process.env.EMAIL_USER}`);
console.log(`   Password length: ${cleanPassword.length} chars`);

// Create transporter with app password
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: cleanPassword, // Use cleaned password
    },
    // Add connection timeout
    connectionTimeout: 10000, // 10 seconds
    // Add greeting timeout
    greetingTimeout: 10000,
});

// Verify transporter on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email transporter verification failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code}`);

        if (error.code === 'EAUTH') {
            console.log('\n🔧 Authentication Fix Steps:');
            console.log('1. Check EMAIL_USER in .env:', process.env.EMAIL_USER);
            console.log('2. Check EMAIL_PASS length (should be 16 chars):', cleanPassword.length);
            console.log('3. Make sure 2-Step Verification is ENABLED');
            console.log('4. Generate NEW app password if needed:');
            console.log('   https://myaccount.google.com/apppasswords');
        }
    } else {
        console.log('✅ Email server is ready to send messages');
        console.log(`   Using: ${process.env.EMAIL_USER}`);
    }
});

// In emailConfig.js - CORRECT VERSION
const emailTemplates = {
    forgotPasswordOTP: (data) => ({
        subject: 'Password Reset OTP - SyncAI Booking System',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">SyncAI Booking System</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Password Reset</p>
    </div>
    
    <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #eaeaea;">
        <h2 style="color: #333; margin-top: 0;">Hello ${data.name || 'User'},</h2>
        
        <p style="color: #555; line-height: 1.6;">
            You requested to reset your password for SyncAI Booking System. 
            Use the OTP below to proceed with resetting your password.
        </p>
        
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
            ⏰ <strong>This OTP is valid for 10 minutes only.</strong>
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; display: inline-block;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #667eea; font-family: monospace;">
                    ${data.otp} <!-- Make sure this is data.otp -->
                </div>
            </div>
        </div>
        
        <p style="color: #777; font-size: 14px; line-height: 1.5;">
            If you didn't request this password reset, please ignore this email. 
            For security reasons, do not share this OTP with anyone.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated message from SyncAI Booking System.
                <br>
                Need help? Contact: support@syncai.com
            </p>
        </div>
    </div>
</body>
</html>
        `,
        text: `Password Reset OTP - SyncAI Booking System

Hello ${data.name || 'User'},

You requested to reset your password for SyncAI Booking System. Use the OTP below:

OTP: ${data.otp} <!-- Make sure this is data.otp -->

This OTP is valid for 10 minutes only.

If you didn't request this password reset, please ignore this email.

--
SyncAI Booking System Team
Support: support@syncai.com`
    }),
    // ... other templates
};

// In emailConfig.js - UPDATED sendEmail function
export const sendEmail = async (to, templateName, data) => {
    try {
        console.log(`📧 Preparing to send ${templateName} to: ${to}`);
        console.log('📊 Data received:', JSON.stringify(data, null, 2));

        const template = emailTemplates[templateName];
        if (!template) {
            throw new Error(`Email template "${templateName}" not found`);
        }

        // Check if template is a function and call it with data
        const emailData = typeof template === 'function' ? template(data) : template;

        console.log('✅ Email data prepared');
        console.log('   Subject:', emailData.subject);
        console.log('   OTP in template:', data.otp);

        const mailOptions = {
            from: `"SyncAI" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
        };

        console.log('📤 Sending email...');

        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Email sent successfully!');
        console.log(`   Message ID: ${info.messageId}`);

        return info;

    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        console.error('   Full error:', error);
        throw error;
    }
};

// Test email connection
export const testEmailConnection = async () => {
    try {
        console.log('🧪 Testing email configuration...');
        console.log(`   Host: ${process.env.EMAIL_HOST}`);
        console.log(`   User: ${process.env.EMAIL_USER}`);
        console.log(`   Password: ${'*'.repeat((process.env.EMAIL_PASS || '').length)}`);

        await transporter.verify();
        console.log('✅ Email connection verified successfully!');

        // Try sending a test email
        console.log('📧 Sending test email...');
        const info = await transporter.sendMail({
            from: `"SyncAI Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'Test Email from SyncAI',
            text: 'This is a test email to verify your configuration is working.',
            html: '<h1>Test Email</h1><p>This is a test email to verify your configuration is working.</p>'
        });

        console.log(`✅ Test email sent! Message ID: ${info.messageId}`);
        return true;

    } catch (error) {
        console.error('❌ Email connection failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code}`);
        return false;
    }
};

export default transporter;