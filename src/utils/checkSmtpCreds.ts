import dotenv from 'dotenv'
import mailService from '../services/mailService'

dotenv.config()

async function testEmailConfiguration() {
  console.log('Testing SMTP configuration...')
  console.log('SMTP_HOST:', process.env.SMTP_HOST)
  console.log('SMTP_PORT:', process.env.SMTP_PORT)
  console.log('SMTP_USER:', process.env.SMTP_USER)
  console.log(
    'SMTP_PASSWORD:',
    process.env.SMTP_PASSWORD ? '[SET]' : '[NOT SET]'
  )

  try {
    const isConnected = await mailService.testConnection()
    if (isConnected) {
      console.log('✅ SMTP connection successful!')

      const testEmail = process.env.SMTP_USER || 'test@example.com'
      console.log(`Testing email send to: ${testEmail}`)

      await mailService.sendRecoveryEmail(
        testEmail,
        'https://example.com/test-recovery-link'
      )

      console.log('✅ Test email sent successfully!')
    } else {
      console.log('❌ SMTP connection failed!')
    }
  } catch (error) {
    console.error('❌ Email test failed:', error)

    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('Username and Password not accepted')) {
      console.log('\n💡 Gmail Authentication Issue Detected!')
      console.log('Please follow these steps to fix Gmail SMTP authentication:')
      console.log('1. Enable 2-Factor Authentication on your Gmail account')
      console.log('2. Generate an App Password:')
      console.log('   - Go to https://myaccount.google.com/security')
      console.log('   - Click on "2-Step Verification"')
      console.log('   - Scroll down to "App passwords"')
      console.log('   - Generate a new app password for "Mail"')
      console.log(
        '3. Use the generated App Password in your .env file as SMTP_PASSWORD'
      )
      console.log('4. Make sure SMTP_USER is your full Gmail address')
    }
  }
}

testEmailConfiguration()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
