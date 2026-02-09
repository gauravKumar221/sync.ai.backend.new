// test-email.js (COMPREHENSIVE VERSION)
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTest() {
    console.clear();
    console.log('🚀 SYNC.AI EMAIL CONFIGURATION TEST\n');
    console.log('='.repeat(60));

    // Show current configuration
    console.log('📋 CURRENT CONFIGURATION:');
    console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || 'Not set');
    console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || 'Not set');
    console.log('   EMAIL_USER:', process.env.EMAIL_USER || 'Not set');
    console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '********' : 'Not set');
    console.log('   EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');
    console.log('   Password length:', process.env.EMAIL_PASS?.length || 0, 'chars');

    console.log('\n' + '='.repeat(60));

    try {
        // Dynamically import emailConfig to catch import errors
        console.log('1. Loading email configuration...');
        const { testEmailConnection, sendEmail } = await import('./config/emailConfig.js');
        console.log('✅ Email config loaded successfully');

        console.log('\n2. Testing email server connection...');
        const connectionOk = await testEmailConnection();

        if (!connectionOk) {
            console.log('\n❌ CONNECTION FAILED!');
            console.log('\n🔧 IMMEDIATE FIXES:');
            console.log('   1. Check your .env file exists at:', join(__dirname, '.env'));
            console.log('   2. Verify EMAIL_USER and EMAIL_PASS are correct');
            console.log('   3. Ensure 2-Step Verification is ON in Google Account');
            console.log('   4. Current password:', process.env.EMAIL_PASS);
            console.log('   5. Try without spaces:', process.env.EMAIL_PASS?.replace(/\s+/g, ''));
            return;
        }

        console.log('\n3. Sending test email...');
        const testEmail = process.env.EMAIL_USER;
        const testName = 'Test User';
        const testOTP = '123456';

        console.log('   From:', process.env.EMAIL_FROM || process.env.EMAIL_USER);
        console.log('   To:', testEmail);
        console.log('   OTP:', testOTP);

        const startTime = Date.now();

        const info = await sendEmail(
            testEmail,
            'forgotPasswordOTP',
            {
                otp: testOTP,
                name: testName
            }
        );

        const elapsedTime = Date.now() - startTime;

        console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
        console.log('   Time taken:', elapsedTime + 'ms');

        console.log('\n' + '='.repeat(60));
        console.log('🎉 ALL TESTS PASSED!\n');

        console.log('📧 NEXT STEPS:');
        console.log('   1. Check your INBOX: https://mail.google.com');
        console.log('   2. Also check SPAM folder');
        console.log('   3. Look for subject: "Password Reset OTP - SyncAI Booking System"');
        console.log('   4. Email should contain OTP:', testOTP);

        console.log('\n⚠️  If email not received:');
        console.log('   • Wait 1-2 minutes (sometimes delayed)');
        console.log('   • Check spam/junk folder');
        console.log('   • Verify email address is correct');

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('\n❌ TEST FAILED WITH ERROR:');
        console.error('   Message:', error.message);
        console.error('   Code:', error.code || 'N/A');
        console.error('   Stack:', error.stack?.split('\n')[0]);

        console.log('\n🔧 TROUBLESHOOTING GUIDE:');

        if (error.code === 'EAUTH') {
            console.log('\n🔐 AUTHENTICATION ERROR:');
            console.log('   1. Generate NEW App Password:');
            console.log('      • Go to: https://myaccount.google.com/apppasswords');
            console.log('      • Select "Mail" and "Other (Custom name)"');
            console.log('      • Name it "SyncAI Server"');
            console.log('      • Copy the 16-character password');
            console.log('   2. Update .env file:');
            console.log('      EMAIL_PASS=your_new_16_char_password');
            console.log('      (NO SPACES, exactly 16 characters)');
            console.log('   3. Restart the test');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.log('\n🌐 CONNECTION ERROR:');
            console.log('   1. Check your internet connection');
            console.log('   2. Try different port (465 with secure: true)');
            console.log('   3. Check if port 587 is blocked by firewall');
        } else if (error.message.includes('Cannot find module')) {
            console.log('\n📦 MODULE ERROR:');
            console.log('   1. Check if emailConfig.js exists in config folder');
            console.log('   2. Run: npm install nodemailer');
            console.log('   3. Verify file path is correct');
        } else {
            console.log('\n❓ UNKNOWN ERROR:');
            console.log('   1. Check server logs');
            console.log('   2. Verify all environment variables');
            console.log('   3. Try simpler test (see below)');
        }

        console.log('\n🔄 SIMPLE TEST SCRIPT:');
        console.log('   Create test-simple.js with:');
        console.log(`
        import nodemailer from 'nodemailer';
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: '${process.env.EMAIL_USER}',
                pass: '${process.env.EMAIL_PASS}'
            }
        });
        transporter.verify(console.log);
        `);
    }
}

// Run the test
runTest().catch(console.error);