import nodemailer from 'nodemailer'

import { Transporter, TransportOptions } from 'nodemailer'

class MailService {

  transporter: Transporter

  constructor() {
    this.transporter = nodemailer.createTransport<TransportOptions>({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    } as TransportOptions)
  }

  async sendActivationEmail (to: string, link: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: 'Sh account activation ' + process.env.API_URL,
      text: '',
      html: `
        <div>
          <h1>Follow this link to activate your account:</h1>
          <a href="${link}">${link}</a>
          You will be redirected to the login page.
        </div>
      `
    })
  }
}

export default new MailService
