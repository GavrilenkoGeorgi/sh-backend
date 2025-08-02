import nodemailer from 'nodemailer'

import { Transporter, TransportOptions } from 'nodemailer'

class MailService {
  transporter: Transporter

  constructor() {
    // check config
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASSWORD
    ) {
      throw new Error(
        'SMTP configuration is incomplete. Please check your environment variables.'
      )
    }

    this.transporter = nodemailer.createTransport<TransportOptions>({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // additional options for better Gmail compatibility
      tls: {
        rejectUnauthorized: false,
      },
    } as TransportOptions)
  }

  async sendActivationEmail(to: string, link: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject: 'Sh account activation ' + process.env.API_URL,
        text: '',
        html: `
          <div>
            <h1>Follow this link to activate your account:</h1>
            <a href='${link}'>${link}</a>
            You will be redirected to the login page.
          </div>
        `,
      })
      console.log(`Activation email sent successfully to ${to}`)
    } catch (error) {
      console.error('Error sending activation email:', error)
      throw new Error('Failed to send activation email')
    }
  }

  async sendRecoveryEmail(to: string, link: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject: 'Password recovery ' + process.env.CLIENT_URL,
        text: `Click on the link to update your password: ${link}`,
        html: `
          <div>
            <h1>Click on the link to update your password:</h1>
            <a href='${link}'>${link}</a>
            You will be redirected to the password update page.
          </div>
        `,
      })
      console.log(`Recovery email sent successfully to ${to}`)
    } catch (error) {
      console.error('Error sending recovery email:', error)
      throw new Error('Failed to send recovery email')
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify()
      console.log('SMTP connection is ready')
      return true
    } catch (error) {
      console.error('SMTP connection failed:', error)
      return false
    }
  }
}

export default new MailService()
