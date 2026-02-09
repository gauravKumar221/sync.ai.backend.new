// fix-email.js
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function diagnoseEmail() {
    console.log('🔧 EMAIL CONFIGURATION DIAGNOSTIC\n');

    // Check .env file
    const envPath = join(__dirname, '.env');
    console.log('1. Checking .env file...');
    console.log('   Path:', envPath);
    console.log('   Exists:', fs.existsSync(envPath));

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const emailLines = envContent.split('\n').filter(line =>
            line.includes('EMAIL_') && !line.trim().startsWith('#')
        );
        console.log('   Email config found:', emailLines.length);
        emailLines.forEach(line => console.log('   ', line));
    }

    // Check password
    const password = process.env.EMAIL_PASS || '';
    const cleanPassword = password.replace(/\s+/g, '');
    console.log('\n2. Checking password...');
    console.log('   Original:', password ? '********' : 'EMPTY');
    console.log('   Length:', password.length);
    console.log('   Clean length:', cleanPassword.length);
    console.log('   Has spaces:', password.includes(' '));
    console.log('   Should be 16 chars:', cleanPassword.length === 16 ? '✅' : '❌');

    // Test connection
    console.log('\n3. Testing SMTP connection...');

    if (!process.env.EMAIL_USER || !password) {
        console.log('❌ Missing email or password');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: cleanPassword
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('   Connecting to SMTP server...');
        await transporter.verify();
        console.log('✅ SMTP Connection successful!');

        // Try to send a simple email
        console.log('\n4. Sending test email...');
        const info = await transporter.sendMail({
            from: `"Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'SyncAI Test Email',
            text: 'This is a test email from SyncAI system.',
            html: '<h1>SyncAI Test</h1><p>This is a test email.</p>'
        });

        console.log('✅ Test email sent!');
        console.log('   Message ID:', info.messageId);
        console.log('\n🎉 EMAIL CONFIGURATION IS WORKING!');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('   Code:', error.code);

        if (error.code === 'EAUTH') {
            console.log('\n🔐 AUTHENTICATION FAILED!');
            console.log('   Steps to fix:');
            console.log('   1. Enable 2-Step Verification:');
            console.log('      https://myaccount.google.com/security');
            console.log('   2. Generate App Password:');
            console.log('      https://myaccount.google.com/apppasswords');
            console.log('   3. Select "Mail" > "Other" > Name: "SyncAI"');
            console.log('   4. Copy 16-char password (no spaces)');
            console.log('   5. Update .env: EMAIL_PASS=your_new_password');
        }
    }
}

diagnoseEmail().catch(console.error);