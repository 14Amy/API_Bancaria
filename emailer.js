const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // or 'STARTTLS'
  auth: {
    user: 'ancarrera1@utpl.edu.ec',
    pass: '12345'
  }
});

const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: 'acarrera087@gmail.com',
    to,
    subject,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo electrónico enviado:', info.response);
  } catch (error) {
    console.error('Error al enviar correo electrónico:', error);
  }
};

module.exports = sendEmail;